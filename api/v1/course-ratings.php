<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Rating & Review API
 * Path: /api/v1/course-ratings.php
 * Handles student course star ratings and review feedback.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create course_ratings table
    $conn->query("CREATE TABLE IF NOT EXISTS `course_ratings` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `student_id` VARCHAR(100) NOT NULL,
        `student_name` VARCHAR(255) DEFAULT 'Learner',
        `course_id` VARCHAR(100) NOT NULL,
        `rating` INT NOT NULL DEFAULT 5,
        `feedback` TEXT DEFAULT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `student_course_rating` (`student_id`, `course_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $student_id = $data['studentId'] ?? ($data['student_id'] ?? 'current-user');
        $student_name = $data['studentName'] ?? ($data['student_name'] ?? 'Learner');
        $course_id = $data['courseId'] ?? ($data['course_id'] ?? '');
        $rating = intval($data['rating'] ?? 5);
        $feedback = $data['feedback'] ?? '';
        $id = 'rate_' . $student_id . '_' . $course_id;

        if (!$course_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "courseId is required"]);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO course_ratings (id, student_id, student_name, course_id, rating, feedback) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback = VALUES(feedback), created_at = NOW()");
        if ($stmt) {
            $stmt->bind_param("ssssis", $id, $student_id, $student_name, $course_id, $rating, $feedback);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Course rating submitted successfully",
            "rating" => $rating
        ]);
        exit();
    }

    if ($method === 'GET') {
        $course_id = $_GET['course_id'] ?? ($_GET['courseId'] ?? null);
        $student_id = $_GET['student_id'] ?? ($_GET['studentId'] ?? null);

        if ($course_id && $student_id) {
            $stmt = $conn->prepare("SELECT * FROM course_ratings WHERE student_id = ? AND course_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $student_id, $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res->fetch_assoc();
                $stmt->close();
                echo json_encode(["success" => true, "data" => $row]);
                exit();
            }
        } else if ($student_id) {
            // Fetch all ratings/reviews submitted by a specific student
            $stmt = $conn->prepare("SELECT * FROM course_ratings WHERE student_id = ? OR student_id = 'current-user' ORDER BY created_at DESC");
            if ($stmt) {
                $stmt->bind_param("s", $student_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $ratings = [];
                while ($row = $res->fetch_assoc()) {
                    $ratings[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $ratings]);
                exit();
            }
        } else if ($course_id) {
            // Fetch all ratings/reviews for a specific course
            $stmt = $conn->prepare("SELECT * FROM course_ratings WHERE course_id = ? ORDER BY created_at DESC");
            if ($stmt) {
                $stmt->bind_param("s", $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $ratings = [];
                while ($row = $res->fetch_assoc()) {
                    $ratings[] = $row;
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $ratings]);
                exit();
            }
        } else {
            // Fetch all ratings/reviews globally across all courses
            $res = $conn->query("SELECT * FROM course_ratings ORDER BY created_at DESC");
            $ratings = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $ratings[] = $row;
                }
            }
            echo json_encode(["success" => true, "data" => $ratings]);
            exit();
        }

        echo json_encode(["success" => true, "data" => null]);
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
