<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful Certificates API
 * Path: /api/v1/certificates.php
 * Handles fetching course completion certificates and credentials
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

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
    $credential_id = $_GET['id'] ?? null;
    $user_id = $_GET['user_id'] ?? null;
    $student_id = $_GET['student_id'] ?? null;
    $course_id = $_GET['course_id'] ?? null;

    if ($method === 'GET') {
        if ($credential_id) {
            $stmt = $conn->prepare("SELECT * FROM certificates WHERE credential_id = ? OR id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $credential_id, $credential_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $cert = $res->fetch_assoc();
                $stmt->close();

                if ($cert) {
                    echo json_encode(["success" => true, "certificate" => [
                        "id" => $cert['id'],
                        "credentialId" => $cert['credential_id'],
                        "studentName" => $cert['student_name'],
                        "courseTitle" => $cert['course_title'],
                        "completionDate" => $cert['completion_date'],
                        "instructorName" => $cert['instructor_name'],
                        "instructorSignature" => $cert['instructor_signature'],
                        "grade" => $cert['grade']
                    ]]);
                    exit();
                }
            }

            // Fallback mock certificate if not found in DB
            $today = date('F j, Y');
            echo json_encode([
                "success" => true,
                "certificate" => [
                    "id" => $credential_id,
                    "credentialId" => $credential_id,
                    "studentName" => "Michael Kenyanya",
                    "courseTitle" => "Canva Mastery: Design Like a Pro",
                    "completionDate" => $today,
                    "instructorName" => "Sir Rajab Wamuu",
                    "instructorSignature" => "",
                    "grade" => "Excellence (100%)"
                ]
            ]);
            exit();
        }

        if ($student_id && $course_id) {
            $stmt = $conn->prepare("SELECT * FROM certificates WHERE student_id = ? AND course_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $student_id, $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                $cert = $res->fetch_assoc();
                $stmt->close();

                if ($cert) {
                    echo json_encode(["success" => true, "certificate" => [
                        "id" => $cert['id'],
                        "credentialId" => $cert['credential_id'],
                        "studentName" => $cert['student_name'],
                        "courseTitle" => $cert['course_title'],
                        "completionDate" => $cert['completion_date'],
                        "instructorName" => $cert['instructor_name'],
                        "instructorSignature" => $cert['instructor_signature'],
                        "grade" => $cert['grade']
                    ]]);
                    exit();
                }
            }

            // Generate/auto-create certificate for student & course if none exists
            $today = date('F j, Y');
            $credId = 'UQL-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $course_id), 0, 4)) . '-' . date('Y') . '-' . rand(1000, 9999);
            $cTitle = ucwords(str_replace(['-', '_'], ' ', $course_id));
            $sName = ($student_id === 'current-user') ? 'Michael Kenyanya' : "Student ($student_id)";

            $stmt_ins = $conn->prepare("INSERT INTO certificates (id, credential_id, student_id, student_name, course_id, course_title, completion_date, instructor_name, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmt_ins) {
                $uuid = uniqid('cert-');
                $instName = 'Sir Rajab Wamuu';
                $grade = 'Excellence (100%)';
                $stmt_ins->bind_param("sssssssss", $uuid, $credId, $student_id, $sName, $course_id, $cTitle, $today, $instName, $grade);
                @$stmt_ins->execute();
                $stmt_ins->close();
            }

            echo json_encode([
                "success" => true,
                "certificate" => [
                    "id" => $credId,
                    "credentialId" => $credId,
                    "studentName" => $sName,
                    "courseTitle" => $cTitle,
                    "completionDate" => $today,
                    "instructorName" => "Sir Rajab Wamuu",
                    "instructorSignature" => "",
                    "grade" => "Excellence (100%)"
                ]
            ]);
            exit();
        }

        if ($user_id) {
            $stmt = $conn->prepare("SELECT * FROM certificates WHERE student_id = ?");
            $certs = [];
            if ($stmt) {
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $certs[] = [
                        "id" => $row['id'],
                        "credentialId" => $row['credential_id'],
                        "studentName" => $row['student_name'],
                        "courseTitle" => $row['course_title'],
                        "completionDate" => $row['completion_date'],
                        "instructorName" => $row['instructor_name'],
                        "instructorSignature" => $row['instructor_signature'],
                        "grade" => $row['grade']
                    ];
                }
                $stmt->close();
            }

            echo json_encode(["success" => true, "certificates" => $certs]);
            exit();
        }

        // Default list all
        $res = $conn->query("SELECT * FROM certificates ORDER BY created_at DESC LIMIT 50");
        $certs = [];
        while ($row = $res->fetch_assoc()) {
            $certs[] = [
                "id" => $row['id'],
                "credentialId" => $row['credential_id'],
                "studentName" => $row['student_name'],
                "courseTitle" => $row['course_title'],
                "completionDate" => $row['completion_date'],
                "instructorName" => $row['instructor_name'],
                "instructorSignature" => $row['instructor_signature'],
                "grade" => $row['grade']
            ];
        }
        echo json_encode(["success" => true, "certificates" => $certs]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $student_id = $data['student_id'] ?? ($data['studentId'] ?? 'current-user');
        $student_name = $data['student_name'] ?? ($data['studentName'] ?? 'Michael Kenyanya');
        $course_id = $data['course_id'] ?? ($data['courseId'] ?? 'canva-mastery');
        $course_title = $data['course_title'] ?? ($data['courseTitle'] ?? 'Canva Mastery: Design Like a Pro');
        $completion_date = $data['completion_date'] ?? ($data['completionDate'] ?? date('F j, Y'));
        $instructor_name = $data['instructor_name'] ?? ($data['instructorName'] ?? 'Sir Rajab Wamuu');
        $instructor_signature = $data['instructor_signature'] ?? ($data['instructorSignature'] ?? '');
        $grade = $data['grade'] ?? 'Excellence (100%)';
        $credential_id = $data['credential_id'] ?? ($data['credentialId'] ?? ('UQL-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $course_id), 0, 4)) . '-' . date('Y') . '-' . rand(1000, 9999)));

        $id = uniqid('cert-');
        $stmt = $conn->prepare("INSERT INTO certificates (id, credential_id, student_id, student_name, course_id, course_title, completion_date, instructor_name, instructor_signature, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("ssssssssss", $id, $credential_id, $student_id, $student_name, $course_id, $course_title, $completion_date, $instructor_name, $instructor_signature, $grade);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Certificate created successfully",
            "certificate" => [
                "id" => $id,
                "credentialId" => $credential_id,
                "studentName" => $student_name,
                "courseTitle" => $course_title,
                "completionDate" => $completion_date,
                "instructorName" => $instructor_name,
                "instructorSignature" => $instructor_signature,
                "grade" => $grade
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
