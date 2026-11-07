<?php
require_once __DIR__ . '/cors.php';
/**
 * Flash Sale & Top Selling Shelf Configuration API
 * Path: /api/v1/flash-sale.php
 * Handles reading and updating the flash sale countdown schedule and marked courses.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
header("Content-Type: application/json; charset=UTF-8");

$defaultStartTime = '2026-10-24T00:00';
$defaultEndTime = '2027-08-23T23:59:59';

try {
    require_once __DIR__ . '/db.php';

    // Auto-create flash_sale_config table
    $conn->query("CREATE TABLE IF NOT EXISTS `flash_sale_config` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL DEFAULT 'Top selling items',
        `enabled` TINYINT(1) NOT NULL DEFAULT 1,
        `start_time` VARCHAR(100) NOT NULL,
        `end_time` VARCHAR(100) NOT NULL,
        `course_ids` LONGTEXT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Seed default record if empty
    $checkRes = $conn->query("SELECT id FROM `flash_sale_config` WHERE id = 'main'");
    if (!$checkRes || $checkRes->num_rows === 0) {
        $stmt = $conn->prepare("INSERT INTO `flash_sale_config` (`id`, `title`, `enabled`, `start_time`, `end_time`, `course_ids`) VALUES ('main', 'Top selling items', 1, ?, ?, '[]')");
        $stmt->bind_param("ss", $defaultStartTime, $defaultEndTime);
        $stmt->execute();
        $stmt->close();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT title, enabled, start_time, end_time, course_ids FROM `flash_sale_config` WHERE id = 'main' LIMIT 1");
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res ? $res->fetch_assoc() : null;
        $stmt->close();

        if ($row) {
            $courseIds = [];
            if (!empty($row['course_ids'])) {
                $decoded = json_decode($row['course_ids'], true);
                if (is_array($decoded)) {
                    $courseIds = $decoded;
                }
            }

            $config = [
                "enabled" => (bool)$row['enabled'],
                "title" => $row['title'] ?: 'Top selling items',
                "startTime" => $row['start_time'] ?: $defaultStartTime,
                "endTime" => $row['end_time'] ?: $defaultEndTime,
                "courseIds" => $courseIds
            ];

            echo json_encode([
                "success" => true,
                "config" => $config,
                "data" => $config
            ]);
            exit();
        }

        $fallbackConfig = [
            "enabled" => true,
            "title" => 'Top selling items',
            "startTime" => $defaultStartTime,
            "endTime" => $defaultEndTime,
            "courseIds" => []
        ];

        echo json_encode([
            "success" => true,
            "config" => $fallbackConfig,
            "data" => $fallbackConfig
        ]);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? [];

        $title = !empty($data['title']) ? trim($data['title']) : 'Top selling items';
        $enabled = isset($data['enabled']) ? ($data['enabled'] ? 1 : 0) : 1;
        $startTime = !empty($data['startTime']) ? trim($data['startTime']) : $defaultStartTime;
        $endTime = !empty($data['endTime']) ? trim($data['endTime']) : $defaultEndTime;
        
        $courseIds = [];
        if (isset($data['courseIds']) && is_array($data['courseIds'])) {
            $courseIds = array_values(array_filter($data['courseIds']));
        }
        $courseIdsJson = json_encode($courseIds);

        $stmt = $conn->prepare("INSERT INTO `flash_sale_config` (`id`, `title`, `enabled`, `start_time`, `end_time`, `course_ids`) 
            VALUES ('main', ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE title=VALUES(title), enabled=VALUES(enabled), start_time=VALUES(start_time), end_time=VALUES(end_time), course_ids=VALUES(course_ids)");
        $stmt->bind_param("sisss", $title, $enabled, $startTime, $endTime, $courseIdsJson);
        $stmt->execute();
        $stmt->close();

        $savedConfig = [
            "enabled" => (bool)$enabled,
            "title" => $title,
            "startTime" => $startTime,
            "endTime" => $endTime,
            "courseIds" => $courseIds
        ];

        echo json_encode([
            "success" => true,
            "message" => "Flash sale configuration saved successfully",
            "config" => $savedConfig,
            "data" => $savedConfig
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
} catch (Throwable $e) {
    // If DB is offline, return fallback configuration with fixed persistent deadline
    $fallbackConfig = [
        "enabled" => true,
        "title" => 'Top selling items',
        "startTime" => $defaultStartTime,
        "endTime" => $defaultEndTime,
        "courseIds" => []
    ];

    echo json_encode([
        "success" => true,
        "config" => $fallbackConfig,
        "data" => $fallbackConfig,
        "warning" => "Serving persistent fallback configuration"
    ]);
}
