<?php
require_once __DIR__ . '/cors.php';
/**
 * Q&A Discussion Forum API (Optimized for Shared Hosting)
 * Path: /api/v1/qna.php
 * Handles Instagram-style threaded course discussion threads & replies.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create schema on shared hosting
    $conn->query("CREATE TABLE IF NOT EXISTS `course_questions` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `course_id` VARCHAR(100) NOT NULL,
        `course_title` VARCHAR(255) DEFAULT NULL,
        `student_name` VARCHAR(255) DEFAULT 'Learner',
        `title` VARCHAR(255) DEFAULT NULL,
        `content` TEXT DEFAULT NULL,
        `timestamp` VARCHAR(100) DEFAULT NULL,
        `upvotes` INT DEFAULT 1,
        `has_upvoted` TINYINT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $conn->query("CREATE TABLE IF NOT EXISTS `course_question_replies` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `question_id` VARCHAR(100) NOT NULL,
        `author_name` VARCHAR(255) DEFAULT NULL,
        `author_role` VARCHAR(50) DEFAULT 'student',
        `content` TEXT DEFAULT NULL,
        `timestamp` VARCHAR(100) DEFAULT NULL,
        `is_instructor` TINYINT DEFAULT 0,
        FOREIGN KEY (`question_id`) REFERENCES `course_questions`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    // 2. GET Handler: Retrieve all threads for a course (or all threads globally if courseId omitted)
    if ($method === 'GET') {
        $course_id = $_GET['courseId'] ?? ($_GET['course_id'] ?? '');

        if (!$course_id) {
            // Fetch all questions globally
            $q_res = $conn->query("SELECT * FROM course_questions ORDER BY timestamp DESC");
            $questions = [];
            if ($q_res) {
                while ($row = $q_res->fetch_assoc()) {
                    $row['upvotes'] = intval($row['upvotes']);
                    $row['hasUpvoted'] = $row['has_upvoted'] == 1;
                    $row['replies'] = [];
                    $questions[$row['id']] = $row;
                }
            }

            if (!empty($questions)) {
                $r_res = $conn->query("SELECT * FROM course_question_replies ORDER BY timestamp ASC");
                if ($r_res) {
                    while ($reply = $r_res->fetch_assoc()) {
                        $reply['isInstructor'] = $reply['is_instructor'] == 1;
                        $reply['authorName'] = $reply['author_name'];
                        $reply['authorRole'] = $reply['author_role'];
                        if (isset($questions[$reply['question_id']])) {
                            $questions[$reply['question_id']]['replies'][] = $reply;
                        }
                    }
                }
            }

            echo json_encode(array_values($questions));
            exit();
        }

        // Fetch questions for specific course
        $q_stmt = $conn->prepare("SELECT * FROM course_questions WHERE course_id = ?");
        $q_stmt->bind_param("s", $course_id);
        $q_stmt->execute();
        $q_res = $q_stmt->get_result();
        
        $questions = [];
        while ($row = $q_res->fetch_assoc()) {
            $row['upvotes'] = intval($row['upvotes']);
            $row['hasUpvoted'] = $row['has_upvoted'] == 1;
            $row['replies'] = [];
            $questions[$row['id']] = $row;
        }
        $q_stmt->close();

        // Fetch replies
        if (!empty($questions)) {
            $question_ids = array_keys($questions);
            $in_clause = implode(',', array_fill(0, count($question_ids), '?'));
            $r_stmt = $conn->prepare("SELECT * FROM course_question_replies WHERE question_id IN ($in_clause) ORDER BY timestamp ASC");
            
            // Dynamic binding of parameters for IN clause
            $types = str_repeat('s', count($question_ids));
            $r_stmt->bind_param($types, ...$question_ids);
            $r_stmt->execute();
            $r_res = $r_stmt->get_result();

            while ($reply = $r_res->fetch_assoc()) {
                $reply['isInstructor'] = $reply['is_instructor'] == 1;
                $reply['authorName'] = $reply['author_name'];
                $reply['authorRole'] = $reply['author_role'];
                
                // Nest into appropriate parent question
                $questions[$reply['question_id']]['replies'][] = $reply;
            }
            $r_stmt->close();
        }

        // Return indexed values
        echo json_encode(array_values($questions));
        exit();
    }

    // 3. POST Handler: Save entire Q&A tree (compatible with client apiClient.qna.saveForCourse)
    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $course_id = $data['courseId'] ?? ($data['course_id'] ?? '');
        $questions_array = $data['questions'] ?? [];

        if (!$course_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "courseId is required"]);
            exit();
        }

        // Begin SQL Transaction to prevent partial writes
        $conn->begin_transaction();

        try {
            // Delete existing replies and questions for this course to write fresh tree
            $del_r_stmt = $conn->prepare("DELETE FROM course_question_replies WHERE question_id IN (SELECT id FROM course_questions WHERE course_id = ?)");
            $del_r_stmt->bind_param("s", $course_id);
            $del_r_stmt->execute();
            $del_r_stmt->close();

            $del_q_stmt = $conn->prepare("DELETE FROM course_questions WHERE course_id = ?");
            $del_q_stmt->bind_param("s", $course_id);
            $del_q_stmt->execute();
            $del_q_stmt->close();

            // Insert questions and nested replies
            $ins_q_stmt = $conn->prepare("INSERT INTO course_questions (id, course_id, course_title, student_name, title, content, timestamp, upvotes, has_upvoted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins_r_stmt = $conn->prepare("INSERT INTO course_question_replies (id, question_id, author_name, author_role, content, timestamp, is_instructor) VALUES (?, ?, ?, ?, ?, ?, ?)");

            foreach ($questions_array as $q) {
                $q_id = $q['id'];
                $q_title = $q['title'] ?? '';
                $q_content = $q['content'] ?? '';
                $q_student = $q['studentName'] ?? 'Learner';
                $q_timestamp = $q['timestamp'] ?? date('c');
                $q_upvotes = intval($q['upvotes'] ?? 1);
                $q_has_upvoted = isset($q['hasUpvoted']) && $q['hasUpvoted'] ? 1 : 0;
                $course_title = $q['courseTitle'] ?? '';

                $ins_q_stmt->bind_param("ssssssisi", $q_id, $course_id, $course_title, $q_student, $q_title, $q_content, $q_timestamp, $q_upvotes, $q_has_upvoted);
                $ins_q_stmt->execute();

                // Loop and insert replies
                $replies = $q['replies'] ?? [];
                foreach ($replies as $r) {
                    $r_id = $r['id'];
                    $r_author = $r['authorName'] ?? 'Learner';
                    $r_role = $r['authorRole'] ?? 'student';
                    $r_content = $r['content'] ?? '';
                    $r_timestamp = $r['timestamp'] ?? date('c');
                    $r_is_inst = isset($r['isInstructor']) && $r['isInstructor'] ? 1 : 0;

                    $ins_r_stmt->bind_param("ssssssi", $r_id, $q_id, $r_author, $r_role, $r_content, $r_timestamp, $r_is_inst);
                    $ins_r_stmt->execute();
                }
            }

            $ins_q_stmt->close();
            $ins_r_stmt->close();

            // Commit transaction
            $conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Q&A database tree updated successfully"
            ]);
            exit();

        } catch (Exception $tx_err) {
            $conn->rollback();
            throw $tx_err;
        }
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
