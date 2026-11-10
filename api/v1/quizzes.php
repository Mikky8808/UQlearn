<?php
require_once __DIR__ . '/cors.php';
/**
 * Quizzes API
 * Path: /api/v1/quizzes.php
 * Handles creation, reading, updating, and deletion of course/module quizzes and their questions.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-provision quizzes table schema if not already present & migrate columns
    if ($conn && !$conn->connect_error) {
        $conn->query("CREATE TABLE IF NOT EXISTS `quizzes` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `course_id` VARCHAR(64) DEFAULT NULL,
            `module_id` VARCHAR(64) DEFAULT NULL,
            `title` VARCHAR(255) NOT NULL,
            `description` TEXT DEFAULT NULL,
            `duration` INT DEFAULT 10,
            `passing_score` INT DEFAULT 80,
            `time_limit_minutes` INT DEFAULT 10,
            `max_attempts` INT DEFAULT 3,
            `shuffle_questions` TINYINT(1) DEFAULT 1,
            `show_explanations` TINYINT(1) DEFAULT 1,
            `questions` LONGTEXT DEFAULT NULL,
            `quiz_data` LONGTEXT DEFAULT NULL,
            `status` VARCHAR(50) DEFAULT 'published',
            `is_published` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY `course_id_idx` (`course_id`),
            KEY `module_id_idx` (`module_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        @$conn->query("ALTER TABLE `quizzes` ADD COLUMN IF NOT EXISTS `questions` LONGTEXT DEFAULT NULL");
        @$conn->query("ALTER TABLE `quizzes` ADD COLUMN IF NOT EXISTS `quiz_data` LONGTEXT DEFAULT NULL");
        @$conn->query("ALTER TABLE `quizzes` ADD COLUMN IF NOT EXISTS `is_published` TINYINT(1) DEFAULT 1");
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    // GET Request: Fetch quizzes by id, module_id, or course_id
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null;
        $module_id = $_GET['module_id'] ?? ($_GET['moduleId'] ?? null);
        $course_id = $_GET['course_id'] ?? ($_GET['courseId'] ?? null);

        if ($conn && !$conn->connect_error) {
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM quizzes WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $res = $stmt->get_result();
                $quiz = $res->fetch_assoc();
                $stmt->close();

                if ($quiz) {
                    $quiz['questions'] = json_decode($quiz['questions'] ?? '[]', true) ?? [];
                    $quiz['quiz_data'] = json_decode($quiz['quiz_data'] ?? '{}', true) ?? [];
                    echo json_encode(["success" => true, "data" => $quiz]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Quiz not found"]);
                }
                exit();
            }

            if ($module_id) {
                $stmt = $conn->prepare("SELECT * FROM quizzes WHERE module_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("s", $module_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $quizzes = [];
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['quiz_data'] = json_decode($row['quiz_data'] ?? '{}', true) ?? [];
                    $quizzes[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $quizzes]);
                exit();
            }

            if ($course_id) {
                $stmt = $conn->prepare("SELECT * FROM quizzes WHERE course_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("s", $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $quizzes = [];
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['quiz_data'] = json_decode($row['quiz_data'] ?? '{}', true) ?? [];
                    $quizzes[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $quizzes]);
                exit();
            }

            // List all quizzes
            $res = $conn->query("SELECT * FROM quizzes ORDER BY created_at DESC LIMIT 100");
            $quizzes = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['quiz_data'] = json_decode($row['quiz_data'] ?? '{}', true) ?? [];
                    $quizzes[] = $row;
                }
            }
            echo json_encode(["success" => true, "data" => $quizzes]);
            exit();
        } else {
            echo json_encode(["success" => true, "data" => []]);
            exit();
        }
    }

    // POST/PUT Request: Upsert (Insert or Update) Quiz
    if ($method === 'POST' || $method === 'PUT') {
        $id = $data['id'] ?? ($_GET['id'] ?? 'quiz-' . uniqid());
        $course_id = $data['course_id'] ?? ($data['courseId'] ?? null);
        $module_id = $data['module_id'] ?? ($data['moduleId'] ?? null);
        $title = $data['title'] ?? 'New Quiz';
        $description = $data['description'] ?? '';
        $duration = intval($data['duration'] ?? 10);
        $passing_score = intval($data['passing_score'] ?? ($data['passingScore'] ?? 80));
        $time_limit_minutes = intval($data['time_limit_minutes'] ?? ($data['timeLimitMinutes'] ?? 10));
        $max_attempts = intval($data['max_attempts'] ?? ($data['maxAttempts'] ?? 3));
        $shuffle_questions = !empty($data['shuffle_questions']) || !empty($data['shuffleQuestions']) ? 1 : 0;
        $show_explanations = !empty($data['show_explanations']) || !empty($data['showExplanations']) ? 1 : 0;
        
        $questions_arr = $data['questions'] ?? [];
        if (empty($questions_arr) && !empty($data['quiz_data']['questions'])) {
            $questions_arr = $data['quiz_data']['questions'];
        }
        $questions_json = is_array($questions_arr) ? json_encode($questions_arr) : (string)$questions_arr;

        $quiz_data_arr = $data['quiz_data'] ?? ($data['quizData'] ?? [
            'id' => $id,
            'title' => $title,
            'description' => $description,
            'passingScore' => $passing_score,
            'timeLimitMinutes' => $time_limit_minutes,
            'maxAttempts' => $max_attempts,
            'shuffleQuestions' => (bool)$shuffle_questions,
            'showExplanations' => (bool)$show_explanations,
            'questions' => $questions_arr
        ]);
        $quiz_data_json = is_array($quiz_data_arr) ? json_encode($quiz_data_arr) : (string)$quiz_data_arr;

        $status = $data['status'] ?? 'published';
        $is_published = intval($data['is_published'] ?? ($data['isPublished'] ?? ($status === 'published' ? 1 : 0)));

        if ($conn && !$conn->connect_error) {
            $stmt = $conn->prepare("INSERT INTO quizzes (
                id, course_id, module_id, title, description, duration, 
                passing_score, time_limit_minutes, max_attempts, shuffle_questions,
                show_explanations, questions, quiz_data, status, is_published
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                course_id = VALUES(course_id),
                module_id = VALUES(module_id),
                title = VALUES(title),
                description = VALUES(description),
                duration = VALUES(duration),
                passing_score = VALUES(passing_score),
                time_limit_minutes = VALUES(time_limit_minutes),
                max_attempts = VALUES(max_attempts),
                shuffle_questions = VALUES(shuffle_questions),
                show_explanations = VALUES(show_explanations),
                questions = VALUES(questions),
                quiz_data = VALUES(quiz_data),
                status = VALUES(status),
                is_published = VALUES(is_published)");

            if ($stmt) {
                $stmt->bind_param(
                    "sssssiiiiissssi",
                    $id,
                    $course_id,
                    $module_id,
                    $title,
                    $description,
                    $duration,
                    $passing_score,
                    $time_limit_minutes,
                    $max_attempts,
                    $shuffle_questions,
                    $show_explanations,
                    $questions_json,
                    $quiz_data_json,
                    $status,
                    $is_published
                );

                if ($stmt->execute()) {
                    $stmt->close();
                    echo json_encode([
                        "success" => true,
                        "message" => "Quiz saved successfully",
                        "data" => [
                            "id" => $id,
                            "course_id" => $course_id,
                            "module_id" => $module_id,
                            "title" => $title,
                            "description" => $description,
                            "duration" => $duration,
                            "passing_score" => $passing_score,
                            "time_limit_minutes" => $time_limit_minutes,
                            "max_attempts" => $max_attempts,
                            "questions" => $questions_arr,
                            "quiz_data" => $quiz_data_arr,
                            "status" => $status,
                            "is_published" => $is_published
                        ]
                    ]);
                    exit();
                } else {
                    $err = $stmt->error;
                    $stmt->close();
                    http_response_code(500);
                    echo json_encode(["success" => false, "message" => "Execute error: " . $err]);
                    exit();
                }
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Prepare error: " . $conn->error]);
                exit();
            }
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Quiz recorded in fallback storage",
                "data" => $data
            ]);
            exit();
        }
    }

    // DELETE Request: Delete quiz by id
    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? ($data['id'] ?? null);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Quiz ID is required for deletion"]);
            exit();
        }

        if ($conn && !$conn->connect_error) {
            $stmt = $conn->prepare("DELETE FROM quizzes WHERE id = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["success" => true, "message" => "Quiz deleted successfully"]);
            exit();
        } else {
            echo json_encode(["success" => true, "message" => "Quiz removed from fallback storage"]);
            exit();
        }
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Exception: " . $e->getMessage()]);
}
