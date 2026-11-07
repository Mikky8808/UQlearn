<?php
require_once __DIR__ . '/cors.php';
/**
 * Promotional Videos API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/promotional-videos.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // 1. Ensure table 'promotional_videos' exists
    $conn->query("CREATE TABLE IF NOT EXISTS `promotional_videos` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `course_id` VARCHAR(64) NOT NULL,
        `video_path` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `idx_course_id` (`course_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $method = $_SERVER['REQUEST_METHOD'];

    // GET Request: Fetch promotional video path by course_id
    if ($method === 'GET') {
        $courseId = $_GET['course_id'] ?? ($_GET['courseId'] ?? null);
        if (!$courseId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Course ID is required."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $courseId = $conn->real_escape_string(trim($courseId));
        $res = $conn->query("SELECT video_path FROM promotional_videos WHERE course_id = '$courseId'");
        
        if ($res && $res->num_rows > 0) {
            $row = $res->fetch_assoc();
            echo json_encode([
                "success" => true,
                "course_id" => $courseId,
                "video_path" => $row['video_path']
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "course_id" => $courseId,
                "video_path" => ""
            ]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // POST / PUT Request: Save/Update promotional video path by course_id
    if ($method === 'POST' || $method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $courseId = $input['course_id'] ?? ($input['courseId'] ?? null);
        $videoPath = $input['video_path'] ?? ($input['videoPath'] ?? '');

        if (!$courseId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Course ID is required."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $courseId = $conn->real_escape_string(trim($courseId));
        $videoPath = $conn->real_escape_string(trim($videoPath));

        $stmt = $conn->prepare("INSERT INTO promotional_videos (course_id, video_path) VALUES (?, ?) 
                                ON DUPLICATE KEY UPDATE video_path = VALUES(video_path)");
        if ($stmt) {
            $stmt->bind_param("ss", $courseId, $videoPath);
            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Promotional video path saved successfully.",
                    "course_id" => $courseId,
                    "video_path" => $videoPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Failed to save promotional video: " . $stmt->error]);
            }
            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to prepare database statement: " . $conn->error]);
        }
        
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unhandled promotional-videos API exception: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
