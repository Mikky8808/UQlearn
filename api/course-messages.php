<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Messages API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/course-messages.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create table if it doesn't exist
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS `course_messages` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `course_id` VARCHAR(100) NOT NULL UNIQUE,
            `welcome_message` TEXT NULL,
            `congratulations_message` TEXT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_course_id (`course_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($createTableSql)) {
        throw new Exception("Failed to ensure database table: " . $conn->error);
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // GET: Retrieve Course Messages for a Course
    // =========================================================================
    if ($method === 'GET') {
        $courseId = isset($_GET['course_id']) ? trim($_GET['course_id']) : (isset($_GET['courseId']) ? trim($_GET['courseId']) : '');

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing course_id parameter."
            ]);
            exit();
        }

        $stmt = $conn->prepare("SELECT `welcome_message`, `congratulations_message` FROM `course_messages` WHERE `course_id` = ? LIMIT 1");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        $stmt->bind_param("s", $courseId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        echo json_encode([
            "success" => true,
            "data" => [
                "welcome_message" => $row['welcome_message'] ?? '',
                "congratulations_message" => $row['congratulations_message'] ?? ''
            ]
        ]);
        $stmt->close();
        exit();
    }

    // =========================================================================
    // POST: Save or Update Course Messages for a Course
    // =========================================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            $input = $_POST;
        }

        $courseId = isset($input['course_id']) ? trim($input['course_id']) : (isset($input['courseId']) ? trim($input['courseId']) : '');
        $welcomeMessage = isset($input['welcome_message']) ? trim($input['welcome_message']) : '';
        $congratulationsMessage = isset($input['congratulations_message']) ? trim($input['congratulations_message']) : '';

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing course_id parameter."
            ]);
            exit();
        }

        $stmt = $conn->prepare("
            INSERT INTO `course_messages` (`course_id`, `welcome_message`, `congratulations_message`)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                `welcome_message` = VALUES(`welcome_message`),
                `congratulations_message` = VALUES(`congratulations_message`)
        ");

        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        $stmt->bind_param("sss", $courseId, $welcomeMessage, $congratulationsMessage);

        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        echo json_encode([
            "success" => true,
            "message" => "Course messages saved successfully."
        ]);

        $stmt->close();
        exit();
    }

    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server Error: " . $e->getMessage()
    ]);
}
?>
