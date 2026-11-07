<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for Course Description Checklist Audits
 * Shared Hosting Compatible (PHP 7.4+)
 * Path: /api/v2/course-description-checklist.php
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create table course_description_checklists if it doesn't exist
    $createTableQuery = "CREATE TABLE IF NOT EXISTS `course_description_checklists` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `course_id` VARCHAR(128) NOT NULL UNIQUE,
        `checklist` LONGTEXT NOT NULL,
        `met_count` INT DEFAULT 0,
        `not_met_count` INT DEFAULT 0,
        `not_met_items` LONGTEXT DEFAULT NULL,
        `reviewer_id` VARCHAR(128) DEFAULT NULL,
        `reviewer_email` VARCHAR(255) DEFAULT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    @$conn->query($createTableQuery);

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];
    if (empty($data)) {
        $data = array_merge($_GET, $_POST);
    }

    $course_id = $_GET['course_id'] ?? $_GET['courseId'] ?? $data['course_id'] ?? $data['courseId'] ?? null;

    if ($method === 'GET') {
        if (empty($course_id)) {
            echo json_encode([
                "success" => false,
                "message" => "Missing required course_id parameter."
            ]);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM `course_description_checklists` WHERE `course_id` = ? LIMIT 1");
        $stmt->bind_param("s", $course_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            $checklistData = json_decode($row['checklist'], true) ?? [];
            $notMetItemsData = json_decode($row['not_met_items'], true) ?? [];

            echo json_encode([
                "success" => true,
                "course_id" => $row['course_id'],
                "met_count" => (int)$row['met_count'],
                "not_met_count" => (int)$row['not_met_count'],
                "checklist" => $checklistData,
                "not_met_items" => $notMetItemsData,
                "updated_at" => $row['updated_at']
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "course_id" => $course_id,
                "checklist" => [],
                "met_count" => 0,
                "not_met_count" => 0,
                "not_met_items" => []
            ]);
        }
        exit();
    }

    if ($method === 'POST') {
        if (empty($course_id)) {
            echo json_encode([
                "success" => false,
                "message" => "Missing course_id in request body."
            ]);
            exit();
        }

        $checklistArray = $data['checklist'] ?? [];
        $checklistJson = json_encode($checklistArray, JSON_UNESCAPED_UNICODE);

        $met_count = isset($data['met_count']) ? (int)$data['met_count'] : 0;
        $not_met_count = isset($data['not_met_count']) ? (int)$data['not_met_count'] : 0;
        
        $notMetItemsArray = $data['not_met_items'] ?? [];
        $notMetItemsJson = json_encode($notMetItemsArray, JSON_UNESCAPED_UNICODE);

        $reviewer_id = $data['reviewer_id'] ?? $data['reviewerId'] ?? null;
        $reviewer_email = $data['reviewer_email'] ?? $data['reviewerEmail'] ?? null;

        // Upsert query into course_description_checklists
        $upsertQuery = "INSERT INTO `course_description_checklists` 
            (`course_id`, `checklist`, `met_count`, `not_met_count`, `not_met_items`, `reviewer_id`, `reviewer_email`, `updated_at`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
            `checklist` = VALUES(`checklist`), 
            `met_count` = VALUES(`met_count`), 
            `not_met_count` = VALUES(`not_met_count`), 
            `not_met_items` = VALUES(`not_met_items`), 
            `reviewer_id` = COALESCE(VALUES(`reviewer_id`), `reviewer_id`), 
            `reviewer_email` = COALESCE(VALUES(`reviewer_email`), `reviewer_email`), 
            `updated_at` = NOW()";

        $stmt = $conn->prepare($upsertQuery);
        $stmt->bind_param("ssiisss", $course_id, $checklistJson, $met_count, $not_met_count, $notMetItemsJson, $reviewer_id, $reviewer_email);
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Course description checklist audit saved successfully.",
                "course_id" => $course_id,
                "met_count" => $met_count,
                "not_met_count" => $not_met_count,
                "updated_at" => date('Y-m-d H:i:s')
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Failed to save checklist audit: " . $stmt->error
            ]);
        }
        exit();
    }

    echo json_encode([
        "success" => false,
        "message" => "Unsupported HTTP method: $method"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>
