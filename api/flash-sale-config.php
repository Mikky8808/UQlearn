<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

// Ensure flash_sale_config table exists with correct schema
if (isset($conn) && $conn instanceof mysqli) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS flash_sale_config (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) DEFAULT 'Top selling items',
            enabled TINYINT(1) DEFAULT 0,
            start_time DATETIME NULL,
            end_time DATETIME NULL,
            course_ids TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

try {
    // =========================================================================
    // 1. GET: FETCH FLASH SALE / TOP SELLING ITEMS CONFIG
    // =========================================================================
    if ($method === 'GET') {
        $res = $conn->query("
            SELECT id, title, enabled, start_time, end_time, course_ids
            FROM flash_sale_config
            ORDER BY (id = 'main') DESC, updated_at DESC
            LIMIT 1
        ");

        if (!$res || $res->num_rows === 0) {
            echo json_encode([
                "success"   => true,
                "enabled"   => false,
                "title"     => "Top selling items",
                "startTime" => null,
                "endTime"   => null,
                "courseIds" => [],
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit;
        }

        $row = $res->fetch_assoc();

        $courseIds = [];
        if (!empty($row['course_ids'])) {
            $decoded = json_decode($row['course_ids'], true);
            if (is_array($decoded)) {
                $courseIds = array_values(array_map('strval', array_filter($decoded, function($item) {
                    return is_string($item) || is_numeric($item);
                })));
            }
        }

        echo json_encode([
            "success"   => true,
            "enabled"   => (bool)$row['enabled'],
            "title"     => $row['title'] ?: "Top selling items",
            "startTime" => $row['start_time'] ?: null,
            "endTime"   => $row['end_time']   ?: null,
            "courseIds" => $courseIds,
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit;
    }

    // =========================================================================
    // 2. POST / PUT: SAVE & UPDATE FLASH SALE / TOP SELLING ITEMS CONFIG
    // =========================================================================
    if ($method === 'POST' || $method === 'PUT') {
        $raw_input = file_get_contents("php://input");
        $data = json_decode($raw_input, true);

        if (!$data || !is_array($data)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid or empty JSON payload provided."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit;
        }

        $enabled = !empty($data['enabled']) && ($data['enabled'] === true || $data['enabled'] === 1 || $data['enabled'] === '1' || $data['enabled'] === 'true') ? 1 : 0;
        $title = !empty($data['title']) ? trim((string)$data['title']) : 'Top selling items';
        
        $startTime = !empty($data['startTime']) ? trim((string)$data['startTime']) : (!empty($data['start_time']) ? trim((string)$data['start_time']) : null);
        $endTime = !empty($data['endTime']) ? trim((string)$data['endTime']) : (!empty($data['end_time']) ? trim((string)$data['end_time']) : null);

        // Format ISO dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) if necessary
        if ($startTime) {
            $stTime = strtotime($startTime);
            $startTimeFormatted = $stTime ? date('Y-m-d H:i:s', $stTime) : null;
        } else {
            $startTimeFormatted = null;
        }

        if ($endTime) {
            $eTime = strtotime($endTime);
            $endTimeFormatted = $eTime ? date('Y-m-d H:i:s', $eTime) : null;
        } else {
            $endTimeFormatted = null;
        }

        $courseIdsArr = [];
        if (isset($data['courseIds']) && is_array($data['courseIds'])) {
            $courseIdsArr = array_values(array_map('strval', $data['courseIds']));
        } elseif (isset($data['course_ids']) && is_array($data['course_ids'])) {
            $courseIdsArr = array_values(array_map('strval', $data['course_ids']));
        }
        $courseIdsJson = json_encode($courseIdsArr);

        $id = 'main';

        $stmt = $conn->prepare("
            INSERT INTO flash_sale_config (id, title, enabled, start_time, end_time, course_ids, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                enabled = VALUES(enabled),
                start_time = VALUES(start_time),
                end_time = VALUES(end_time),
                course_ids = VALUES(course_ids),
                updated_at = NOW()
        ");

        $stmt->bind_param("ssisss", $id, $title, $enabled, $startTimeFormatted, $endTimeFormatted, $courseIdsJson);
        $stmt->execute();
        $stmt->close();

        echo json_encode([
            "success"   => true,
            "message"   => "Top selling items & flash sale configuration updated successfully.",
            "enabled"   => (bool)$enabled,
            "title"     => $title,
            "startTime" => $startTimeFormatted,
            "endTime"   => $endTimeFormatted,
            "courseIds" => $courseIdsArr
        ]);

        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit;
    }

    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed. Accepted methods: GET, POST."
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error updating flash sale config: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}
?>
