<?php
require_once __DIR__ . '/cors.php';
/**
 * Assign Course to Multiple Reviewers API - API v1
 * Path: /api/v1/assign-course-reviewers.php
 * 
 * Manages peer moderation assignments: assigning multiple reviewers to evaluate a single course simultaneously.
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

try {
    require_once __DIR__ . '/db.php';

    // Ensure reviewer_assignments table exists
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->query("
            CREATE TABLE IF NOT EXISTS `reviewer_assignments` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `course_id` VARCHAR(64) NOT NULL,
                `reviewer_id` VARCHAR(64) NOT NULL,
                `reviewer_name` VARCHAR(255) NOT NULL,
                `reviewer_email` VARCHAR(255) DEFAULT NULL,
                `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `unique_course_reviewer` (`course_id`, `reviewer_id`),
                INDEX `idx_course_id` (`course_id`),
                INDEX `idx_reviewer_id` (`reviewer_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // Ensure courses table has assigned reviewer columns
        $cols = [
            'assigned_reviewer_id' => "TEXT DEFAULT NULL",
            'assigned_reviewer_name' => "TEXT DEFAULT NULL",
            'assigned_reviewer_email' => "TEXT DEFAULT NULL"
        ];
        foreach ($cols as $col => $definition) {
            $checkCol = $conn->query("SHOW COLUMNS FROM `courses` LIKE '$col'");
            if ($checkCol && $checkCol->num_rows === 0) {
                @$conn->query("ALTER TABLE `courses` ADD COLUMN `$col` $definition");
            }
        }
    }

    if ($method === 'GET') {
        $course_id = isset($_GET['course_id']) ? trim($_GET['course_id']) : (isset($_GET['courseId']) ? trim($_GET['courseId']) : '');
        
        if (empty($course_id)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "course_id is required to fetch assigned reviewers."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $assignments = [];
        if (isset($conn) && $conn instanceof mysqli) {
            $stmt = $conn->prepare("SELECT id, course_id, reviewer_id, reviewer_name, reviewer_email, assigned_at FROM reviewer_assignments WHERE course_id = ? ORDER BY assigned_at DESC");
            if ($stmt) {
                $stmt->bind_param("s", $course_id);
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $assignments[] = [
                        "id" => $row['id'],
                        "courseId" => $row['course_id'],
                        "reviewerId" => $row['reviewer_id'],
                        "reviewerName" => $row['reviewer_name'],
                        "reviewerEmail" => $row['reviewer_email'],
                        "assignedAt" => $row['assigned_at']
                    ];
                }
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "courseId" => $course_id,
            "assignments" => $assignments,
            "count" => count($assignments)
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents("php://input");
        $data = json_decode($raw_input, true);
        if (empty($data)) {
            $data = array_merge($_GET, $_POST);
        }

        $course_id = '';
        $reviewers = [];

        if (is_string($data)) {
            $course_id = trim($data);
        } elseif (is_array($data)) {
            $course_id = trim((string)($data['course_id'] ?? $data['courseId'] ?? $_POST['course_id'] ?? $_POST['courseId'] ?? $_GET['course_id'] ?? $_GET['courseId'] ?? ''));
            if (isset($data['reviewers']) && is_array($data['reviewers'])) {
                $reviewers = $data['reviewers'];
            }
        }

        if (empty($course_id)) {
            $course_id = trim((string)($_POST['course_id'] ?? $_POST['courseId'] ?? $_GET['course_id'] ?? $_GET['courseId'] ?? ''));
        }

        if (empty($reviewers) && isset($_POST['reviewers'])) {
            $revs = json_decode($_POST['reviewers'], true);
            if (is_array($revs)) $reviewers = $revs;
        }

        if (empty($course_id)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "course_id is required for reviewer course assignment.",
                "received_raw" => $raw_input,
                "received_data" => $data
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

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

        if (isset($conn) && $conn instanceof mysqli) {
            $conn->begin_transaction();

            try {
                // Clear existing assignments for this course
                $delStmt = $conn->prepare("DELETE FROM reviewer_assignments WHERE course_id = ?");
                if ($delStmt) {
                    $delStmt->bind_param("s", $course_id);
                    $delStmt->execute();
                    $delStmt->close();
                }

                $reviewer_ids = [];
                $reviewer_names = [];
                $reviewer_emails = [];

                if (!empty($reviewers)) {
                    $insStmt = $conn->prepare("INSERT INTO reviewer_assignments (course_id, reviewer_id, reviewer_name, reviewer_email) VALUES (?, ?, ?, ?)");
                    if ($insStmt) {
                        foreach ($reviewers as $rev) {
                            $r_id = trim($rev['id'] ?? $rev['reviewerId'] ?? '');
                            $r_name = trim($rev['name'] ?? $rev['reviewerName'] ?? '');
                            $r_email = trim($rev['email'] ?? $rev['reviewerEmail'] ?? '');

                            if (!empty($r_id)) {
                                if (empty($r_name) || empty($r_email)) {
                                    $lookup = $conn->prepare("SELECT name, email FROM course_reviewers WHERE id = ?");
                                    if ($lookup) {
                                        $lookup->bind_param("s", $r_id);
                                        $lookup->execute();
                                        $lRes = $lookup->get_result();
                                        if ($lRow = $lRes->fetch_assoc()) {
                                            if (empty($r_name)) $r_name = $lRow['name'];
                                            if (empty($r_email)) $r_email = $lRow['email'];
                                        }
                                        $lookup->close();
                                    }
                                }

                                if (empty($r_name)) $r_name = "Reviewer " . $r_id;
                                if (empty($r_email)) $r_email = "";

                                $reviewer_ids[] = $r_id;
                                $reviewer_names[] = $r_name;
                                $reviewer_emails[] = $r_email;

                                $insStmt->bind_param("ssss", $course_id, $r_id, $r_name, $r_email);
                                $insStmt->execute();
                            }
                        }
                        $insStmt->close();
                    }
                }

                $agg_ids = implode(',', $reviewer_ids);
                $agg_names = implode(', ', array_filter($reviewer_names));
                $agg_emails = implode(',', array_filter($reviewer_emails));

                // Update courses table with assigned reviewers metadata
                $updStmt = $conn->prepare("UPDATE courses SET assigned_reviewer_id = ?, assigned_reviewer_name = ?, assigned_reviewer_email = ? WHERE id = ?");
                if ($updStmt) {
                    $updStmt->bind_param("ssss", $agg_ids, $agg_names, $agg_emails, $course_id);
                    $updStmt->execute();
                    $updStmt->close();
                }

                $conn->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Successfully assigned " . count($reviewer_ids) . " reviewer(s) for peer moderation.",
                    "course_id" => $course_id,
                    "assigned_reviewer_id" => $agg_ids,
                    "assigned_reviewer_name" => $agg_names,
                    "assigned_reviewer_email" => $agg_emails,
                    "reviewer_count" => count($reviewer_ids)
                ]);

            } catch (\Throwable $txErr) {
                $conn->rollback();
                throw $txErr;
            }
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Assignments processed.",
                "course_id" => $course_id,
                "reviewer_count" => count($reviewers)
            ]);
        }

        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error processing reviewer assignments: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}
?>
