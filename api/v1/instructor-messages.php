<?php
require_once __DIR__ . '/cors.php';
/**
 * Instructor Announcements & Direct Learner Messages API (Zero Mock Data)
 * Path: /api/v1/instructor-messages.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create announcements table
    $conn->query("CREATE TABLE IF NOT EXISTS `instructor_announcements` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `course_id` VARCHAR(100) NOT NULL,
        `course_title` VARCHAR(255) DEFAULT 'Course Announcement',
        `instructor_name` VARCHAR(255) DEFAULT 'Instructor',
        `title` VARCHAR(255) NOT NULL,
        `content` TEXT NOT NULL,
        `date` VARCHAR(100) DEFAULT 'Just now',
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Auto-create direct messages table (Instagram-like DM threads)
    $conn->query("CREATE TABLE IF NOT EXISTS `instructor_direct_messages` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `learner_name` VARCHAR(255) NOT NULL,
        `learner_avatar` TEXT DEFAULT NULL,
        `last_message` TEXT NOT NULL,
        `time` VARCHAR(100) DEFAULT 'Just now',
        `unread_count` INT DEFAULT 0,
        `conversation_history` TEXT DEFAULT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $announcements = [];
        $res_a = $conn->query("SELECT * FROM instructor_announcements ORDER BY created_at DESC");
        if ($res_a) {
            while ($row = $res_a->fetch_assoc()) {
                $announcements[] = [
                    "id" => $row['id'],
                    "courseId" => $row['course_id'],
                    "courseTitle" => $row['course_title'],
                    "instructorName" => $row['instructor_name'],
                    "title" => $row['title'],
                    "content" => $row['content'],
                    "date" => $row['date'],
                    "unread" => false
                ];
            }
        }

        $dms = [];
        $res_d = $conn->query("SELECT * FROM instructor_direct_messages ORDER BY updated_at DESC");
        if ($res_d) {
            while ($row = $res_d->fetch_assoc()) {
                $dms[] = [
                    "id" => $row['id'],
                    "learnerName" => $row['learner_name'],
                    "learnerAvatar" => $row['learner_avatar'] ?: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    "lastMessage" => $row['last_message'],
                    "time" => $row['time'],
                    "unreadCount" => intval($row['unread_count']),
                    "history" => json_decode($row['conversation_history'], true) ?? []
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "announcements" => $announcements,
            "directThreads" => $dms
        ]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];
        $action = $data['action'] ?? 'create_announcement';

        if ($action === 'create_announcement') {
            $id = $data['id'] ?? ('ian-' . time());
            $course_id = $data['course_id'] ?? ($data['courseId'] ?? 'all');
            $course_title = $data['course_title'] ?? ($data['courseTitle'] ?? 'Course Announcement');
            $instructor_name = $data['instructor_name'] ?? ($data['instructorName'] ?? 'Instructor');
            $title = $data['title'] ?? '';
            $content = $data['content'] ?? '';
            $date = $data['date'] ?? 'Just now';

            if (!$title || !$content) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Title and content required"]);
                exit();
            }

            $stmt = $conn->prepare("INSERT INTO instructor_announcements (id, course_id, course_title, instructor_name, title, content, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", $id, $course_id, $course_title, $instructor_name, $title, $content, $date);
            $stmt->execute();
            $stmt->close();

            echo json_encode(["success" => true, "message" => "Announcement published successfully"]);
            exit();
        }

        if ($action === 'send_dm_reply') {
            $thread_id = $data['thread_id'] ?? ($data['threadId'] ?? 'dm-1');
            $reply_text = $data['reply_text'] ?? ($data['replyText'] ?? '');

            if (!$reply_text) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Reply text required"]);
                exit();
            }

            // Fetch existing thread history
            $stmt = $conn->prepare("SELECT conversation_history FROM instructor_direct_messages WHERE id = ?");
            $stmt->bind_param("s", $thread_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $row = $res->fetch_assoc();
            $stmt->close();

            $history = $row ? (json_decode($row['conversation_history'], true) ?? []) : [];
            $history[] = [
                "sender" => "instructor",
                "text" => $reply_text,
                "time" => date("g:i A")
            ];

            $history_json = json_encode($history);
            $time_str = "Just now";

            $stmt_up = $conn->prepare("UPDATE instructor_direct_messages SET last_message = ?, time = ?, conversation_history = ?, unread_count = 0, updated_at = NOW() WHERE id = ?");
            $stmt_up->bind_param("ssss", $reply_text, $time_str, $history_json, $thread_id);
            $stmt_up->execute();
            $stmt_up->close();

            echo json_encode([
                "success" => true,
                "message" => "Reply sent successfully",
                "history" => $history
            ]);
            exit();
        }

        if ($action === 'delete_announcement') {
            $id = $data['id'] ?? '';
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM instructor_announcements WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
            }
            echo json_encode(["success" => true, "message" => "Announcement deleted"]);
            exit();
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>
