<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// Ensure instructor_compliance table and missing columns exist dynamically
function ensureComplianceSchema($conn) {
    if (!$conn || !($conn instanceof mysqli)) return;
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `instructor_compliance` (
            `id` VARCHAR(64) PRIMARY KEY,
            `instructor_id` VARCHAR(64) NOT NULL,
            `file_path` VARCHAR(512) NOT NULL,
            `summary` TEXT DEFAULT NULL,
            `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            `reviewed_at` DATETIME DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_instructor_id` (`instructor_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $res = $conn->query("SHOW COLUMNS FROM `instructor_compliance` LIKE 'reviewed_at'");
        if ($res && $res->num_rows === 0) {
            $conn->query("ALTER TABLE `instructor_compliance` ADD COLUMN `reviewed_at` DATETIME DEFAULT NULL");
        }
    } catch (Exception $e) {
        // Silent catch for resilience
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureComplianceSchema($conn);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $query = "
            SELECT ic.*, u.first_name, u.last_name, u.email as instructor_email 
            FROM instructor_compliance ic
            LEFT JOIN users u ON ic.instructor_id = u.id
            ORDER BY ic.created_at DESC
        ";
        $result = $conn->query($query);
        $submissions = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $row['instructor_name'] = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
                $submissions[] = $row;
            }
        }
        echo json_encode($submissions);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database query failed: ' . $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle status updates or new submissions
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        $data = $_POST;
    }

    // Check if it's a new submission
    if (isset($data['action']) && $data['action'] === 'submit') {
        if (!isset($data['instructor_id']) || !isset($data['file_path'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing instructor_id or file_path']);
            exit;
        }

        $id = 'c-' . uniqid();
        $instructor_id = $data['instructor_id'];
        $file_path = $data['file_path'];
        $summary = isset($data['summary']) ? $data['summary'] : '';
        $status = 'pending';

        try {
            $stmt = $conn->prepare("INSERT INTO instructor_compliance (id, instructor_id, file_path, summary, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("sssss", $id, $instructor_id, $file_path, $summary, $status);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'id' => $id,
                    'instructor_id' => $instructor_id,
                    'file_path' => $file_path,
                    'summary' => $summary,
                    'status' => $status,
                    'created_at' => date('c')
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save compliance record: ' . $conn->error]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    // Admin approve/reject
    if (!isset($data['id']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing id or status']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("UPDATE instructor_compliance SET status = ?, reviewed_at = NOW() WHERE id = ?");
        $stmt->bind_param("ss", $data['status'], $data['id']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update status: ' . $conn->error]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
