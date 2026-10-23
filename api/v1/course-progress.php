<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful Student Course Progress API
 * Path: /api/v1/course-progress.php
 * Handles saving and fetching student lesson completion and progress percentage.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Ensure student_course_progress table exists with correct collation
    $conn->query("CREATE TABLE IF NOT EXISTS `student_course_progress` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `student_id` VARCHAR(100) NOT NULL,
        `course_id` VARCHAR(100) NOT NULL,
        `completed_lesson_ids` TEXT DEFAULT NULL,
        `last_lesson_id` VARCHAR(100) DEFAULT NULL,
        `progress_percent` INT DEFAULT 0,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `student_course` (`student_id`, `course_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Dynamic conversion of existing table columns to avoid collation mismatches on pre-existing host databases
    $conn->query("ALTER TABLE `student_course_progress` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $student_id = $_GET['student_id'] ?? null;
        $course_id = $_GET['course_id'] ?? null;

        if ($student_id && $course_id) {
            $stmt = $conn->prepare("SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as student_name, u.email as student_email FROM student_course_progress p INNER JOIN users u ON p.student_id COLLATE utf8mb4_unicode_ci = u.id WHERE p.student_id = ? AND p.course_id = ? AND u.email != 'student@example.com'");
            if ($stmt) {
                $stmt->bind_param("ss", $student_id, $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res->fetch_assoc();
                $stmt->close();

                if ($row) {
                    $completed_ids = json_decode($row['completed_lesson_ids'], true) ?? [];
                    echo json_encode([
                        "success" => true,
                        "data" => [
                            "id" => $row['id'],
                            "studentId" => $row['student_id'],
                            "courseId" => $row['course_id'],
                            "completedLessonIds" => $completed_ids,
                            "lastLessonId" => $row['last_lesson_id'],
                            "progressPercent" => (int)$row['progress_percent'],
                            "updatedAt" => $row['updated_at'],
                            "studentName" => $row['student_name'] ?? 'Enrolled Student',
                            "studentEmail" => $row['student_email'] ?? 'student@example.com'
                        ]
                    ]);
                    exit();
                }
            }
            echo json_encode(["success" => true, "data" => null]);
            exit();
        }

        // If only course_id is provided, get all student progress for that course (excluding mock users)
        if ($course_id) {
            $stmt = $conn->prepare("SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as student_name, u.email as student_email FROM student_course_progress p INNER JOIN users u ON p.student_id COLLATE utf8mb4_unicode_ci = u.id WHERE p.course_id = ? AND u.email != 'student@example.com' ORDER BY p.updated_at DESC");
            if ($stmt) {
                $stmt->bind_param("s", $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $rows = [];
                while ($row = $res->fetch_assoc()) {
                    $rows[] = [
                        "id" => $row['id'],
                        "studentId" => $row['student_id'],
                        "courseId" => $row['course_id'],
                        "completedLessonIds" => json_decode($row['completed_lesson_ids'], true) ?? [],
                        "lastLessonId" => $row['last_lesson_id'],
                        "progressPercent" => (int)$row['progress_percent'],
                        "updatedAt" => $row['updated_at'],
                        "studentName" => $row['student_name'],
                        "studentEmail" => $row['student_email']
                    ];
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $rows]);
                exit();
            }
        }

        // If only student_id is provided, get all progress records for that student
        if ($student_id) {
            $stmt = $conn->prepare("SELECT p.*, c.title as course_title FROM student_course_progress p INNER JOIN users u ON p.student_id COLLATE utf8mb4_unicode_ci = u.id LEFT JOIN courses c ON p.course_id COLLATE utf8mb4_unicode_ci = c.id WHERE p.student_id = ? AND u.email != 'student@example.com' ORDER BY p.updated_at DESC");
            if ($stmt) {
                $stmt->bind_param("s", $student_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $rows = [];
                while ($row = $res->fetch_assoc()) {
                    $rows[] = [
                        "id" => $row['id'],
                        "studentId" => $row['student_id'],
                        "courseId" => $row['course_id'],
                        "completedLessonIds" => json_decode($row['completed_lesson_ids'], true) ?? [],
                        "lastLessonId" => $row['last_lesson_id'],
                        "progressPercent" => (int)$row['progress_percent'],
                        "updatedAt" => $row['updated_at'],
                        "courseTitle" => $row['course_title'] ?? 'Selected Course'
                    ];
                }
                $stmt->close();
                echo json_encode(["success" => true, "data" => $rows]);
                exit();
            }
        }

        // Return all rows if no filter is applied (excluding mock users)
        $res = $conn->query("SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as student_name, u.email as student_email, c.title as course_title FROM student_course_progress p INNER JOIN users u ON p.student_id COLLATE utf8mb4_unicode_ci = u.id LEFT JOIN courses c ON p.course_id COLLATE utf8mb4_unicode_ci = c.id WHERE u.email != 'student@example.com' ORDER BY p.updated_at DESC");
        $rows = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $rows[] = [
                    "id" => $row['id'],
                    "studentId" => $row['student_id'],
                    "courseId" => $row['course_id'],
                    "completedLessonIds" => json_decode($row['completed_lesson_ids'], true) ?? [],
                    "lastLessonId" => $row['last_lesson_id'],
                    "progressPercent" => (int)$row['progress_percent'],
                    "updatedAt" => $row['updated_at'],
                    "studentName" => $row['student_name'],
                    "studentEmail" => $row['student_email'],
                    "courseTitle" => $row['course_title'] ?? 'Course'
                ];
            }
        }
        echo json_encode(["success" => true, "data" => $rows]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $student_id = $data['studentId'] ?? ($data['student_id'] ?? null);
        $course_id = $data['courseId'] ?? ($data['course_id'] ?? null);

        if (!$student_id || !$course_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "studentId and courseId are required"]);
            exit();
        }

        $id = $data['id'] ?? ("prog_" . $student_id . "_" . $course_id);
        $completed_lesson_ids = json_encode($data['completedLessonIds'] ?? ($data['completed_lesson_ids'] ?? []));
        $last_lesson_id = $data['lastLessonId'] ?? ($data['last_lesson_id'] ?? null);
        $progress_percent = intval($data['progressPercent'] ?? ($data['progress_percent'] ?? 0));

        $stmt = $conn->prepare("INSERT INTO student_course_progress (id, student_id, course_id, completed_lesson_ids, last_lesson_id, progress_percent) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE completed_lesson_ids = VALUES(completed_lesson_ids), last_lesson_id = VALUES(last_lesson_id), progress_percent = VALUES(progress_percent), updated_at = NOW()");
        if ($stmt) {
            $stmt->bind_param("sssssi", $id, $student_id, $course_id, $completed_lesson_ids, $last_lesson_id, $progress_percent);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Student progress saved successfully",
            "data" => [
                "id" => $id,
                "studentId" => $student_id,
                "courseId" => $course_id,
                "completedLessonIds" => json_decode($completed_lesson_ids, true),
                "lastLessonId" => $last_lesson_id,
                "progressPercent" => $progress_percent
            ]
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
