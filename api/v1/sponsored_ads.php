<?php
/**
 * RESTful API for UQlearn Sponsored Advertisements & Product Promotion
 * Endpoint: /api/v1/sponsored_ads.php
 * Handles Instructor Applications, Pricing Plans, Status, and Marketplace Sponsored Delivery
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // 1. Auto-create sponsored_ads and sponsored_pricing_plans tables
    $createTablesSql = "
    CREATE TABLE IF NOT EXISTS `sponsored_ads` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `course_id` varchar(64) NOT NULL,
      `instructor_id` varchar(64) NOT NULL,
      `instructor_name` varchar(255) DEFAULT NULL,
      `instructor_email` varchar(255) DEFAULT NULL,
      `course_title` varchar(255) DEFAULT NULL,
      `course_thumbnail` varchar(512) DEFAULT NULL,
      `course_price` decimal(10,2) DEFAULT 0.00,
      `plan_id` varchar(64) DEFAULT 'starter_7d',
      `plan_name` varchar(100) NOT NULL DEFAULT 'Starter Reach (7 Days)',
      `duration_days` int(11) NOT NULL DEFAULT 7,
      `amount_paid` decimal(10,2) NOT NULL DEFAULT 9.99,
      `currency` varchar(10) NOT NULL DEFAULT 'USD',
      `payment_method` varchar(64) DEFAULT 'wallet',
      `payment_status` varchar(32) NOT NULL DEFAULT 'completed',
      `status` varchar(32) NOT NULL DEFAULT 'active',
      `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `end_date` datetime NOT NULL,
      `impressions_count` int(11) NOT NULL DEFAULT 0,
      `clicks_count` int(11) NOT NULL DEFAULT 0,
      `admin_notes` text DEFAULT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `course_active_idx` (`course_id`, `status`, `start_date`, `end_date`),
      KEY `instructor_idx` (`instructor_id`, `status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `sponsored_pricing_plans` (
      `id` varchar(64) NOT NULL,
      `name` varchar(100) NOT NULL,
      `description` varchar(255) DEFAULT NULL,
      `duration_days` int(11) NOT NULL DEFAULT 7,
      `price` decimal(10,2) NOT NULL DEFAULT 9.99,
      `badge_tag` varchar(64) DEFAULT 'Starter',
      `features` text DEFAULT NULL,
      `is_active` tinyint(1) NOT NULL DEFAULT 1,
      `display_order` int(11) NOT NULL DEFAULT 0,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->multi_query($createTablesSql);
        while ($conn->more_results() && $conn->next_result()) {;}
        
        // Auto-seed default pricing plans if empty
        $chkPlans = $conn->query("SELECT COUNT(*) as cnt FROM `sponsored_pricing_plans`");
        $cntRow = $chkPlans ? $chkPlans->fetch_assoc() : null;
        if (!$cntRow || (int)$cntRow['cnt'] === 0) {
            $f1 = json_encode(["Google-style Sponsored Badge on Card", "Priority ranking in search & categories", "7 Days uninterrupted visibility boost"]);
            $f2 = json_encode(["Google-style Sponsored Badge", "Top-shelf placement in category pages", "14 Days active visibility boost", "Real-time impressions & clicks analytics"]);
            $f3 = json_encode(["Maximum Marketplace Prominence", "Sponsored badge & featured spotlight card", "30 Days continuous promotion", "Full CTR & ROI conversion tracking"]);

            $seedSql = "INSERT INTO `sponsored_pricing_plans` (`id`, `name`, `description`, `duration_days`, `price`, `badge_tag`, `features`, `is_active`, `display_order`) VALUES
            ('starter_7d', 'Starter Boost (7 Days)', 'Essential visibility boost for new course launches', 7, 9.99, 'Starter', '" . $conn->real_escape_string($f1) . "', 1, 1),
            ('pro_14d', 'Pro Growth (14 Days)', 'High-impact promotion with top-shelf placement', 14, 18.99, 'Popular', '" . $conn->real_escape_string($f2) . "', 1, 2),
            ('mega_30d', 'Dominance Reach (30 Days)', 'Maximum exposure across all marketplace shelves & search', 30, 34.99, 'Best Value', '" . $conn->real_escape_string($f3) . "', 1, 3)";
            $conn->query($seedSql);
        }

        // Auto expire outdated campaigns
        $conn->query("UPDATE `sponsored_ads` SET `status` = 'expired' WHERE `status` = 'active' AND `end_date` < NOW()");
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // =========================================================================
    // 2. GET REQUESTS
    // =========================================================================
    if ($method === 'GET') {
        // A. Get Pricing Plans
        if ($action === 'plans') {
            $plansSql = "SELECT * FROM `sponsored_pricing_plans` WHERE `is_active` = 1 ORDER BY `display_order` ASC, `price` ASC";
            $res = $conn->query($plansSql);
            $plans = [];
            if ($res) {
                while ($r = $res->fetch_assoc()) {
                    $features = json_decode($r['features'] ?? '[]', true);
                    if (!is_array($features)) $features = [];
                    $plans[] = [
                        "id" => $r['id'],
                        "name" => $r['name'],
                        "description" => $r['description'],
                        "durationDays" => (int)$r['duration_days'],
                        "price" => (float)$r['price'],
                        "badgeTag" => $r['badge_tag'],
                        "features" => $features,
                        "isActive" => (bool)$r['is_active'],
                        "displayOrder" => (int)$r['display_order']
                    ];
                }
            }
            echo json_encode(["success" => true, "data" => $plans]);
            exit;
        }

        // B. Get Active Sponsored Course IDs (for Landing Page & Course Cards)
        if ($action === 'active_courses') {
            $activeSql = "SELECT `course_id`, `id`, `plan_name`, `start_date`, `end_date` FROM `sponsored_ads` WHERE `status` = 'active' AND `start_date` <= NOW() AND `end_date` >= NOW()";
            $res = $conn->query($activeSql);
            $courseIds = [];
            $sponsoredMap = [];
            if ($res) {
                while ($r = $res->fetch_assoc()) {
                    $cId = (string)$r['course_id'];
                    $courseIds[] = $cId;
                    $sponsoredMap[$cId] = [
                        "adId" => (int)$r['id'],
                        "courseId" => $cId,
                        "planName" => $r['plan_name'],
                        "startDate" => $r['start_date'],
                        "endDate" => $r['end_date'],
                        "isSponsored" => true
                    ];
                }
            }
            echo json_encode([
                "success" => true,
                "data" => array_values(array_unique($courseIds)),
                "sponsoredMap" => $sponsoredMap,
                "count" => count($courseIds)
            ]);
            exit;
        }

        // C. General List of Sponsored Ads (Admin & Instructor view)
        $instructorId = isset($_GET['instructor_id']) ? trim($_GET['instructor_id']) : '';
        $courseId = isset($_GET['course_id']) ? trim($_GET['course_id']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $activeOnly = isset($_GET['active_only']) && ($_GET['active_only'] === '1' || $_GET['active_only'] === 'true');

        $conds = [];
        if (!empty($instructorId)) {
            $escInst = $conn->real_escape_string($instructorId);
            $conds[] = "`instructor_id` = '$escInst'";
        }
        if (!empty($courseId)) {
            $escCourse = $conn->real_escape_string($courseId);
            $conds[] = "`course_id` = '$escCourse'";
        }
        if (!empty($status)) {
            $escStatus = $conn->real_escape_string($status);
            $conds[] = "`status` = '$escStatus'";
        }
        if ($activeOnly) {
            $conds[] = "(`status` = 'active' AND `start_date` <= NOW() AND `end_date` >= NOW())";
        }

        $whereClause = !empty($conds) ? "WHERE " . implode(" AND ", $conds) : "";
        $adsSql = "SELECT * FROM `sponsored_ads` $whereClause ORDER BY `created_at` DESC";
        $res = $conn->query($adsSql);

        $ads = [];
        if ($res) {
            while ($r = $res->fetch_assoc()) {
                $ads[] = [
                    "id" => (int)$r['id'],
                    "courseId" => (string)$r['course_id'],
                    "course_id" => (string)$r['course_id'],
                    "instructorId" => (string)$r['instructor_id'],
                    "instructor_id" => (string)$r['instructor_id'],
                    "instructorName" => $r['instructor_name'],
                    "instructorEmail" => $r['instructor_email'],
                    "courseTitle" => $r['course_title'],
                    "courseThumbnail" => $r['course_thumbnail'],
                    "coursePrice" => (float)$r['course_price'],
                    "planId" => $r['plan_id'],
                    "planName" => $r['plan_name'],
                    "durationDays" => (int)$r['duration_days'],
                    "amountPaid" => (float)$r['amount_paid'],
                    "currency" => $r['currency'],
                    "paymentMethod" => $r['payment_method'],
                    "paymentStatus" => $r['payment_status'],
                    "status" => $r['status'],
                    "startDate" => $r['start_date'],
                    "endDate" => $r['end_date'],
                    "impressionsCount" => (int)$r['impressions_count'],
                    "clicksCount" => (int)$r['clicks_count'],
                    "adminNotes" => $r['admin_notes'],
                    "createdAt" => $r['created_at'],
                    "updatedAt" => $r['updated_at']
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "data" => $ads,
            "count" => count($ads)
        ]);
        exit;
    }

    // =========================================================================
    // 3. POST REQUESTS
    // =========================================================================
    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true) ?? $_POST;
        $reqAction = $data['action'] ?? $action;

        // A. Record Impression (Marketplace view)
        if ($reqAction === 'record_impression') {
            $cId = trim($data['course_id'] ?? ($data['courseId'] ?? ''));
            if (!empty($cId)) {
                $esc = $conn->real_escape_string($cId);
                $conn->query("UPDATE `sponsored_ads` SET `impressions_count` = `impressions_count` + 1 WHERE `course_id` = '$esc' AND `status` = 'active'");
            }
            echo json_encode(["success" => true]);
            exit;
        }

        // B. Record Click (Marketplace card click)
        if ($reqAction === 'record_click') {
            $cId = trim($data['course_id'] ?? ($data['courseId'] ?? ''));
            if (!empty($cId)) {
                $esc = $conn->real_escape_string($cId);
                $conn->query("UPDATE `sponsored_ads` SET `clicks_count` = `clicks_count` + 1 WHERE `course_id` = '$esc' AND `status` = 'active'");
            }
            echo json_encode(["success" => true]);
            exit;
        }

        // C. Instructor Applies for Sponsored Ad Promotion
        if ($reqAction === 'apply' || $reqAction === 'create') {
            $courseId = trim($data['course_id'] ?? ($data['courseId'] ?? ''));
            $instructorId = trim($data['instructor_id'] ?? ($data['instructorId'] ?? ''));
            $instructorName = trim($data['instructor_name'] ?? ($data['instructorName'] ?? 'Instructor'));
            $instructorEmail = trim($data['instructor_email'] ?? ($data['instructorEmail'] ?? ''));
            $courseTitle = trim($data['course_title'] ?? ($data['courseTitle'] ?? ''));
            $courseThumbnail = trim($data['course_thumbnail'] ?? ($data['courseThumbnail'] ?? ''));
            $coursePrice = (float)($data['course_price'] ?? ($data['coursePrice'] ?? 0));
            $planId = trim($data['plan_id'] ?? ($data['planId'] ?? 'starter_7d'));
            $planName = trim($data['plan_name'] ?? ($data['planName'] ?? 'Starter Boost'));
            $durationDays = max(1, (int)($data['duration_days'] ?? ($data['durationDays'] ?? 7)));
            $amountPaid = (float)($data['amount_paid'] ?? ($data['amountPaid'] ?? 9.99));
            $currency = trim($data['currency'] ?? 'USD');
            $paymentMethod = trim($data['payment_method'] ?? ($data['paymentMethod'] ?? 'wallet'));
            $status = 'active'; // Defaults to immediate activation

            if (empty($courseId) || empty($instructorId)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID and Instructor ID are required."]);
                exit;
            }

            // Calculate start and end date
            $startDate = date('Y-m-d H:i:s');
            $endDate = date('Y-m-d H:i:s', strtotime("+$durationDays days"));

            $stmt = $conn->prepare("INSERT INTO `sponsored_ads` (`course_id`, `instructor_id`, `instructor_name`, `instructor_email`, `course_title`, `course_thumbnail`, `course_price`, `plan_id`, `plan_name`, `duration_days`, `amount_paid`, `currency`, `payment_method`, `payment_status`, `status`, `start_date`, `end_date`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, NOW(), NOW())");
            
            $stmt->bind_param("ssssssdssidsdsss", 
                $courseId, 
                $instructorId, 
                $instructorName, 
                $instructorEmail, 
                $courseTitle, 
                $courseThumbnail, 
                $coursePrice, 
                $planId, 
                $planName, 
                $durationDays, 
                $amountPaid, 
                $currency, 
                $paymentMethod, 
                $status, 
                $startDate, 
                $endDate
            );

            if ($stmt->execute()) {
                $newId = $conn->insert_id;
                echo json_encode([
                    "success" => true,
                    "message" => "Sponsored ad campaign applied & activated successfully!",
                    "id" => $newId,
                    "startDate" => $startDate,
                    "endDate" => $endDate
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Failed to apply sponsored ad: " . $stmt->error]);
            }
            $stmt->close();
            exit;
        }

        // D. Update Status (Admin Approve, Pause, Activate, Reject)
        if ($reqAction === 'update_status') {
            $id = (int)($data['id'] ?? 0);
            $newStatus = trim($data['status'] ?? '');
            $adminNotes = trim($data['admin_notes'] ?? ($data['adminNotes'] ?? ''));

            if (!$id || empty($newStatus)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Ad ID and new status are required."]);
                exit;
            }

            $escStatus = $conn->real_escape_string($newStatus);
            $escNotes = $conn->real_escape_string($adminNotes);
            $extraSet = "";
            if ($newStatus === 'active') {
                // If reactivating or extending, update start & end dates
                $durationDays = isset($data['duration_days']) ? (int)$data['duration_days'] : null;
                if ($durationDays && $durationDays > 0) {
                    $newEnd = date('Y-m-d H:i:s', strtotime("+$durationDays days"));
                    $extraSet = ", `start_date` = NOW(), `end_date` = '$newEnd'";
                }
            }

            $updateSql = "UPDATE `sponsored_ads` SET `status` = '$escStatus', `admin_notes` = '$escNotes' $extraSet, `updated_at` = NOW() WHERE `id` = $id";
            if ($conn->query($updateSql)) {
                echo json_encode(["success" => true, "message" => "Sponsored ad status updated to $newStatus."]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Update failed: " . $conn->error]);
            }
            exit;
        }

        // E. Delete Sponsored Ad
        if ($reqAction === 'delete') {
            $id = (int)($data['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Ad ID is required."]);
                exit;
            }
            $conn->query("DELETE FROM `sponsored_ads` WHERE `id` = $id");
            echo json_encode(["success" => true, "message" => "Sponsored ad campaign deleted."]);
            exit;
        }

        // F. Admin Save/Update Pricing Plans
        if ($reqAction === 'save_plans') {
            $plansList = $data['plans'] ?? [];
            if (is_array($plansList) && count($plansList) > 0) {
                foreach ($plansList as $p) {
                    $pId = $conn->real_escape_string($p['id']);
                    $pName = $conn->real_escape_string($p['name']);
                    $pDesc = $conn->real_escape_string($p['description'] ?? '');
                    $pDays = (int)($p['durationDays'] ?? ($p['duration_days'] ?? 7));
                    $pPrice = (float)($p['price'] ?? 9.99);
                    $pBadge = $conn->real_escape_string($p['badgeTag'] ?? ($p['badge_tag'] ?? ''));
                    $pFeatures = $conn->real_escape_string(json_encode($p['features'] ?? []));
                    $pActive = isset($p['isActive']) ? ($p['isActive'] ? 1 : 0) : 1;
                    $pOrder = (int)($p['displayOrder'] ?? 0);

                    $upsertSql = "INSERT INTO `sponsored_pricing_plans` (`id`, `name`, `description`, `duration_days`, `price`, `badge_tag`, `features`, `is_active`, `display_order`)
                    VALUES ('$pId', '$pName', '$pDesc', $pDays, $pPrice, '$pBadge', '$pFeatures', $pActive, $pOrder)
                    ON DUPLICATE KEY UPDATE `name` = '$pName', `description` = '$pDesc', `duration_days` = $pDays, `price` = $pPrice, `badge_tag` = '$pBadge', `features` = '$pFeatures', `is_active` = $pActive, `display_order` = $pOrder";
                    $conn->query($upsertSql);
                }
                echo json_encode(["success" => true, "message" => "Pricing plans saved successfully."]);
                exit;
            }
        }
    }

    // =========================================================================
    // 4. DELETE REQUEST
    // =========================================================================
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id) {
            $conn->query("DELETE FROM `sponsored_ads` WHERE `id` = $id");
            echo json_encode(["success" => true, "message" => "Sponsored ad deleted successfully."]);
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "ID is required."]);
        }
        exit;
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
