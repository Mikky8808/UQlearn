<?php
require_once __DIR__ . '/cors.php';
/**
 * Assignments API
 * Path: /api/v1/assignments.php
 * Handles creation, reading, updating, and deletion of course/module assignments.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-provision assignments table schema if not already present & migrate columns
    if ($conn && !$conn->connect_error) {
        $conn->query("CREATE TABLE IF NOT EXISTS `assignments` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `course_id` VARCHAR(64) DEFAULT NULL,
            `module_id` VARCHAR(64) DEFAULT NULL,
            `title` VARCHAR(255) NOT NULL,
            `description` TEXT DEFAULT NULL,
            `duration` INT DEFAULT 0,
            `video_url` VARCHAR(550) DEFAULT NULL,
            `video_file_name` VARCHAR(255) DEFAULT NULL,
            `instructions` LONGTEXT DEFAULT NULL,
            `downloadable_resource_url` VARCHAR(550) DEFAULT NULL,
            `downloadable_resource_file_name` VARCHAR(255) DEFAULT NULL,
            `questions` LONGTEXT DEFAULT NULL,
            `question_answers` LONGTEXT DEFAULT NULL,
            `status` VARCHAR(50) DEFAULT 'draft',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY `course_id_idx` (`course_id`),
            KEY `module_id_idx` (`module_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        @$conn->query("ALTER TABLE `assignments` ADD COLUMN IF NOT EXISTS `question_answers` LONGTEXT DEFAULT NULL");
        @$conn->query("ALTER TABLE `assignments` DROP COLUMN IF EXISTS `solution_video_url`");
        @$conn->query("ALTER TABLE `assignments` DROP COLUMN IF EXISTS `solution_resource_url`");
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    // GET Request: Fetch assignments by id, module_id, or course_id
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null;
        $module_id = $_GET['module_id'] ?? ($_GET['moduleId'] ?? null);
        $course_id = $_GET['course_id'] ?? ($_GET['courseId'] ?? null);

        if ($conn && !$conn->connect_error) {
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM assignments WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $res = $stmt->get_result();
                $assignment = $res->fetch_assoc();
                $stmt->close();

                if ($assignment) {
                    $assignment['questions'] = json_decode($assignment['questions'] ?? '[]', true) ?? [];
                    $assignment['question_answers'] = json_decode($assignment['question_answers'] ?? '{}', true) ?? [];
                    echo json_encode(["success" => true, "data" => $assignment]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Assignment not found"]);
                }
                exit();
            }

            if ($module_id) {
                $stmt = $conn->prepare("SELECT * FROM assignments WHERE module_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("s", $module_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $assignments = [];
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['question_answers'] = json_decode($row['question_answers'] ?? '{}', true) ?? [];
                    $assignments[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $assignments]);
                exit();
            }

            if ($course_id) {
                $stmt = $conn->prepare("SELECT * FROM assignments WHERE course_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("s", $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $assignments = [];
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['question_answers'] = json_decode($row['question_answers'] ?? '{}', true) ?? [];
                    $assignments[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $assignments]);
                exit();
            }

            // If no params, list all assignments
            $res = $conn->query("SELECT * FROM assignments ORDER BY created_at DESC LIMIT 100");
            $assignments = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $row['questions'] = json_decode($row['questions'] ?? '[]', true) ?? [];
                    $row['question_answers'] = json_decode($row['question_answers'] ?? '{}', true) ?? [];
                    $assignments[] = $row;
                }
            }
            echo json_encode(["success" => true, "data" => $assignments]);
            exit();
        } else {
            echo json_encode(["success" => true, "data" => []]);
            exit();
        }
    }

    // POST/PUT Request: Upsert (Insert or Update) Assignment
    if ($method === 'POST' || $method === 'PUT') {
        $id = $data['id'] ?? ($_GET['id'] ?? 'assg-' . uniqid());
        $course_id = $data['course_id'] ?? ($data['courseId'] ?? null);
        $module_id = $data['module_id'] ?? ($data['moduleId'] ?? null);
        $title = $data['title'] ?? 'Untitled Assignment';
        $description = $data['description'] ?? '';
        $duration = intval($data['duration'] ?? 0);
        $video_url = $data['video_url'] ?? ($data['videoUrl'] ?? '');
        $video_file_name = $data['video_file_name'] ?? ($data['videoFileName'] ?? '');
        $instructions = $data['instructions'] ?? '';
        $downloadable_resource_url = $data['downloadable_resource_url'] ?? ($data['downloadableResourceUrl'] ?? '');
        $downloadable_resource_file_name = $data['downloadable_resource_file_name'] ?? ($data['downloadableResourceFileName'] ?? '');
        $questions_arr = $data['questions'] ?? [];
        $questions_json = is_array($questions_arr) ? json_encode($questions_arr) : (string)$questions_arr;
        $question_answers_arr = $data['question_answers'] ?? ($data['questionAnswers'] ?? []);
        $question_answers_json = is_array($question_answers_arr) ? json_encode($question_answers_arr) : (string)$question_answers_arr;
        $status = $data['status'] ?? 'draft';

        if ($conn && !$conn->connect_error) {
            $stmt = $conn->prepare("INSERT INTO assignments (
                id, course_id, module_id, title, description, duration, 
                video_url, video_file_name, instructions, downloadable_resource_url, 
                downloadable_resource_file_name, questions, question_answers, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                course_id = VALUES(course_id),
                module_id = VALUES(module_id),
                title = VALUES(title),
                description = VALUES(description),
                duration = VALUES(duration),
                video_url = VALUES(video_url),
                video_file_name = VALUES(video_file_name),
                instructions = VALUES(instructions),
                downloadable_resource_url = VALUES(downloadable_resource_url),
                downloadable_resource_file_name = VALUES(downloadable_resource_file_name),
                questions = VALUES(questions),
                question_answers = VALUES(question_answers),
                status = VALUES(status),
                updated_at = NOW()");

            if ($stmt) {
                $stmt->bind_param(
                    "sssssissssssss",
                    $id, $course_id, $module_id, $title, $description, $duration,
                    $video_url, $video_file_name, $instructions, $downloadable_resource_url,
                    $downloadable_resource_file_name, $questions_json, $question_answers_json, $status
                );
                $stmt->execute();
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Assignment saved successfully!",
            "data" => [
                "id" => $id,
                "courseId" => $course_id,
                "moduleId" => $module_id,
                "title" => $title,
                "description" => $description,
                "duration" => $duration,
                "videoUrl" => $video_url,
                "videoFileName" => $video_file_name,
                "instructions" => $instructions,
                "downloadableResourceUrl" => $downloadable_resource_url,
                "downloadableResourceFileName" => $downloadable_resource_file_name,
                "questions" => is_array($questions_arr) ? $questions_arr : json_decode($questions_json, true),
                "questionAnswers" => is_array($question_answers_arr) ? $question_answers_arr : json_decode($question_answers_json, true),
                "status" => $status
            ]
        ]);
        exit();
    }

    // DELETE Request: Delete assignment by ID
    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? ($data['id'] ?? null);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Assignment ID is required"]);
            exit();
        }

        if ($conn && !$conn->connect_error) {
            $stmt = $conn->prepare("DELETE FROM assignments WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Assignment deleted successfully!",
            "id" => $id
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
