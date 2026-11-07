<?php
require_once __DIR__ . '/cors.php';
/**
 * Intended Learners API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/intended-learners.php
 * Table: course_intended_learners
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
    
    if (isset($conn) && $conn instanceof mysqli) {
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to ensure database table: " . $conn->error);
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // POST: Store/Update Intended Learners for a course
    // =========================================================================
    if ($method === 'POST' || $method === 'PUT') {
        // Read input JSON
        $input = json_decode(file_get_contents('php://input'), true);
        
        $courseId = '';
        if (!empty($input['courseId'])) $courseId = trim((string)$input['courseId']);
        elseif (!empty($input['course_id'])) $courseId = trim((string)$input['course_id']);
        elseif (!empty($input['id'])) $courseId = trim((string)$input['id']);
        
        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing courseId parameter."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Extract objectives, requirements, and target learners arrays with flexible key names
        $objectives = [];
        if (!empty($input['learning_objectives']) && is_array($input['learning_objectives'])) $objectives = $input['learning_objectives'];
        elseif (!empty($input['learningObjectives']) && is_array($input['learningObjectives'])) $objectives = $input['learningObjectives'];
        elseif (!empty($input['objectives']) && is_array($input['objectives'])) $objectives = $input['objectives'];

        $requirements = [];
        if (!empty($input['requirements']) && is_array($input['requirements'])) $requirements = $input['requirements'];
        elseif (!empty($input['courseRequirements']) && is_array($input['courseRequirements'])) $requirements = $input['courseRequirements'];
        elseif (!empty($input['course_requirements']) && is_array($input['course_requirements'])) $requirements = $input['course_requirements'];

        $targets = [];
        if (!empty($input['target_learners']) && is_array($input['target_learners'])) $targets = $input['target_learners'];
        elseif (!empty($input['targetLearners']) && is_array($input['targetLearners'])) $targets = $input['targetLearners'];
        elseif (!empty($input['targets']) && is_array($input['targets'])) $targets = $input['targets'];
        elseif (!empty($input['learners']) && is_array($input['learners'])) $targets = $input['learners'];

        // Begin transaction
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->begin_transaction();

            try {
                // Delete existing records for this course to write fresh ones
                $safeCourseId = $conn->real_escape_string($courseId);
                $deleteSql = "DELETE FROM `course_intended_learners` WHERE `course_id` = '$safeCourseId'";
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
                    $cleanText = trim((string)$obj);
                    if ($cleanText !== '') {
                        $type = 'objective';
                        $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $order);
                        $insertStmt->execute();
                        $order++;
                    }
                }

                // Insert Requirements
                $orderReq = 0;
                foreach ($requirements as $req) {
                    $cleanText = trim((string)$req);
                    if ($cleanText !== '') {
                        $type = 'requirement';
                        $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $orderReq);
                        $insertStmt->execute();
                        $orderReq++;
                    }
                }

                // Insert Target Learners
                $orderTar = 0;
                foreach ($targets as $tar) {
                    $cleanText = trim((string)$tar);
                    if ($cleanText !== '') {
                        $type = 'target';
                        $insertStmt->bind_param("sssi", $courseId, $type, $cleanText, $orderTar);
                        $insertStmt->execute();
                        $orderTar++;
                    }
                }

                $insertStmt->close();
                $conn->commit();

            } catch (Exception $txEx) {
                $conn->rollback();
                throw $txEx;
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Intended learners stored and synchronized successfully.",
            "courseId" => $courseId,
            "counts" => [
                "objectives" => count(array_filter($objectives)),
                "requirements" => count(array_filter($requirements)),
                "target_learners" => count(array_filter($targets))
            ],
            "data" => [
                "learning_objectives" => array_values(array_filter(array_map('trim', $objectives))),
                "requirements" => array_values(array_filter(array_map('trim', $requirements))),
                "target_learners" => array_values(array_filter(array_map('trim', $targets)))
            ]
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // =========================================================================
    // GET: Fetch Intended Learners by courseId or course_id
    // =========================================================================
    if ($method === 'GET') {
        $courseId = '';
        if (!empty($_GET['courseId'])) $courseId = trim((string)$_GET['courseId']);
        elseif (!empty($_GET['course_id'])) $courseId = trim((string)$_GET['course_id']);
        elseif (!empty($_GET['course_ID'])) $courseId = trim((string)$_GET['course_ID']);
        elseif (!empty($_GET['id'])) $courseId = trim((string)$_GET['id']);

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Bad Request: Missing courseId parameter."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $objectives = [];
        $requirements = [];
        $targets = [];

        if (isset($conn) && $conn instanceof mysqli) {
            $stmt = $conn->prepare("SELECT `type`, `text_value` FROM `course_intended_learners` WHERE `course_id` = ? ORDER BY `sort_order` ASC, `id` ASC");
            if ($stmt) {
                $stmt->bind_param("s", $courseId);
                $stmt->execute();
                $result = $stmt->get_result();

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
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "courseId" => $courseId,
            "course_id" => $courseId,
            "data" => [
                "learning_objectives" => $objectives,
                "requirements" => $requirements,
                "target_learners" => $targets,
                "learningObjectives" => $objectives,
                "targetLearners" => $targets
            ],
            // Dual compatibility properties
            "learning_objectives" => $objectives,
            "learningObjectives" => $objectives,
            "requirements" => $requirements,
            "target_learners" => $targets,
            "targetLearners" => $targets,
            "learners" => $targets
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // Fallback for unsupported methods
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}
?>
