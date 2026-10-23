<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for Course Reviewers Management & Authentication
 * Compatible with Shared Hosting (PHP 7.4+)
 * Path: /api/v1/reviewers.php
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create table course_reviewers if it doesn't exist
    $createTableQuery = "CREATE TABLE IF NOT EXISTS `course_reviewers` (
        `id` VARCHAR(64) PRIMARY KEY,
        `name` VARCHAR(255) NOT NULL,
        `email` VARCHAR(255) NOT NULL UNIQUE,
        `title` VARCHAR(255) DEFAULT 'Course Quality Evaluator',
        `specialization` VARCHAR(255) DEFAULT 'All Categories',
        `categories` TEXT DEFAULT NULL,
        `phone` VARCHAR(64) DEFAULT NULL,
        `status` ENUM('approved', 'suspended', 'pending') DEFAULT 'approved',
        `added_by` VARCHAR(255) DEFAULT 'Admin Console',
        `avatar` VARCHAR(500) DEFAULT NULL,
        `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `last_login_at` DATETIME NULL DEFAULT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    @$conn->query($createTableQuery);

    // Self-healing schema migration: Auto-add missing columns on-the-fly!
    $columns_to_ensure = [
        'reviews_submitted' => "INT DEFAULT 0",
        'reviews_published' => "INT DEFAULT 0",
        'last_review_at' => "DATETIME DEFAULT NULL",
        'login_count' => "INT DEFAULT 0",
        'updated_by' => "VARCHAR(255) DEFAULT NULL",
        'deleted_at' => "DATETIME DEFAULT NULL"
    ];

    foreach ($columns_to_ensure as $col => $definition) {
        $checkCol = @$conn->query("SHOW COLUMNS FROM `course_reviewers` LIKE '$col'");
        if ($checkCol && $checkCol->num_rows === 0) {
            @$conn->query("ALTER TABLE `course_reviewers` ADD COLUMN `$col` $definition");
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];
    if (empty($data)) {
        $data = array_merge($_GET, $_POST);
    }
    $action = $_GET['action'] ?? $data['action'] ?? $_POST['action'] ?? null;

    // Guaranteed routing fallback: If the payload contains course assignment keys, auto-force save_assignments action
    if (empty($action) || ($action !== 'save_assignments' && $action !== 'assign_reviewer')) {
        if (isset($data['course_id']) || isset($data['courseId']) || isset($data['reviewers']) || isset($_POST['course_id']) || isset($_POST['courseId']) || isset($_POST['reviewers'])) {
            $action = 'save_assignments';
        }
    }

    // LOGIN / AUTHENTICATION ENDPOINT
    if ($action === 'login' || ($method === 'POST' && (isset($data['login_email']) || isset($data['auth_email'])))) {
        $email = strtolower(trim($_GET['email'] ?? $data['email'] ?? $data['login_email'] ?? $data['auth_email'] ?? ''));
        
        if (empty($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Reviewer email is required."]);
            exit;
        }

        $stmt = $conn->prepare("SELECT * FROM course_reviewers WHERE LOWER(email) = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $res = $stmt->get_result();
        $reviewer = $res->fetch_assoc();
        $stmt->close();

        if (!$reviewer) {
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "authorized" => false,
                "message" => "Access Denied: The email \"{$email}\" has not been added as an authorized Course Reviewer by Admin."
            ]);
            exit;
        }

        if ($reviewer['status'] === 'suspended') {
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "authorized" => false,
                "status" => "suspended",
                "message" => "Account Suspended: Your reviewer account ({$email}) has been suspended by Admin. Contact admin@uqlearn.org."
            ]);
            exit;
        }

        if ($reviewer['status'] === 'pending') {
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "authorized" => false,
                "status" => "pending",
                "message" => "Account Pending: Your reviewer account ({$email}) is awaiting Admin approval."
            ]);
            exit;
        }

        // Update last login and increment login_count
        $now = date('Y-m-d H:i:s');
        $upStmt = $conn->prepare("UPDATE course_reviewers SET last_login_at = ?, login_count = login_count + 1 WHERE id = ?");
        $upStmt->bind_param("ss", $now, $reviewer['id']);
        $upStmt->execute();
        $upStmt->close();

        $cats = json_decode($reviewer['categories'] ?? '[]', true);
        if (!is_array($cats)) $cats = ['All Categories'];

        $perms = json_decode($reviewer['permissions'] ?? '[]', true);
        if (!is_array($perms)) $perms = ["publish", "approve"];

        $scopeObj = json_decode($reviewer['scope'] ?? '{}', true);

        echo json_encode([
            "success" => true,
            "authorized" => true,
            "message" => "Authentication successful",
            "reviewer" => [
                "id" => $reviewer['id'],
                "name" => $reviewer['name'],
                "email" => $reviewer['email'],
                "title" => $reviewer['title'],
                "specialization" => $reviewer['specialization'],
                "categories" => $cats,
                "phone" => $reviewer['phone'],
                "status" => $reviewer['status'],
                "avatar" => $reviewer['avatar'] ?? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
                "role" => $reviewer['role'] ?? 'reviewer',
                "permissions" => $perms,
                "scope" => $scopeObj,
                "email_verified" => intval($reviewer['email_verified'] ?? 0) === 1,
                "uq_affiliation" => $reviewer['uq_affiliation'] ?? 'unknown',
                "reviews_submitted" => intval($reviewer['reviews_submitted'] ?? 0)
            ]
        ]);
        exit;
    }

    // Helper to format a reviewer database row for JSON response
    function formatReviewerRow($row) {
        $row['categories'] = json_decode($row['categories'] ?? '[]', true);
        if (!is_array($row['categories'])) $row['categories'] = ['All Categories'];

        $row['permissions'] = json_decode($row['permissions'] ?? '[]', true);
        if (!is_array($row['permissions'])) $row['permissions'] = ["publish", "approve"];

        $row['scope'] = json_decode($row['scope'] ?? '{}', true);
        if (!$row['scope']) $row['scope'] = (object)[];

        $row['email_verified'] = intval($row['email_verified'] ?? 0) === 1;
        $row['reviews_submitted'] = intval($row['reviews_submitted'] ?? 0);
        $row['reviews_published'] = intval($row['reviews_published'] ?? 0);
        $row['login_count'] = intval($row['login_count'] ?? 0);

        return $row;
    }

    // CRUD ACTIONS
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM course_reviewers WHERE id = ? AND deleted_at IS NULL");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res->fetch_assoc();
                $stmt->close();

                if ($row) {
                    echo json_encode(["success" => true, "data" => formatReviewerRow($row)]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Reviewer not found"]);
                }
            } else {
                // Filter out soft deleted records unless requested
                $res = $conn->query("SELECT * FROM course_reviewers WHERE deleted_at IS NULL ORDER BY added_at DESC");
                $list = [];
                while ($row = $res->fetch_assoc()) {
                    $list[] = formatReviewerRow($row);
                }
                echo json_encode(["success" => true, "data" => $list, "count" => count($list)]);
            }
            break;

        case 'POST':
            if ($action === 'delete') {
                $id = $data['id'] ?? $_GET['id'] ?? null;
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Missing reviewer ID"]);
                    exit;
                }
                // Soft delete to preserve referential integrity of published reviews!
                $now = date('Y-m-d H:i:s');
                $stmt = $conn->prepare("UPDATE course_reviewers SET deleted_at = ? WHERE id = ?");
                $stmt->bind_param("ss", $now, $id);
                $stmt->execute();
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Reviewer soft-deleted successfully"]);
                exit;
            }

            if ($action === 'toggle_status' || $action === 'status') {
                $id = $data['id'] ?? $_GET['id'] ?? null;
                $status = $data['status'] ?? 'approved';
                
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Missing reviewer ID"]);
                    exit;
                }
                
                $stmt = $conn->prepare("UPDATE course_reviewers SET status = ? WHERE id = ?");
                $stmt->bind_param("ss", $status, $id);
                $stmt->execute();
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Status updated successfully"]);
                exit;
            }

            if ($action === 'save_assignments' || $action === 'assign_reviewer') {
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
            }

            if ($action === 'update' || $action === 'edit') {
                $id = $data['id'] ?? $_GET['id'] ?? null;
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Missing reviewer ID"]);
                    exit;
                }
                
                $name = trim($data['name'] ?? '');
                $title = trim($data['title'] ?? 'Course Quality Evaluator');
                $specialization = trim($data['specialization'] ?? 'All Categories');
                $categories = json_encode($data['categories'] ?? ['All Categories']);
                $phone = trim($data['phone'] ?? '');
                $status = $data['status'] ?? 'approved';
                $updated_by = $data['updated_by'] ?? $data['updatedBy'] ?? 'Admin Console';

                $stmt = $conn->prepare("UPDATE course_reviewers SET 
                    name = ?, title = ?, specialization = ?, categories = ?, phone = ?, status = ?, updated_by = ? WHERE id = ?");
                if (!$stmt) {
                    throw new Exception("POST update prepare failed: " . $conn->error);
                }
                
                $stmt->bind_param("ssssssss", 
                    $name, $title, $specialization, $categories, $phone, $status, $updated_by, $id);
                if (!$stmt->execute()) {
                    throw new Exception("POST update execute failed: " . $stmt->error);
                }
                $stmt->close();
                
                echo json_encode(["success" => true, "message" => "Reviewer updated successfully via POST fallback"]);
                exit;
            }

            // ADD or UPSERT REVIEWER
            $name = trim($data['name'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));
            
            if (empty($name) || empty($email)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Name and Email are required"]);
                exit;
            }

            // Read the rest of standard fields
            $title = trim($data['title'] ?? 'Course Quality Evaluator');
            $specialization = trim($data['specialization'] ?? 'All Categories');
            $categories = json_encode($data['categories'] ?? ['All Categories']);
            $phone = trim($data['phone'] ?? '');
            $status = $data['status'] ?? 'approved';
            $addedBy = $data['addedBy'] ?? $data['added_by'] ?? 'Admin Console';
            $avatar = $data['avatar'] ?? null;

            // Check if email exists
            $checkStmt = $conn->prepare("SELECT id FROM course_reviewers WHERE LOWER(email) = ?");
            $checkStmt->bind_param("s", $email);
            $checkStmt->execute();
            $checkRes = $checkStmt->get_result();
            $existing = $checkRes->fetch_assoc();
            $checkStmt->close();

            if ($existing) {
                // Update existing
                $id = $existing['id'];
                $stmt = $conn->prepare("UPDATE course_reviewers SET 
                    name = ?, title = ?, specialization = ?, categories = ?, phone = ?, status = ?, added_by = ?, avatar = COALESCE(?, avatar),
                    deleted_at = NULL WHERE id = ?");
                if (!$stmt) {
                    throw new Exception("Update existing prepare failed: " . $conn->error);
                }
                $stmt->bind_param("sssssssss", 
                    $name, $title, $specialization, $categories, $phone, $status, $addedBy, $avatar, $id);
                if (!$stmt->execute()) {
                    throw new Exception("Update existing execute failed: " . $stmt->error);
                }
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Reviewer updated successfully", "id" => $id]);
            } else {
                // Insert new
                $id = 'rev-' . time() . '-' . rand(100, 999);
                
                $stmt = $conn->prepare("INSERT INTO course_reviewers (
                    id, name, email, title, specialization, categories, phone, status, added_by, avatar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                if (!$stmt) {
                    throw new Exception("Insert prepare failed: " . $conn->error);
                }
                
                $stmt->bind_param("ssssssssss", 
                    $id, $name, $email, $title, $specialization, $categories, $phone, $status, $addedBy, $avatar);
                if (!$stmt->execute()) {
                    throw new Exception("Insert execute failed: " . $stmt->error);
                }
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Reviewer created successfully", "id" => $id]);
            }
            break;

        case 'PUT':
            $id = $_GET['id'] ?? $data['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Missing reviewer ID"]);
                exit;
            }
            
            $name = trim($data['name'] ?? '');
            $title = trim($data['title'] ?? '');
            $specialization = trim($data['specialization'] ?? '');
            $categories = json_encode($data['categories'] ?? ['All Categories']);
            $phone = trim($data['phone'] ?? '');
            $status = $data['status'] ?? 'approved';
            $updated_by = $data['updated_by'] ?? $data['updatedBy'] ?? 'Admin Console';

            $stmt = $conn->prepare("UPDATE course_reviewers SET 
                name = ?, title = ?, specialization = ?, categories = ?, phone = ?, status = ?, updated_by = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception("PUT prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param("ssssssss", 
                $name, $title, $specialization, $categories, $phone, $status, $updated_by, $id);
            if (!$stmt->execute()) {
                throw new Exception("PUT execute failed: " . $stmt->error);
            }
            $stmt->close();
            
            echo json_encode(["success" => true, "message" => "Reviewer updated successfully"]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? $data['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Missing reviewer ID"]);
                exit;
            }
            // Use soft delete by default
            $now = date('Y-m-d H:i:s');
            $stmt = $conn->prepare("UPDATE course_reviewers SET deleted_at = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception("DELETE prepare failed: " . $conn->error);
            }
            $stmt->bind_param("ss", $now, $id);
            if (!$stmt->execute()) {
                throw new Exception("DELETE execute failed: " . $stmt->error);
            }
            $stmt->close();
            echo json_encode(["success" => true, "message" => "Reviewer soft-deleted successfully"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Method not allowed"]);
            break;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
