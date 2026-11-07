<?php
require_once __DIR__ . '/cors.php';
/**
 * User Resources Management API for UQlearn
 * Stores and retrieves document records uploaded to the Resource Library.
 * Compatible with PHP 7.4+ on Shared Hosting
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

// Helper to ensure database table exists if MySQL is configured
function ensureUserResourcesTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return false;
    try {
        $sql = "CREATE TABLE IF NOT EXISTS `user_resources` (
            `id` VARCHAR(128) NOT NULL,
            `user_id` VARCHAR(128) NOT NULL,
            `lesson_id` VARCHAR(128) DEFAULT NULL,
            `filename` VARCHAR(255) NOT NULL,
            `url` TEXT NOT NULL,
            `file_path` TEXT,
            `file_type` VARCHAR(64) DEFAULT 'pdf',
            `file_size` INT DEFAULT 0,
            `created_at` DATETIME NOT NULL,
            PRIMARY KEY (`id`),
            INDEX `idx_user_resources_user_id` (`user_id`),
            INDEX `idx_user_resources_lesson_id` (`lesson_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);

        // Ensure lesson_id column exists
        $res = $conn->query("SHOW COLUMNS FROM `user_resources` LIKE 'lesson_id'");
        if ($res && $res->num_rows === 0) {
            $conn->query("ALTER TABLE `user_resources` ADD COLUMN `lesson_id` VARCHAR(128) DEFAULT NULL");
            $conn->query("ALTER TABLE `user_resources` ADD INDEX `idx_user_resources_lesson_id` (`lesson_id`)");
        }
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureUserResourcesTable($conn);
}

$jsonStoreFile = __DIR__ . '/../../uploads/user_resources.json';

// Helper to load fallback JSON store
function getJsonStore($filePath) {
    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
        if (is_array($data)) return $data;
    }
    return [];
}

// Helper to save fallback JSON store
function saveJsonStore($filePath, $data) {
    $dir = dirname($filePath);
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents($filePath, json_encode(array_values($data), JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['user_id'] ?? $_GET['userId'] ?? '';
    $lessonId = $_GET['lesson_id'] ?? $_GET['lessonId'] ?? '';
    $limit = intval($_GET['limit'] ?? 100);
    if ($limit <= 0) $limit = 100;
    if ($limit > 500) $limit = 500;

    $resources = [];
    $usedDb = false;

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $query = "SELECT * FROM `user_resources` WHERE 1=1";
            $params = [];
            $types = "";
            if (!empty($userId)) {
                $query .= " AND `user_id` = ?";
                $params[] = $userId;
                $types .= "s";
            }
            if (!empty($lessonId)) {
                $query .= " AND `lesson_id` = ?";
                $params[] = $lessonId;
                $types .= "s";
            }
            $query .= " ORDER BY `created_at` DESC LIMIT ?";
            $params[] = $limit;
            $types .= "i";
            
            $stmt = $conn->prepare($query);
            if ($stmt) {
                if (!empty($params)) {
                    $stmt->bind_param($types, ...$params);
                }
                $stmt->execute();
                $result = $stmt->get_result();
                $resources = $result->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
                $usedDb = true;
            }
        } catch (Exception $e) {
            $usedDb = false;
        }
    }

    if (!$usedDb) {
        $allResources = getJsonStore($jsonStoreFile);
        $filtered = array_filter($allResources, function($r) use ($userId, $lessonId) {
            if (!empty($userId) && strcasecmp($r['user_id'] ?? '', $userId) !== 0) return false;
            if (!empty($lessonId) && strcasecmp($r['lesson_id'] ?? '', $lessonId) !== 0) return false;
            return true;
        });

        // Sort descending by created_at
        usort($filtered, function($a, $b) {
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });

        $resources = array_slice($filtered, 0, $limit);
    }

    // Format output
    $formatted = array_map(function($r) {
        return [
            'id' => $r['id'] ?? ('res_' . uniqid()),
            'user_id' => $r['user_id'] ?? 'anonymous',
            'lesson_id' => $r['lesson_id'] ?? null,
            'filename' => $r['filename'] ?? 'Resource_File.pdf',
            'name' => $r['filename'] ?? 'Resource_File.pdf',
            'url' => $r['url'] ?? '',
            'file_path' => $r['file_path'] ?? ($r['url'] ?? ''),
            'file_type' => $r['file_type'] ?? 'pdf',
            'file_size' => intval($r['file_size'] ?? 0),
            'created_at' => $r['created_at'] ?? date('Y-m-d H:i:s')
        ];
    }, $resources);

    echo json_encode([
        'success' => true,
        'count' => count($formatted),
        'resources' => $formatted
    ]);
    exit();
}

if ($method === 'POST') {
    // Read input from FormData, raw body or JSON
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $userId = $input['user_id'] ?? $input['userId'] ?? 'instructor_user';
    $lessonId = $input['lesson_id'] ?? $input['lessonId'] ?? null;
    $filename = $input['filename'] ?? $input['name'] ?? 'Resource_File.pdf';
    $url = $input['url'] ?? '';
    $filePath = $input['file_path'] ?? $url;
    $fileType = $input['file_type'] ?? 'pdf';
    $fileSize = intval($input['file_size'] ?? $input['size'] ?? 0);
    $id = $input['id'] ?? ('res_' . time() . '_' . bin2hex(random_bytes(4)));
    $createdAt = date('Y-m-d H:i:s');

    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing resource URL or file_path parameter.']);
        exit();
    }

    $record = [
        'id' => $id,
        'user_id' => $userId,
        'lesson_id' => $lessonId,
        'filename' => $filename,
        'url' => $url,
        'file_path' => $filePath,
        'file_type' => $fileType,
        'file_size' => $fileSize,
        'created_at' => $createdAt
    ];

    $savedDb = false;
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $stmt = $conn->prepare("INSERT INTO `user_resources` (`id`, `user_id`, `lesson_id`, `filename`, `url`, `file_path`, `file_type`, `file_size`, `created_at`)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sssssssis", $id, $userId, $lessonId, $filename, $url, $filePath, $fileType, $fileSize, $createdAt);
                $stmt->execute();
                $stmt->close();
                $savedDb = true;
            }
        } catch (Exception $e) {
            $savedDb = false;
        }
    }

    // Only update fallback JSON store if database insert failed
    if (!$savedDb) {
        $store = getJsonStore($jsonStoreFile);
        $store[] = $record;
        saveJsonStore($jsonStoreFile, $store);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Resource record saved successfully.',
        'resource' => $record
    ]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? $_POST['id'] ?? '';
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing resource ID.']);
        exit();
    }

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $stmt = $conn->prepare("DELETE FROM `user_resources` WHERE `id` = ?");
            if ($stmt) {
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
            }
        } catch (Exception $e) {}
    }

    $store = getJsonStore($jsonStoreFile);
    $filtered = array_filter($store, function($r) use ($id) {
        return ($r['id'] ?? '') !== $id;
    });
    saveJsonStore($jsonStoreFile, $filtered);

    echo json_encode(['success' => true, 'message' => 'Resource record deleted successfully.']);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
?>
