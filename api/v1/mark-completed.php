<?php
require_once __DIR__ . '/cors.php';
/**
 * Mark Course Completed API
 * Path: /api/v1/mark-completed.php
 * Endpoint for recording student course completion and issuing certificates.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Ensure course_progress table exists
    $conn->query("CREATE TABLE IF NOT EXISTS `course_progress` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `student_id` VARCHAR(100) NOT NULL,
        `course_id` VARCHAR(100) NOT NULL,
        `status` VARCHAR(50) DEFAULT 'completed',
        `completed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `student_course` (`student_id`, `course_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Ensure certificates table exists
    $conn->query("CREATE TABLE IF NOT EXISTS `certificates` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `credential_id` VARCHAR(100) NOT NULL UNIQUE,
        `student_id` VARCHAR(100) NOT NULL,
        `student_name` VARCHAR(255) NOT NULL,
        `course_id` VARCHAR(100) NOT NULL,
        `course_title` VARCHAR(255) NOT NULL,
        `completion_date` VARCHAR(100) NOT NULL,
        `instructor_name` VARCHAR(255) DEFAULT 'Sir Rajab Wamuu',
        `instructor_signature` TEXT DEFAULT NULL,
        `grade` VARCHAR(100) DEFAULT 'Excellence (100%)',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    $student_id = $data['student_id'] ?? ($data['studentId'] ?? ($_GET['student_id'] ?? 'current-user'));
    $course_id = $data['course_id'] ?? ($data['courseId'] ?? ($_GET['course_id'] ?? 'c-1'));
    $student_name = $data['student_name'] ?? ($data['studentName'] ?? ($_GET['student_name'] ?? 'Student'));
    $course_title = $data['course_title'] ?? ($data['courseTitle'] ?? ($_GET['course_title'] ?? 'Course'));
    $instructor_name = $data['instructor_name'] ?? ($data['instructorName'] ?? ($_GET['instructor_name'] ?? 'Instructor'));

    if ($method === 'POST' || $method === 'GET') {
        // 1. Record progress as completed
        $progress_id = 'prog-' . md5($student_id . '-' . $course_id);
        $stmt_prog = $conn->prepare("INSERT INTO course_progress (id, student_id, course_id, status, completed_at) VALUES (?, ?, ?, 'completed', NOW()) ON DUPLICATE KEY UPDATE status = 'completed', completed_at = NOW()");
        if ($stmt_prog) {
            $stmt_prog->bind_param("sss", $progress_id, $student_id, $course_id);
            @$stmt_prog->execute();
            $stmt_prog->close();
        }

        // 2. Check or create certificate record
        $stmt_chk = $conn->prepare("SELECT * FROM certificates WHERE student_id = ? AND course_id = ?");
        $cert = null;
        if ($stmt_chk) {
            $stmt_chk->bind_param("ss", $student_id, $course_id);
            $stmt_chk->execute();
            $res = $stmt_chk->get_result();
            $cert = $res->fetch_assoc();
            $stmt_chk->close();
        }

        if (!$cert) {
            $today = date('F j, Y');
            $clean_cid = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $course_id), 0, 4));
            if (!$clean_cid) { $clean_cid = 'UQL'; }
            $credId = 'UQL-' . $clean_cid . '-' . date('Y') . '-' . rand(1000, 9999);
            $cert_id = uniqid('cert-');
            $grade = 'Excellence (100%)';

            $stmt_ins = $conn->prepare("INSERT INTO certificates (id, credential_id, student_id, student_name, course_id, course_title, completion_date, instructor_name, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmt_ins) {
                $stmt_ins->bind_param("sssssssss", $cert_id, $credId, $student_id, $student_name, $course_id, $course_title, $today, $instructor_name, $grade);
                @$stmt_ins->execute();
                $stmt_ins->close();
            }

            $cert = [
                "id" => $cert_id,
                "credentialId" => $credId,
                "studentId" => $student_id,
                "studentName" => $student_name,
                "courseId" => $course_id,
                "courseTitle" => $course_title,
                "completionDate" => $today,
                "instructorName" => $instructor_name,
                "grade" => $grade
            ];
        } else {
            $cert = [
                "id" => $cert['id'],
                "credentialId" => $cert['credential_id'],
                "studentId" => $cert['student_id'],
                "studentName" => $cert['student_name'],
                "courseId" => $cert['course_id'],
                "courseTitle" => $cert['course_title'],
                "completionDate" => $cert['completion_date'],
                "instructorName" => $cert['instructor_name'],
                "grade" => $cert['grade']
            ];
        }

        echo json_encode([
            "success" => true,
            "message" => "Course marked as completed successfully!",
            "certificate" => $cert
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
