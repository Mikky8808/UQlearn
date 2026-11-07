<?php
require_once __DIR__ . '/cors.php';
/**
 * Video Playback Progress API Endpoint
 * Handles saving and retrieving video watch timestamps and completion percentage
 * in the MySQL database table 'video_playback_progress'.
 * 
 * Path: /api/v1/video-progress.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure table exists
    $conn->query("CREATE TABLE IF NOT EXISTS `video_playback_progress` (
      `id` VARCHAR(128) PRIMARY KEY,
      `user_id` VARCHAR(64) NOT NULL,
      `lesson_id` VARCHAR(64) NOT NULL,
      `course_id` VARCHAR(64) DEFAULT NULL,
      `current_time` FLOAT DEFAULT 0,
      `duration` FLOAT DEFAULT 0,
      `percentage` INT DEFAULT 0,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY `idx_user_lesson` (`user_id`, `lesson_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    function formatProgressRow($row) {
        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'user_id' => $row['user_id'],
            'lessonId' => $row['lesson_id'],
            'lesson_id' => $row['lesson_id'],
            'courseId' => $row['course_id'],
            'course_id' => $row['course_id'],
            'currentTime' => (float)$row['current_time'],
            'current_time' => (float)$row['current_time'],
            'duration' => (float)$row['duration'],
            'percentage' => (int)$row['percentage'],
            'updatedAt' => $row['updated_at']
        ];
    }

    if ($method === 'GET') {
        $userId = isset($_GET['user_id']) ? trim($_GET['user_id']) : (isset($_GET['userId']) ? trim($_GET['userId']) : '');
        $courseId = isset($_GET['course_id']) ? trim($_GET['course_id']) : (isset($_GET['courseId']) ? trim($_GET['courseId']) : '');
        $lessonId = isset($_GET['lesson_id']) ? trim($_GET['lesson_id']) : (isset($_GET['lessonId']) ? trim($_GET['lessonId']) : '');

        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "user_id is required"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        if (!empty($lessonId)) {
            $stmt = $conn->prepare("SELECT * FROM video_playback_progress WHERE user_id = ? AND lesson_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $userId, $lessonId);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res ? $res->fetch_assoc() : null;
                $stmt->close();
                echo json_encode(["success" => true, "data" => $row ? formatProgressRow($row) : null]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        if (!empty($courseId)) {
            $stmt = $conn->prepare("SELECT * FROM video_playback_progress WHERE user_id = ? AND course_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $userId, $courseId);
                $stmt->execute();
                $res = $stmt->get_result();
                $rows = [];
                if ($res) {
                    while ($r = $res->fetch_assoc()) {
                        $rows[] = formatProgressRow($r);
                    }
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $rows]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM video_playback_progress WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $res = $stmt->get_result();
            $rows = [];
            if ($res) {
                while ($r = $res->fetch_assoc()) {
                    $rows[] = formatProgressRow($r);
                }
            }
            $stmt->close();
            echo json_encode(["success" => true, "data" => $rows]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();

    } elseif ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $userId = isset($data['user_id']) ? trim($data['user_id']) : ($data['userId'] ?? '');
        $lessonId = isset($data['lesson_id']) ? trim($data['lesson_id']) : ($data['lessonId'] ?? '');
        $courseId = isset($data['course_id']) ? trim($data['course_id']) : ($data['courseId'] ?? '');
        $currentTime = isset($data['current_time']) ? floatval($data['current_time']) : (isset($data['currentTime']) ? floatval($data['currentTime']) : 0);
        $duration = isset($data['duration']) ? floatval($data['duration']) : 0;
        $percentage = isset($data['percentage']) ? intval($data['percentage']) : 0;

        if (empty($userId) || empty($lessonId)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "user_id and lesson_id are required"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $id = $userId . '_' . $lessonId;
        $courseIdVal = !empty($courseId) ? $courseId : null;

        $stmt = $conn->prepare("INSERT INTO video_playback_progress (`id`, `user_id`, `lesson_id`, `course_id`, `current_time`, `duration`, `percentage`) 
            VALUES (?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            `current_time` = VALUES(`current_time`), 
            `duration` = VALUES(`duration`), 
            `percentage` = VALUES(`percentage`),
            `updated_at` = CURRENT_TIMESTAMP");

        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $stmt->bind_param("ssssddi", $id, $userId, $lessonId, $courseIdVal, $currentTime, $duration, $percentage);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Progress saved successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to save progress: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Video progress API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
