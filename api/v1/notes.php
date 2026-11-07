<?php
require_once __DIR__ . '/cors.php';
/**
 * Learner Notes API - API v1
 * Path: /api/v1/notes.php
 * 
 * Provides cloud persistence for student video notes and course timestamps
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

try {
    require_once __DIR__ . '/db.php';

    // Ensure notes table exists
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->query("
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                note_id VARCHAR(255) NULL,
                user_id VARCHAR(255) NOT NULL,
                course_id VARCHAR(255) NOT NULL,
                course_title VARCHAR(255) NULL,
                lesson_id VARCHAR(255) NULL,
                lesson_title VARCHAR(255) NULL,
                timestamp VARCHAR(50) NULL,
                title VARCHAR(255) NULL,
                content TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_course (user_id, course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }

    if ($method === 'GET') {
        $userId = isset($_GET['userId']) ? trim((string)$_GET['userId']) : (isset($_GET['user_id']) ? trim((string)$_GET['user_id']) : '');
        $courseId = isset($_GET['courseId']) ? trim((string)$_GET['courseId']) : (isset($_GET['course_id']) ? trim((string)$_GET['course_id']) : '');

        $notes = [];
        if (isset($conn) && $conn instanceof mysqli) {
            if (!empty($userId) && !empty($courseId)) {
                $stmt = $conn->prepare("SELECT id, note_id, user_id, course_id, course_title, lesson_id, lesson_title, timestamp, title, content, created_at FROM notes WHERE user_id = ? AND course_id = ? ORDER BY id DESC");
                $stmt->bind_param("ss", $userId, $courseId);
            } elseif (!empty($userId)) {
                $stmt = $conn->prepare("SELECT id, note_id, user_id, course_id, course_title, lesson_id, lesson_title, timestamp, title, content, created_at FROM notes WHERE user_id = ? ORDER BY id DESC");
                $stmt->bind_param("s", $userId);
            } elseif (!empty($courseId)) {
                $stmt = $conn->prepare("SELECT id, note_id, user_id, course_id, course_title, lesson_id, lesson_title, timestamp, title, content, created_at FROM notes WHERE course_id = ? ORDER BY id DESC");
                $stmt->bind_param("s", $courseId);
            } else {
                $stmt = $conn->prepare("SELECT id, note_id, user_id, course_id, course_title, lesson_id, lesson_title, timestamp, title, content, created_at FROM notes ORDER BY id DESC LIMIT 100");
            }

            if ($stmt) {
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $notes[] = [
                        "id" => $row['note_id'] ? $row['note_id'] : ('note-' . $row['id']),
                        "dbId" => $row['id'],
                        "userId" => $row['user_id'],
                        "courseId" => $row['course_id'],
                        "courseTitle" => $row['course_title'] ?? '',
                        "lessonId" => $row['lesson_id'] ?? '',
                        "lessonTitle" => $row['lesson_title'] ?? '',
                        "timestamp" => $row['timestamp'] ?? '00:00',
                        "title" => $row['title'] ?? 'Note',
                        "content" => $row['content'] ?? '',
                        "createdAt" => $row['created_at'] ?? 'Just now'
                    ];
                }
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "notes" => $notes
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents("php://input");
        $data = json_decode($raw_input, true);

        $action = isset($data['action']) ? trim((string)$data['action']) : 'save';
        $noteId = !empty($data['id']) ? trim((string)$data['id']) : ('note-' . time());
        $userId = !empty($data['userId']) ? trim((string)$data['userId']) : (!empty($data['user_id']) ? trim((string)$data['user_id']) : 'guest');
        $courseId = !empty($data['courseId']) ? trim((string)$data['courseId']) : (!empty($data['course_id']) ? trim((string)$data['course_id']) : '');
        $courseTitle = !empty($data['courseTitle']) ? trim((string)$data['courseTitle']) : (!empty($data['course_title']) ? trim((string)$data['course_title']) : '');
        $lessonId = !empty($data['lessonId']) ? trim((string)$data['lessonId']) : (!empty($data['lesson_id']) ? trim((string)$data['lesson_id']) : '');
        $lessonTitle = !empty($data['lessonTitle']) ? trim((string)$data['lessonTitle']) : (!empty($data['lesson_title']) ? trim((string)$data['lesson_title']) : '');
        $timestamp = !empty($data['timestamp']) ? trim((string)$data['timestamp']) : '00:00';
        $title = !empty($data['title']) ? trim((string)$data['title']) : ('Note at ' . $timestamp);
        $content = isset($data['content']) ? trim((string)$data['content']) : '';

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "courseId is required to save a note."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        if (isset($conn) && $conn instanceof mysqli) {
            // Check if note_id already exists for update
            $chk = $conn->prepare("SELECT id FROM notes WHERE note_id = ? OR (user_id = ? AND course_id = ? AND title = ? AND timestamp = ?)");
            if ($chk) {
                $chk->bind_param("sssss", $noteId, $userId, $courseId, $title, $timestamp);
                $chk->execute();
                $chkRes = $chk->get_result();
                $existing = $chkRes->fetch_assoc();
                $chk->close();

                if ($existing) {
                    $upd = $conn->prepare("UPDATE notes SET course_title = ?, lesson_id = ?, lesson_title = ?, title = ?, content = ? WHERE id = ?");
                    $upd->bind_param("sssssi", $courseTitle, $lessonId, $lessonTitle, $title, $content, $existing['id']);
                    $upd->execute();
                    $dbId = $existing['id'];
                    $upd->close();
                } else {
                    $ins = $conn->prepare("INSERT INTO notes (note_id, user_id, course_id, course_title, lesson_id, lesson_title, timestamp, title, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $ins->bind_param("sssssssss", $noteId, $userId, $courseId, $courseTitle, $lessonId, $lessonTitle, $timestamp, $title, $content);
                    $ins->execute();
                    $dbId = $ins->insert_id;
                    $ins->close();
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Note saved successfully.",
                "note" => [
                    "id" => $noteId,
                    "dbId" => $dbId ?? 0,
                    "userId" => $userId,
                    "courseId" => $courseId,
                    "courseTitle" => $courseTitle,
                    "lessonId" => $lessonId,
                    "lessonTitle" => $lessonTitle,
                    "timestamp" => $timestamp,
                    "title" => $title,
                    "content" => $content,
                    "createdAt" => "Just now"
                ]
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Note processed.",
                "note" => [
                    "id" => $noteId,
                    "userId" => $userId,
                    "courseId" => $courseId,
                    "title" => $title,
                    "content" => $content
                ]
            ]);
        }

        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
        $dbId = isset($_GET['dbId']) ? intval($_GET['dbId']) : 0;
        $userId = isset($_GET['userId']) ? trim((string)$_GET['userId']) : '';

        if (($id !== '' || $dbId > 0) && isset($conn) && $conn instanceof mysqli) {
            if ($dbId > 0) {
                $stmt = $conn->prepare("DELETE FROM notes WHERE id = ?");
                $stmt->bind_param("i", $dbId);
            } else {
                $stmt = $conn->prepare("DELETE FROM notes WHERE note_id = ?");
                $stmt->bind_param("s", $id);
            }
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Note deleted successfully."
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error processing notes request: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}
?>
