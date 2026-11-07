<?php
require_once __DIR__ . '/cors.php';
/**
 * Reviewer Chat & Messages API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/reviewer-chat.php
 */

date_default_timezone_set('Africa/Nairobi');
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create table if it doesn't exist
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS `reviewer_chat_messages` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `course_id` VARCHAR(100) NOT NULL,
            `sender_role` VARCHAR(50) DEFAULT 'reviewer',
            `recipient` VARCHAR(255) DEFAULT '',
            `message` LONGTEXT NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_course_id (`course_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    if (!$conn->query($createTableSql)) {
        throw new Exception("Failed to ensure database table: " . $conn->error);
    }

    @$conn->query("ALTER TABLE `reviewer_chat_messages` MODIFY COLUMN `message` LONGTEXT NOT NULL;");

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // GET: Retrieve messages for a course
    // =========================================================================
    if ($method === 'GET') {
        $courseId = isset($_GET['course_id']) ? trim($_GET['course_id']) : (isset($_GET['courseId']) ? trim($_GET['courseId']) : '');

        if (empty($courseId)) {
            // Return all messages if course_id is not specified
            $result = $conn->query("SELECT * FROM `reviewer_chat_messages` ORDER BY `created_at` ASC");
            $messages = [];
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $messages[] = [
                        "id" => $row['id'],
                        "courseId" => $row['course_id'],
                        "course_id" => $row['course_id'],
                        "sender_role" => $row['sender_role'],
                        "senderRole" => $row['sender_role'],
                        "recipient" => $row['recipient'],
                        "message" => $row['message'],
                        "created_at" => $row['created_at']
                    ];
                }
            }
            echo json_encode([
                "success" => true,
                "messages" => $messages
            ]);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM `reviewer_chat_messages` WHERE `course_id` = ? ORDER BY `created_at` ASC");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        $stmt->bind_param("s", $courseId);
        $stmt->execute();
        $result = $stmt->get_result();
        $messages = [];
        while ($row = $result->fetch_assoc()) {
            $messages[] = [
                "id" => $row['id'],
                "courseId" => $row['course_id'],
                "course_id" => $row['course_id'],
                "sender_role" => $row['sender_role'],
                "senderRole" => $row['sender_role'],
                "recipient" => $row['recipient'],
                "message" => $row['message'],
                "created_at" => $row['created_at']
            ];
        }

        echo json_encode([
            "success" => true,
            "messages" => $messages,
            "data" => $messages
        ]);
        $stmt->close();
        exit();
    }

    // =========================================================================
    // POST: Send a new message
    // =========================================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $courseId = isset($input['course_id']) ? trim($input['course_id']) : (isset($input['courseId']) ? trim($input['courseId']) : '');
        $senderRole = isset($input['sender_role']) ? trim($input['sender_role']) : (isset($input['senderRole']) ? trim($input['senderRole']) : 'reviewer');
        $recipient = isset($input['recipient']) ? trim($input['recipient']) : '';
        $message = isset($input['message']) ? trim($input['message']) : '';

        if (empty($courseId) || empty($message)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing course_id or message parameter."
            ]);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO `reviewer_chat_messages` (`course_id`, `sender_role`, `recipient`, `message`, `created_at`) VALUES (?, ?, ?, ?, NOW())");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("ssss", $courseId, $senderRole, $recipient, $message);
        $stmt->execute();
        $insertId = $conn->insert_id;
        $stmt->close();

        echo json_encode([
            "success" => true,
            "message" => "Message sent successfully",
            "data" => [
                "id" => $insertId,
                "course_id" => $courseId,
                "sender_role" => $senderRole,
                "recipient" => $recipient,
                "message" => $message,
                "created_at" => date('Y-m-d H:i:s')
            ]
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal server error: " . $e->getMessage()
    ]);
}
?>
