<?php
require_once __DIR__ . '/cors.php';
/**
 * Courses API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/courses.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure created_by, deleted_at, is_deleted, and best_seller columns exist in MySQL courses table
    $coursesTblCheck = $conn->query("SHOW TABLES LIKE 'courses'");
    if (!$coursesTblCheck || $coursesTblCheck->num_rows === 0) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Courses table not found in database."]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    $colCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'created_by'");
    if ($colCheck && $colCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN created_by VARCHAR(64) DEFAULT NULL AFTER instructor_avatar");
        @$conn->query("ALTER TABLE courses ADD INDEX idx_created_by (created_by)");
    }

    $delColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'deleted_at'");
    if ($delColCheck && $delColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at");
        @$conn->query("ALTER TABLE courses ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER deleted_at");
        @$conn->query("ALTER TABLE courses ADD INDEX idx_is_deleted (is_deleted)");
    }

    $bestColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'best_seller'");
    if ($bestColCheck && $bestColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN best_seller TINYINT(1) DEFAULT 0 AFTER is_published");
    }

    $premColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'is_premium'");
    if ($premColCheck && $premColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN is_premium TINYINT(1) DEFAULT 0 AFTER best_seller");
    }

    $ratingColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'rating'");
    if ($ratingColCheck && $ratingColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN rating DECIMAL(3,2) DEFAULT 5.00 AFTER description");
    }

    $revColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'review_count'");
    if ($revColCheck && $revColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN review_count INT DEFAULT 0 AFTER rating");
    }

    $lrnColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'learners_enrolled'");
    if ($lrnColCheck && $lrnColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN learners_enrolled INT DEFAULT 0 AFTER review_count");
    }

    $appColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'is_approved_by_admin'");
    if ($appColCheck && $appColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN is_approved_by_admin TINYINT(1) DEFAULT 0 AFTER is_premium");
    }

    $subcatCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'subcategory'");
    if ($subcatCheck && $subcatCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN subcategory VARCHAR(150) DEFAULT NULL AFTER category");
    }

    $primCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'primary_taught'");
    if ($primCheck && $primCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN primary_taught VARCHAR(255) DEFAULT NULL AFTER subcategory");
    }

    $langCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'language'");
    if ($langCheck && $langCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN language VARCHAR(50) DEFAULT 'English' AFTER duration");
    }

    $promoCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'promo_video'");
    if ($promoCheck && $promoCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN promo_video TEXT DEFAULT NULL AFTER image");
    }

    $instDescCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'instructor_description'");
    if ($instDescCheck && $instDescCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN instructor_description TEXT DEFAULT NULL AFTER instructor_avatar");
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // GET: Fetch all courses or single course by id
    // =========================================================================
    if ($method === 'GET') {
        $includeDeleted = (isset($_GET['include_deleted']) && ($_GET['include_deleted'] === '1' || $_GET['include_deleted'] === 'true')) ||
                          (isset($_GET['status']) && $_GET['status'] === 'all');
        $deletedOnly = (isset($_GET['deleted_only']) && ($_GET['deleted_only'] === '1' || $_GET['deleted_only'] === 'true')) ||
                       (isset($_GET['status']) && in_array($_GET['status'], ['trash', 'deleted', 'trashed']));

        if (isset($_GET['id']) && !empty($_GET['id'])) {
            $id = $conn->real_escape_string(trim($_GET['id']));
            $sql = "SELECT * FROM courses WHERE id = '$id'";
            if (!$includeDeleted && !$deletedOnly) {
                $sql .= " AND (is_deleted IS NULL OR is_deleted = 0) AND deleted_at IS NULL";
            }
            $res = $conn->query($sql);
            
            if ($res && $res->num_rows > 0) {
                $course = $res->fetch_assoc();
                $course['createdBy'] = $course['created_by'] ?? null;
                $course['isDeleted'] = (bool)($course['is_deleted'] ?? false);
                $course['deletedAt'] = $course['deleted_at'] ?? null;
                $course['isPublished'] = (bool)($course['is_published'] ?? true);
                $course['bestSeller'] = (bool)($course['best_seller'] ?? false);
                $course['isPremium'] = (bool)($course['is_premium'] ?? false);
                $course['price'] = (float)($course['price'] ?? 0);
                $course['originalPrice'] = (float)($course['original_price'] ?? 0);
                $course['rating'] = (float)($course['rating'] ?? 5.0);
                $course['reviewCount'] = (int)($course['review_count'] ?? 0);
                $course['learnersEnrolled'] = (int)($course['learners_enrolled'] ?? 0);
                $course['isApprovedByAdmin'] = (bool)($course['is_approved_by_admin'] ?? true);
                $course['subcategory'] = $course['subcategory'] ?? '';
                $course['primaryTaught'] = $course['primary_taught'] ?? '';
                $course['language'] = $course['language'] ?? 'English';
                $course['promoVideo'] = $course['promo_video'] ?? '';
                $course['instructorDescription'] = $course['instructor_description'] ?? '';
                $course['instructorAvatar'] = $course['instructor_avatar'] ?? '';
                $course['instructorImage'] = $course['instructor_avatar'] ?? '';
                
                // Fetch modules and lessons
                $modSql = "SELECT * FROM modules WHERE course_id = '$id' ORDER BY order_index ASC";
                $modRes = $conn->query($modSql);
                $modules = [];
                
                if ($modRes) {
                    while ($mod = $modRes->fetch_assoc()) {
                        $modId = $conn->real_escape_string($mod['id']);
                        $lesSql = "SELECT * FROM lessons WHERE module_id = '$modId' ORDER BY order_index ASC";
                        $lesRes = $conn->query($lesSql);
                        $lessons = [];
                        
                        if ($lesRes) {
                            while ($les = $lesRes->fetch_assoc()) {
                                $lessons[] = [
                                    'id' => $les['id'],
                                    'title' => $les['title'],
                                    'duration' => $les['duration'],
                                    'type' => $les['type'],
                                    'videoUrl' => $les['video_url'],
                                    'content' => $les['content'],
                                    'isPreview' => (bool)($les['is_preview'] ?? 0),
                                    'orderIndex' => (int)($les['order_index'] ?? 0)
                                ];
                            }
                        }
                        
                        $modules[] = [
                            'id' => $mod['id'],
                            'title' => $mod['title'],
                            'description' => $mod['description'],
                            'orderIndex' => (int)($mod['order_index'] ?? 0),
                            'lessons' => $lessons
                        ];
                    }
                }
                $course['modules'] = $modules;

                // Fetch learning outcomes
                $outcomes = [];
                $conn->query("CREATE TABLE IF NOT EXISTS `learning_outcomes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `course_id` VARCHAR(255) NOT NULL,
                    `outcome` TEXT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX (`course_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $outRes = $conn->query("SELECT outcome FROM learning_outcomes WHERE course_id = '$id'");
                if ($outRes) {
                    while ($oRow = $outRes->fetch_assoc()) {
                        $outcomes[] = $oRow['outcome'];
                    }
                }
                $course['learningOutcomes'] = $outcomes;
                $course['whatYouWillLearn'] = $outcomes;

                echo json_encode(["success" => true, "data" => $course]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Course not found"]);
            }
        } else {
            $where = [];
            if ($deletedOnly) {
                $where[] = "(is_deleted = 1 OR deleted_at IS NOT NULL)";
            } elseif (!$includeDeleted) {
                $where[] = "(is_deleted IS NULL OR is_deleted = 0) AND deleted_at IS NULL";
            }

            if (isset($_GET['created_by']) || isset($_GET['createdBy'])) {
                $creatorId = $conn->real_escape_string(trim($_GET['created_by'] ?? $_GET['createdBy']));
                $where[] = "created_by = '$creatorId'";
            }

            if (isset($_GET['category']) && !empty($_GET['category']) && strtolower($_GET['category']) !== 'all') {
                $cat = $conn->real_escape_string(trim($_GET['category']));
                $where[] = "category = '$cat'";
            }

            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $q = $conn->real_escape_string(trim($_GET['search']));
                $where[] = "(title LIKE '%$q%' OR subtitle LIKE '%$q%' OR description LIKE '%$q%' OR instructor LIKE '%$q%')";
            }
            
            // Only fetch published courses unless specified otherwise
            if (isset($_GET['include_unpublished']) && ($_GET['include_unpublished'] === '1' || $_GET['include_unpublished'] === 'true')) {
                // Include unpublished
            } else if (isset($_GET['is_published'])) {
                $pubVal = ($_GET['is_published'] === '1' || $_GET['is_published'] === 'true') ? 1 : 0;
                $where[] = "is_published = $pubVal";
            }
            
            $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
            $sql = "SELECT *, 
                    (SELECT COUNT(*) FROM modules WHERE course_id = courses.id) as modules_count,
                    (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = courses.id) as lessons_count
                    FROM courses $whereClause ORDER BY created_at DESC";
            
            $res = $conn->query($sql);
            $courses = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $row['createdBy'] = $row['created_by'] ?? null;
                    $row['isDeleted'] = (bool)($row['is_deleted'] ?? false);
                    $row['deletedAt'] = $row['deleted_at'] ?? null;
                    $row['isPublished'] = (bool)($row['is_published'] ?? true);
                    $row['bestSeller'] = (bool)($row['best_seller'] ?? false);
                    $row['isPremium'] = (bool)($row['is_premium'] ?? false);
                    $row['isApprovedByAdmin'] = (bool)($row['is_approved_by_admin'] ?? true);
                    $row['modulesCount'] = (int)($row['modules_count'] ?? 0);
                    $row['lessonsCount'] = (int)($row['lessons_count'] ?? 0);
                    $row['price'] = (float)($row['price'] ?? 0);
                    $row['originalPrice'] = (float)($row['original_price'] ?? 0);
                    $row['rating'] = (float)($row['rating'] ?? 5.0);
                    $row['reviewCount'] = (int)($row['review_count'] ?? 0);
                    $row['learnersEnrolled'] = (int)($row['learners_enrolled'] ?? 0);
                    $row['subcategory'] = $row['subcategory'] ?? '';
                    $row['primaryTaught'] = $row['primary_taught'] ?? '';
                    $row['language'] = $row['language'] ?? 'English';
                    $row['promoVideo'] = $row['promo_video'] ?? '';
                    $row['instructorDescription'] = $row['instructor_description'] ?? '';
                    $row['instructorAvatar'] = $row['instructor_avatar'] ?? '';
                    $row['instructorImage'] = $row['instructor_avatar'] ?? '';
                    $row['learningOutcomes'] = [];
                    $row['whatYouWillLearn'] = [];
                    $courses[] = $row;
                }
            }

            // Populate learning outcomes for all courses in list
            if (count($courses) > 0) {
                $conn->query("CREATE TABLE IF NOT EXISTS `learning_outcomes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `course_id` VARCHAR(255) NOT NULL,
                    `outcome` TEXT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX (`course_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $cIds = array_map(function($c) use ($conn) { return "'" . $conn->real_escape_string($c['id']) . "'"; }, $courses);
                $cIdsStr = implode(",", $cIds);
                $outRes = $conn->query("SELECT course_id, outcome FROM learning_outcomes WHERE course_id IN ($cIdsStr)");
                $outcomesMap = [];
                if ($outRes) {
                    while ($oRow = $outRes->fetch_assoc()) {
                        $outcomesMap[$oRow['course_id']][] = $oRow['outcome'];
                    }
                }
                foreach ($courses as &$cRef) {
                    $cRef['learningOutcomes'] = $outcomesMap[$cRef['id']] ?? [];
                    $cRef['whatYouWillLearn'] = $cRef['learningOutcomes'];
                }
            }

            echo json_encode(["success" => true, "data" => $courses, "count" => count($courses)]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // =========================================================================
    // DELETE: Soft delete or permanent delete course
    // =========================================================================
    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? ($_GET['course_id'] ?? null);
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (!$id && !empty($input['id'])) {
            $id = $input['id'];
        }
        if (!$id && !empty($input['course_id'])) {
            $id = $input['course_id'];
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Course ID is required for deletion."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $id = $conn->real_escape_string($id);
        $permanent = (isset($_GET['permanent']) && ($_GET['permanent'] === '1' || $_GET['permanent'] === 'true')) ||
                     (!empty($input['permanent']) && $input['permanent'] === true);

        if ($permanent) {
            $delSql = "DELETE FROM courses WHERE id = '$id'";
            $delRes = $conn->query($delSql);
            if ($delRes) {
                // Delete associated records
                @$conn->query("DELETE FROM learning_outcomes WHERE course_id = '$id'");
                $mods = $conn->query("SELECT id FROM modules WHERE course_id = '$id'");
                if ($mods) {
                    while ($m = $mods->fetch_assoc()) {
                        $mid = $m['id'];
                        @$conn->query("DELETE FROM lessons WHERE module_id = '$mid'");
                    }
                }
                @$conn->query("DELETE FROM modules WHERE course_id = '$id'");

                echo json_encode([
                    "success" => true,
                    "message" => "Course permanently deleted from database.",
                    "courseId" => $id,
                    "action" => "permanent_delete"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Error deleting course: " . $conn->error]);
            }
        } else {
            // Soft delete: sets is_deleted = 1 and deleted_at = NOW()
            $softSql = "UPDATE courses SET is_deleted = 1, deleted_at = NOW() WHERE id = '$id'";
            $softRes = $conn->query($softSql);
            if ($softRes) {
                echo json_encode([
                    "success" => true,
                    "message" => "Course soft-deleted successfully.",
                    "courseId" => $id,
                    "action" => "soft_delete",
                    "isDeleted" => true,
                    "deletedAt" => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Error soft-deleting course: " . $conn->error]);
            }
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // =========================================================================
    // POST or PUT: Insert, Update, Soft-Delete or Restore course
    // =========================================================================
    if ($method === 'POST' || $method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $action = $input['action'] ?? ($_GET['action'] ?? '');

        // Action: Soft Delete Course
        if ($action === 'soft_delete' || $action === 'delete') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required for soft delete"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $conn->query("UPDATE courses SET is_deleted = 1, deleted_at = NOW() WHERE id = '$id'");
            echo json_encode([
                "success" => true,
                "message" => "Course soft-deleted successfully.",
                "courseId" => $id,
                "action" => "soft_delete",
                "isDeleted" => true,
                "deletedAt" => date('Y-m-d H:i:s')
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Restore Soft-Deleted Course
        if ($action === 'restore') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required for restore"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $conn->query("UPDATE courses SET is_deleted = 0, deleted_at = NULL WHERE id = '$id'");
            echo json_encode([
                "success" => true,
                "message" => "Course restored successfully.",
                "courseId" => $id,
                "action" => "restore",
                "isDeleted" => false
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Approve/Disapprove Course
        if ($action === 'approve') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $isApproved = (!empty($input['isApprovedByAdmin']) || !empty($input['isApproved'])) ? 1 : 0;
            
            $sql = "UPDATE courses SET is_approved_by_admin = $isApproved, updated_at = NOW() WHERE id = '$id'";
            if ($conn->query($sql)) {
                echo json_encode(["success" => true, "message" => "Course approval status updated.", "isApproved" => (bool)$isApproved]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Publish/Unpublish Course
        if ($action === 'publish' || $action === 'toggle_publish') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $isPublished = (isset($input['isPublished']) ? !empty($input['isPublished']) : (isset($input['is_published']) ? !empty($input['is_published']) : true)) ? 1 : 0;
            
            $sql = "UPDATE courses SET is_published = $isPublished, updated_at = NOW() WHERE id = '$id'";
            if ($conn->query($sql)) {
                echo json_encode(["success" => true, "message" => "Course publish status updated.", "isPublished" => (bool)$isPublished]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Save Rating and Reviews Specifically
        if ($action === 'save_rating_reviews') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $rating = floatval($input['rating'] ?? 5.0);
            $reviewCount = intval($input['reviewCount'] ?? ($input['review_count'] ?? 0));
            
            $sql = "UPDATE courses SET rating = $rating, review_count = $reviewCount, updated_at = NOW() WHERE id = '$id'";
            if ($conn->query($sql)) {
                echo json_encode([
                    "success" => true,
                    "message" => "Rating and reviews saved successfully to database.",
                    "courseId" => $id,
                    "rating" => $rating,
                    "reviewCount" => $reviewCount
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Delete Course
        if ($action === 'delete') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required for deletion"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            
            $conn->begin_transaction();
            try {
                $conn->query("DELETE FROM learning_outcomes WHERE course_id = '$id'");
                $conn->query("DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = '$id')");
                $conn->query("DELETE FROM modules WHERE course_id = '$id'");
                $conn->query("DELETE FROM courses WHERE id = '$id'");
                $conn->commit();
                echo json_encode(["success" => true, "message" => "Course and all related data deleted successfully."]);
            } catch (\Throwable $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Deletion failed: " . $e->getMessage()]);
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // Action: Partial Update Course Metadata (Rating, Review Count, Best Seller, Premium, Price)
        if ($action === 'update_meta' || $action === 'update_attributes') {
            $id = $input['id'] ?? ($input['course_id'] ?? ($input['courseId'] ?? ($_GET['id'] ?? '')));
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required"]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }
            $id = $conn->real_escape_string($id);
            $setClauses = [];
            if (isset($input['rating'])) {
                $r = floatval($input['rating']);
                $setClauses[] = "rating = $r";
            }
            if (isset($input['reviewCount']) || isset($input['review_count'])) {
                $rc = intval($input['reviewCount'] ?? $input['review_count']);
                $setClauses[] = "review_count = $rc";
            }
            if (isset($input['bestSeller']) || isset($input['best_seller'])) {
                $bs = (!empty($input['bestSeller']) || !empty($input['best_seller'])) ? 1 : 0;
                $setClauses[] = "best_seller = $bs";
            }
            if (isset($input['isPremium']) || isset($input['is_premium'])) {
                $ip = (!empty($input['isPremium']) || !empty($input['is_premium'])) ? 1 : 0;
                $setClauses[] = "is_premium = $ip";
            }
            if (isset($input['isApprovedByAdmin']) || isset($input['is_approved_by_admin'])) {
                $aba = (!empty($input['isApprovedByAdmin']) || !empty($input['is_approved_by_admin'])) ? 1 : 0;
                $setClauses[] = "is_approved_by_admin = $aba";
            }
            if (isset($input['price'])) {
                $p = floatval($input['price']);
                $setClauses[] = "price = $p";
            }
            if (!empty($setClauses)) {
                $setClauses[] = "updated_at = NOW()";
                $updateSql = "UPDATE courses SET " . implode(", ", $setClauses) . " WHERE id = '$id'";
                $conn->query($updateSql);
            }
            echo json_encode([
                "success" => true,
                "message" => "Course metadata updated successfully.",
                "courseId" => $id
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        if (empty($input['title'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Course title is required"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $id = !empty($input['id']) ? $conn->real_escape_string($input['id']) : 'course-' . round(microtime(true) * 1000);
        $title = $conn->real_escape_string($input['title']);
        $subtitle = $conn->real_escape_string($input['subtitle'] ?? '');
        $description = $conn->real_escape_string($input['description'] ?? '');
        $instructor = $conn->real_escape_string($input['instructor'] ?? 'Dr. Angela Vance');
        $instructorTitle = $conn->real_escape_string($input['instructorTitle'] ?? ($input['instructor_title'] ?? 'Senior Instructor'));
        $instructorAvatar = $conn->real_escape_string($input['instructorAvatar'] ?? ($input['instructor_avatar'] ?? ($input['instructorImage'] ?? ($input['instructor_image'] ?? ''))));
        $createdBy = !empty($input['createdBy']) ? $conn->real_escape_string($input['createdBy']) : (!empty($input['created_by']) ? $conn->real_escape_string($input['created_by']) : null);
        $category = $conn->real_escape_string($input['category'] ?? 'Development');
        $level = $conn->real_escape_string($input['level'] ?? 'Beginner');
        $price = floatval($input['price'] ?? 49.99);
        $originalPrice = floatval($input['originalPrice'] ?? ($input['original_price'] ?? 99.99));
        $rating = floatval($input['rating'] ?? 5.0);
        $reviewCount = intval($input['reviewCount'] ?? ($input['review_count'] ?? 0));
        $learnersEnrolled = intval($input['learnersEnrolled'] ?? ($input['learners_enrolled'] ?? 0));
        $image = $conn->real_escape_string($input['image'] ?? '');
        $duration = $conn->real_escape_string($input['duration'] ?? '10.0 hours');
        $isPublished = isset($input['isPublished']) ? ($input['isPublished'] ? 1 : 0) : (isset($input['is_published']) ? ($input['is_published'] ? 1 : 0) : 1);
        $bestSeller = isset($input['bestSeller']) ? ($input['bestSeller'] ? 1 : 0) : (isset($input['best_seller']) ? ($input['best_seller'] ? 1 : 0) : 0);
        $isPremium = isset($input['isPremium']) ? ($input['isPremium'] ? 1 : 0) : (isset($input['is_premium']) ? ($input['is_premium'] ? 1 : 0) : 0);
        $isApproved = isset($input['isApprovedByAdmin']) ? ($input['isApprovedByAdmin'] ? 1 : 0) : (isset($input['is_approved_by_admin']) ? ($input['is_approved_by_admin'] ? 1 : 0) : 0);

        $subcategory = $conn->real_escape_string($input['subcategory'] ?? '');
        $primaryTaught = $conn->real_escape_string($input['primaryTaught'] ?? ($input['primary_taught'] ?? ''));
        $language = $conn->real_escape_string($input['language'] ?? 'English');
        $promoVideo = $conn->real_escape_string($input['promoVideo'] ?? ($input['promo_video'] ?? ''));
        $instructorDescription = $conn->real_escape_string($input['instructorDescription'] ?? ($input['instructor_description'] ?? ''));

        $conn->begin_transaction();

        try {
            $created_by_val = $createdBy ? "'$createdBy'" : "NULL";
            $upsertCourse = "INSERT INTO courses (
                id, title, subtitle, description, instructor, instructor_title, 
                instructor_avatar, created_by, category, level, price, original_price, 
                rating, review_count, learners_enrolled, image, duration, is_published, best_seller, is_premium, is_approved_by_admin,
                subcategory, primary_taught, language, promo_video, instructor_description
            ) VALUES (
                '$id', '$title', '$subtitle', '$description', '$instructor', '$instructorTitle', 
                '$instructorAvatar', $created_by_val, '$category', '$level', $price, $originalPrice, 
                $rating, $reviewCount, $learnersEnrolled, '$image', '$duration', $isPublished, $bestSeller, $isPremium, $isApproved,
                '$subcategory', '$primaryTaught', '$language', '$promoVideo', '$instructorDescription'
            ) ON DUPLICATE KEY UPDATE 
                title = '$title', subtitle = '$subtitle', description = '$description', instructor = '$instructor', 
                instructor_title = '$instructorTitle', 
                instructor_avatar = CASE WHEN '$instructorAvatar' != '' THEN '$instructorAvatar' ELSE instructor_avatar END, 
                created_by = COALESCE(VALUES(created_by), created_by), category = '$category', level = '$level', 
                price = $price, original_price = $originalPrice, rating = $rating, review_count = $reviewCount, 
                learners_enrolled = $learnersEnrolled, image = '$image', duration = '$duration', 
                is_published = $isPublished, best_seller = $bestSeller, is_premium = $isPremium, is_approved_by_admin = $isApproved,
                subcategory = '$subcategory', primary_taught = '$primaryTaught', language = '$language', promo_video = '$promoVideo', 
                instructor_description = CASE WHEN '$instructorDescription' != '' THEN '$instructorDescription' ELSE instructor_description END,
                updated_at = NOW()";
            
            $conn->query($upsertCourse);

            // Synchronize learning outcomes if provided
            $rawOutcomes = $input['learningOutcomes'] ?? ($input['learning_outcomes'] ?? ($input['whatYouWillLearn'] ?? ($input['what_you_will_learn'] ?? ($input['outcomes'] ?? null))));
            if (is_string($rawOutcomes)) {
                $decoded = json_decode($rawOutcomes, true);
                if (is_array($decoded)) {
                    $rawOutcomes = $decoded;
                }
            }
            if (isset($rawOutcomes) && is_array($rawOutcomes)) {
                $conn->query("CREATE TABLE IF NOT EXISTS `learning_outcomes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `course_id` VARCHAR(255) NOT NULL,
                    `outcome` TEXT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX (`course_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                @$conn->query("DELETE FROM learning_outcomes WHERE course_id = '$id'");
                $outStmt = $conn->prepare("INSERT INTO learning_outcomes (course_id, outcome) VALUES (?, ?)");
                if ($outStmt) {
                    foreach ($rawOutcomes as $outItem) {
                        $outText = trim(is_string($outItem) ? $outItem : ($outItem['outcome'] ?? ''));
                        if (!empty($outText)) {
                            $outStmt->bind_param("ss", $id, $outText);
                            $outStmt->execute();
                        }
                    }
                    $outStmt->close();
                }
            }

            // Insert Modules and Lessons if provided
            if (isset($input['modules']) && is_array($input['modules'])) {
                // Delete existing lessons and modules for this course if replacing
                $existingModsRes = $conn->query("SELECT id FROM modules WHERE course_id = '$id'");
                if ($existingModsRes && $existingModsRes->num_rows > 0) {
                    while ($modRow = $existingModsRes->fetch_assoc()) {
                        $mId = $conn->real_escape_string($modRow['id']);
                        $conn->query("DELETE FROM lessons WHERE module_id = '$mId'");
                    }
                    $conn->query("DELETE FROM modules WHERE course_id = '$id'");
                }

                foreach ($input['modules'] as $mIdx => $m) {
                    $modId = !empty($m['id']) ? $conn->real_escape_string($m['id']) : 'mod-' . round(microtime(true) * 1000) . '-' . $mIdx;
                    $modTitle = $conn->real_escape_string($m['title'] ?? 'Module ' . ($mIdx + 1));
                    $modDesc = $conn->real_escape_string($m['description'] ?? '');

                    $conn->query("INSERT INTO modules (id, course_id, title, description, order_index) VALUES ('$modId', '$id', '$modTitle', '$modDesc', $mIdx)");

                    if (!empty($m['lessons']) && is_array($m['lessons'])) {
                        foreach ($m['lessons'] as $lIdx => $l) {
                            $lesId = !empty($l['id']) ? $conn->real_escape_string($l['id']) : 'les-' . round(microtime(true) * 1000) . '-' . $lIdx;
                            $lesTitle = $conn->real_escape_string($l['title'] ?? 'Lesson ' . ($lIdx + 1));
                            $lesDur = $conn->real_escape_string($l['duration'] ?? '10:00');
                            $lesType = $conn->real_escape_string($l['type'] ?? 'video');
                            $lesVid = $conn->real_escape_string($l['videoUrl'] ?? ($l['video_url'] ?? ''));
                            $lesContent = $conn->real_escape_string($l['content'] ?? '');
                            $lesPrev = !empty($l['isPreview']) || !empty($l['is_preview']) ? 1 : 0;

                            $conn->query("INSERT INTO lessons (id, module_id, title, duration, type, video_url, content, is_preview, order_index)
                                          VALUES ('$lesId', '$modId', '$lesTitle', '$lesDur', '$lesType', '$lesVid', '$lesContent', $lesPrev, $lIdx)");
                        }
                    }
                }
            }

            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Course saved and synchronized successfully in database.",
                "courseId" => $id
            ]);
        } catch (\Throwable $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "SQL Execution Error: " . $e->getMessage()]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unhandled courses API exception: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
