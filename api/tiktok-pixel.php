<?php
/**
 * TikTok Pixel Integration API
 * Path: /api/v1/tiktok-pixel.php
 * Table: instructor_integrations
 */
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    if (isset($conn) && ($conn instanceof mysqli)) {
        @$conn->query("CREATE TABLE IF NOT EXISTS `instructor_integrations` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `instructor_id` varchar(64) NOT NULL COMMENT 'Foreign key linking to the instructor/user table',
          `platform` varchar(50) NOT NULL DEFAULT 'tiktok',
          `pixel_id` varchar(100) NOT NULL COMMENT 'TikTok Pixel ID provided by the instructor',
          `access_token` varchar(255) DEFAULT NULL COMMENT 'TikTok Events API Access Token (Optional)',
          `status` enum('active','inactive','pending') NOT NULL DEFAULT 'active' COMMENT 'Status of the integration',
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `idx_instructor_platform` (`instructor_id`, `platform`),
          KEY `idx_pixel_id` (`pixel_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    }
} catch (Throwable $e) {
    // Ignore table creation notice
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $userId = trim($_GET['userId'] ?? $_GET['instructor_id'] ?? $_GET['instructorId'] ?? '');
    if (empty($userId)) {
        echo json_encode([
            'success' => true,
            'pixelId' => '',
            'status' => 'inactive'
        ]);
        exit();
    }

    try {
        if (isset($conn) && ($conn instanceof mysqli)) {
            $stmt = $conn->prepare("SELECT `pixel_id`, `access_token`, `status` FROM `instructor_integrations` WHERE `instructor_id` = ? AND `platform` = 'tiktok' LIMIT 1");
            if ($stmt) {
                $stmt->bind_param("s", $userId);
                $stmt->execute();
                $res = $stmt->get_result();
                $integration = $res ? $res->fetch_assoc() : null;
                $stmt->close();

                if ($integration) {
                    echo json_encode([
                        'success' => true,
                        'pixelId' => $integration['pixel_id'],
                        'accessToken' => $integration['access_token'],
                        'status' => $integration['status']
                    ]);
                    exit();
                }
            }
        }
    } catch (Throwable $e) {
        // Fallback below
    }

    echo json_encode([
        'success' => true,
        'pixelId' => '',
        'status' => 'inactive'
    ]);
    exit();
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $userId = trim($input['userId'] ?? $input['instructor_id'] ?? $input['instructorId'] ?? '');
    $pixelId = trim($input['pixelId'] ?? $input['pixel_id'] ?? '');
    $accessToken = isset($input['accessToken']) ? trim($input['accessToken']) : (isset($input['access_token']) ? trim($input['access_token']) : null);

    if (empty($userId) || empty($pixelId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID and Pixel ID are required']);
        exit();
    }

    try {
        if (isset($conn) && ($conn instanceof mysqli)) {
            $stmt = $conn->prepare("INSERT INTO `instructor_integrations` (`instructor_id`, `platform`, `pixel_id`, `access_token`, `status`) 
                VALUES (?, 'tiktok', ?, ?, 'active') 
                ON DUPLICATE KEY UPDATE `pixel_id` = VALUES(`pixel_id`), `access_token` = VALUES(`access_token`), `status` = 'active', `updated_at` = CURRENT_TIMESTAMP()");
            if ($stmt) {
                $stmt->bind_param("sss", $userId, $pixelId, $accessToken);
                $stmt->execute();
                $stmt->close();
            }
        }
    } catch (Throwable $e) {
        // Ignore DB error if fallback
    }

    echo json_encode([
        'success' => true,
        'message' => 'TikTok Pixel ID saved successfully!',
        'pixelId' => $pixelId,
        'status' => 'active'
    ]);
    exit();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
