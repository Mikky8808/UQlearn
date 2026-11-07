<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API to Assign Reviewers to Courses
 * Path: /api/v2/assign-reviewer.php
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed. Use POST."]);
        exit;
    }

    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];
    if (empty($data)) {
        $data = array_merge($_GET, $_POST);
    }

    $course_id = isset($data['course_id']) ? trim($data['course_id']) : (isset($data['courseId']) ? trim($data['courseId']) : '');

    if (empty($course_id)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Missing required parameter: course_id"
        ]);
        exit;
    }

    // Safe Schema Initialization for assignments
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `reviewer_assignments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `course_id` VARCHAR(64) NOT NULL,
            `reviewer_id` VARCHAR(64) NOT NULL,
            `reviewer_name` VARCHAR(255) NOT NULL,
            `reviewer_email` VARCHAR(255) DEFAULT NULL,
            `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_course_reviewer` (`course_id`, `reviewer_id`),
            INDEX `idx_course_id` (`course_id`),
            INDEX `idx_reviewer_id` (`reviewer_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Self-healing migration to ensure reviewer_email is nullable if table already existed
        @$conn->query("ALTER TABLE `reviewer_assignments` MODIFY COLUMN `reviewer_email` VARCHAR(255) DEFAULT NULL");

        $cols = [
            'assigned_reviewer_id' => "TEXT DEFAULT NULL",
            'assigned_reviewer_name' => "TEXT DEFAULT NULL",
            'assigned_reviewer_email' => "TEXT DEFAULT NULL"
        ];
        foreach ($cols as $col => $definition) {
            $checkCol = $conn->query("SHOW COLUMNS FROM `courses` LIKE '$col'");
            if ($checkCol && $checkCol->num_rows === 0) {
                $conn->query("ALTER TABLE `courses` ADD COLUMN `$col` $definition");
            }
        }
    } catch (\Throwable $schemaErr) {}

    // Support both multi-reviewer list and single reviewer
    $reviewers = [];
    if (isset($data['reviewers']) && is_array($data['reviewers'])) {
        $reviewers = $data['reviewers'];
    } elseif (isset($data['reviewer_id']) || isset($data['reviewerId'])) {
        $r_id = trim($data['reviewer_id'] ?? $data['reviewerId'] ?? '');
        if (!empty($r_id)) {
            $reviewers[] = [
                'id' => $r_id,
                'name' => trim($data['reviewer_name'] ?? $data['reviewerName'] ?? ''),
                'email' => trim($data['reviewer_email'] ?? $data['reviewerEmail'] ?? '')
            ];
        }
    }

    // Begin transaction
    $conn->begin_transaction();

    try {
        // A. Clean out obsolete assignments
        $deleteStmt = $conn->prepare("DELETE FROM reviewer_assignments WHERE course_id = ?");
        if ($deleteStmt) {
            $deleteStmt->bind_param("s", $course_id);
            $deleteStmt->execute();
            $deleteStmt->close();
        }

        // Keep lists for courses metadata sync
        $reviewer_ids = [];
        $reviewer_names = [];
        $reviewer_emails = [];

        // B. Add new assignments
        if (!empty($reviewers)) {
            $insertStmt = $conn->prepare("INSERT INTO reviewer_assignments (course_id, reviewer_id, reviewer_name, reviewer_email) VALUES (?, ?, ?, ?)");
            if ($insertStmt) {
                foreach ($reviewers as $reviewer) {
                    $r_id = trim($reviewer['id'] ?? '');
                    $r_name = trim($reviewer['name'] ?? '');
                    $r_email = trim($reviewer['email'] ?? '');

                    if (!empty($r_id)) {
                        // Dynamically fetch details from course_reviewers if name or email is empty
                        if (empty($r_name) || empty($r_email)) {
                            $lookupStmt = $conn->prepare("SELECT name, email FROM course_reviewers WHERE id = ?");
                            if ($lookupStmt) {
                                $lookupStmt->bind_param("s", $r_id);
                                $lookupStmt->execute();
                                $lookupRes = $lookupStmt->get_result();
                                if ($lookupRow = $lookupRes->fetch_assoc()) {
                                    if (empty($r_name)) $r_name = $lookupRow['name'];
                                    if (empty($r_email)) $r_email = $lookupRow['email'];
                                }
                                $lookupStmt->close();
                            }
                        }

                        // Fallback defaults to prevent null binder failures
                        if (empty($r_name)) $r_name = "Reviewer " . $r_id;
                        if (empty($r_email)) $r_email = "";

                        $reviewer_ids[] = $r_id;
                        $reviewer_names[] = $r_name;
                        $reviewer_emails[] = $r_email;

                        $insertStmt->bind_param("ssss", $course_id, $r_id, $r_name, $r_email);
                        $insertStmt->execute();
                    }
                }
                $insertStmt->close();
            }
        }

        // C. Sync the aggregates back to courses table
        $agg_ids = implode(',', $reviewer_ids);
        $agg_names = implode(', ', array_filter($reviewer_names));
        $agg_emails = implode(',', array_filter($reviewer_emails));

        $updateStmt = $conn->prepare("UPDATE courses SET assigned_reviewer_id = ?, assigned_reviewer_name = ?, assigned_reviewer_email = ? WHERE id = ?");
        if ($updateStmt) {
            $updateStmt->bind_param("ssss", $agg_ids, $agg_names, $agg_emails, $course_id);
            $updateStmt->execute();
            $updateStmt->close();
        }

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Successfully assigned " . count($reviewer_ids) . " reviewer(s) to course.",
            "course_id" => $course_id,
            "assigned_reviewer_id" => $agg_ids,
            "assigned_reviewer_name" => $agg_names,
            "assigned_reviewer_email" => $agg_emails
        ]);
        exit;

    } catch (\Throwable $txException) {
        $conn->rollback();
        throw $txException;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
