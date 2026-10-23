<?php
require_once __DIR__ . '/cors.php';
/**
 * Intended Learners API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/intended-learners.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create the table on run if it doesn't exist
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS `course_intended_learners` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `course_id` VARCHAR(100) NOT NULL,
            `type` ENUM('objective', 'requirement', 'target') NOT NULL,
            `text_value` TEXT NOT NULL,
            `sort_order` INT DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_course_id (`course_id`),
            INDEX idx_type (`type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    if (!$conn->query($createTableSql)) {
        throw new Exception("Failed to ensure database table: " . $conn->error);
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // POST: Store/Update Intended Learners for a course
    // =========================================================================
    if ($method === 'POST') {
        // Read input JSON
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['courseId'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing courseId."
            ]);
            exit();
        }

        $courseId = $conn->real_escape_string(trim($input['courseId']));
        
        // Extract objectives, requirements, and target learners arrays
        $objectives = isset($input['learning_objectives']) && is_array($input['learning_objectives']) ? $input['learning_objectives'] : [];
        $requirements = isset($input['requirements']) && is_array($input['requirements']) ? $input['requirements'] : [];
        $targets = isset($input['target_learners']) && is_array($input['target_learners']) ? $input['target_learners'] : [];

        // Begin transaction
        $conn->begin_transaction();

        try {
            // Delete existing records for this course to write fresh ones
            $deleteSql = "DELETE FROM `course_intended_learners` WHERE `course_id` = '$courseId'";
            if (!$conn->query($deleteSql)) {
                throw new Exception("Error removing old intended learners: " . $conn->error);
            }

            // Prepared statement for fast, safe insertion
            $insertStmt = $conn->prepare("INSERT INTO `course_intended_learners` (`course_id`, `type`, `text_value`, `sort_order`) VALUES (?, ?, ?, ?)");
            if (!$insertStmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }

            // Insert Objectives
            $order = 0;
            foreach ($objectives as $obj) {
                $cleanText = trim($obj);
                if ($cleanText !== '') {
                    $type = 'objective';
                    $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $order);
                    $insertStmt->execute();
                    $order++;
                }
            }

            // Insert Requirements
            $order = 0;
            foreach ($requirements as $req) {
                $cleanText = trim($req);
                if ($cleanText !== '') {
                    $type = 'requirement';
                    $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $order);
                    $insertStmt->execute();
                    $order++;
                }
            }

            // Insert Target Learners
            $order = 0;
            foreach ($targets as $tar) {
                $cleanText = trim($tar);
                if ($cleanText !== '') {
                    $type = 'target';
                    $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $order);
                    $insertStmt->execute();
                    $order++;
                }
            }

            $insertStmt->close();
            $conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Intended learners stored and synchronized successfully.",
                "courseId" => $courseId,
                "counts" => [
                    "objectives" => $order,
                    "requirements" => count(array_filter($requirements)),
                    "target_learners" => count(array_filter($targets))
                ]
            ]);

        } catch (Exception $txEx) {
            $conn->rollback();
            throw $txEx;
        }
        exit();
    }

    // =========================================================================
    // GET: Fetch Intended Learners by courseId
    // =========================================================================
    if ($method === 'GET') {
        if (!isset($_GET['courseId']) || empty($_GET['courseId'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing courseId parameter."
            ]);
            exit();
        }

        $courseId = $conn->real_escape_string(trim($_GET['courseId']));

        $query = "SELECT `type`, `text_value` FROM `course_intended_learners` WHERE `course_id` = '$courseId' ORDER BY `type`, `sort_order` ASC";
        $result = $conn->query($query);

        $objectives = [];
        $requirements = [];
        $targets = [];

        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                if ($row['type'] === 'objective') {
                    $objectives[] = $row['text_value'];
                } elseif ($row['type'] === 'requirement') {
                    $requirements[] = $row['text_value'];
                } elseif ($row['type'] === 'target') {
                    $targets[] = $row['text_value'];
                }
            }
        }

        echo json_encode([
            "success" => true,
            "courseId" => $courseId,
            "data" => [
                "learning_objectives" => $objectives,
                "requirements" => $requirements,
                "target_learners" => $targets
            ]
        ]);
        exit();
    }

    // Fallback for unsupported methods
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
