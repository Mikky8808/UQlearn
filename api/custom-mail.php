<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

/**
 * Dynamic Custom Mail & Abandoned Cart Email API
 * Path: /api/v1/custom-mail.php
 * 
 * Features:
 * - Admin plan configuration (pricing in KES/USD and period in days)
 * - Instructor subscription management (Card via Paystack & M-Pesa via PayHero)
 * - Instructor custom email templates & automated recovery settings
 * - Test email dispatcher
 */

header('Content-Type: application/json; charset=utf-8');

date_default_timezone_set('Africa/Nairobi');

try {
    // 1. Auto-create database tables
    $createPricingTable = "CREATE TABLE IF NOT EXISTS `custom_mail_pricing` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `amount_kes` DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
        `amount_usd` DECIMAL(10, 2) NOT NULL DEFAULT 12.00,
        `period_days` INT NOT NULL DEFAULT 30,
        `period_label` VARCHAR(64) NOT NULL DEFAULT 'Monthly (30 Days)',
        `features_json` TEXT DEFAULT NULL,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createPricingTable);

    $createSubsTable = "CREATE TABLE IF NOT EXISTS `custom_mail_subscriptions` (
        `id` VARCHAR(64) PRIMARY KEY,
        `instructor_id` VARCHAR(64) NOT NULL,
        `instructor_name` VARCHAR(128) DEFAULT NULL,
        `instructor_email` VARCHAR(128) NOT NULL,
        `amount` DECIMAL(10, 2) NOT NULL,
        `currency` VARCHAR(10) NOT NULL DEFAULT 'KES',
        `payment_method` VARCHAR(32) NOT NULL DEFAULT 'mpesa',
        `reference` VARCHAR(128) NOT NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'active',
        `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `expires_at` TIMESTAMP NOT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_inst` (`instructor_id`),
        INDEX `idx_sub_status` (`status`),
        INDEX `idx_sub_expires` (`expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createSubsTable);

    $createTemplateTable = "CREATE TABLE IF NOT EXISTS `custom_mail_templates` (
        `instructor_id` VARCHAR(64) PRIMARY KEY,
        `sender_name` VARCHAR(128) DEFAULT NULL,
        `reply_to_email` VARCHAR(128) DEFAULT NULL,
        `subject` VARCHAR(255) NOT NULL DEFAULT 'You left something behind! Complete your course enrollment',
        `headline` VARCHAR(255) NOT NULL DEFAULT 'Pick up where you left off',
        `body_text` TEXT NOT NULL,
        `coupon_code` VARCHAR(64) DEFAULT NULL,
        `discount_percent` INT DEFAULT 15,
        `cta_button_text` VARCHAR(64) DEFAULT 'Complete My Order',
        `cta_button_url` VARCHAR(255) DEFAULT NULL,
        `footer_text` TEXT DEFAULT NULL,
        `delay_hours` INT DEFAULT 1,
        `is_active` TINYINT(1) DEFAULT 1,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createTemplateTable);

    // Auto-seed default pricing if table is empty
    $checkPricing = @$conn->query("SELECT COUNT(*) as cnt FROM `custom_mail_pricing`");
    $cntRow = $checkPricing ? $checkPricing->fetch_assoc() : null;
    if ($cntRow && (int)$cntRow['cnt'] === 0) {
        $defaultFeatures = json_encode([
            "Automated abandoned cart recovery email sequences",
            "Custom instructor store email sender name & reply-to address",
            "Custom branding, logo banners, and stylized discount coupons",
            "Real-time email open, click, and conversion rate analytics",
            "Direct student re-engagement and coupon push notifications"
        ]);
        $seedStmt = $conn->prepare("INSERT INTO `custom_mail_pricing` (`amount_kes`, `amount_usd`, `period_days`, `period_label`, `features_json`, `is_active`) VALUES (1500.00, 12.00, 30, 'Monthly (30 Days)', ?, 1)");
        $seedStmt->bind_param("s", $defaultFeatures);
        @$seedStmt->execute();
    }

    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // -------------------------------------------------------------
    // 1. GET PRICING (Admin & Instructor view)
    // -------------------------------------------------------------
    if ($action === 'pricing' || ($action === '' && $method === 'GET' && !isset($_GET['instructor_id']))) {
        $res = $conn->query("SELECT * FROM `custom_mail_pricing` ORDER BY `id` DESC LIMIT 1");
        $row = $res ? $res->fetch_assoc() : null;

        if (!$row) {
            $row = [
                'id' => 1,
                'amount_kes' => 1500.00,
                'amount_usd' => 12.00,
                'period_days' => 30,
                'period_label' => 'Monthly (30 Days)',
                'features_json' => '[]',
                'is_active' => 1
            ];
        }

        $features = json_decode($row['features_json'] ?? '[]', true);
        if (!is_array($features) || empty($features)) {
            $features = [
                "Automated abandoned cart recovery email sequences",
                "Custom instructor store email sender name & reply-to address",
                "Custom branding, logo banners, and stylized discount coupons",
                "Real-time email open, click, and conversion rate analytics"
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => (int)$row['id'],
                'amountKes' => (float)$row['amount_kes'],
                'amountUsd' => (float)$row['amount_usd'],
                'periodDays' => (int)$row['period_days'],
                'periodLabel' => $row['period_label'],
                'features' => $features,
                'isActive' => (bool)$row['is_active'],
                'updatedAt' => $row['updated_at'] ?? date('Y-m-d H:i:s')
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // 2. SAVE PRICING (Admin only)
    // -------------------------------------------------------------
    if ($action === 'save_pricing') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $amountKes = (float)($input['amountKes'] ?? $input['amount_kes'] ?? 1500);
        $amountUsd = (float)($input['amountUsd'] ?? $input['amount_usd'] ?? round($amountKes / 125, 2));
        $periodDays = max(1, (int)($input['periodDays'] ?? $input['period_days'] ?? 30));
        $periodLabel = trim($input['periodLabel'] ?? $input['period_label'] ?? "{$periodDays} Days Plan");
        $features = $input['features'] ?? [];
        $featuresJson = is_array($features) ? json_encode($features) : $input['features_json'] ?? '[]';
        $isActive = isset($input['isActive']) ? ((bool)$input['isActive'] ? 1 : 0) : 1;

        $checkExisting = $conn->query("SELECT `id` FROM `custom_mail_pricing` ORDER BY `id` DESC LIMIT 1");
        $existRow = $checkExisting ? $checkExisting->fetch_assoc() : null;

        if ($existRow) {
            $stmt = $conn->prepare("UPDATE `custom_mail_pricing` SET `amount_kes` = ?, `amount_usd` = ?, `period_days` = ?, `period_label` = ?, `features_json` = ?, `is_active` = ? WHERE `id` = ?");
            $stmt->bind_param("ddissii", $amountKes, $amountUsd, $periodDays, $periodLabel, $featuresJson, $isActive, $existRow['id']);
            $stmt->execute();
        } else {
            $stmt = $conn->prepare("INSERT INTO `custom_mail_pricing` (`amount_kes`, `amount_usd`, `period_days`, `period_label`, `features_json`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ddissi", $amountKes, $amountUsd, $periodDays, $periodLabel, $featuresJson, $isActive);
            $stmt->execute();
        }

        echo json_encode([
            'success' => true,
            'message' => 'Custom Mail plan pricing updated successfully',
            'data' => [
                'amountKes' => $amountKes,
                'amountUsd' => $amountUsd,
                'periodDays' => $periodDays,
                'periodLabel' => $periodLabel,
                'isActive' => (bool)$isActive
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // 3. GET INSTRUCTOR SUBSCRIPTION STATUS
    // -------------------------------------------------------------
    if ($action === 'status') {
        $instructorId = trim($_GET['instructor_id'] ?? $_GET['instructorId'] ?? $_GET['userId'] ?? '');
        if (empty($instructorId)) {
            echo json_encode(['success' => false, 'message' => 'instructor_id is required']);
            exit();
        }

        // Auto-expire old records
        @$conn->query("UPDATE `custom_mail_subscriptions` SET `status` = 'expired' WHERE `expires_at` < NOW() AND `status` = 'active'");

        // Check for active subscription
        $stmt = $conn->prepare("SELECT * FROM `custom_mail_subscriptions` 
            WHERE `instructor_id` = ? AND `status` = 'active' AND `expires_at` > NOW() 
            ORDER BY `expires_at` DESC LIMIT 1");
        $stmt->bind_param("s", $instructorId);
        $stmt->execute();
        $sub = $stmt->get_result()->fetch_assoc();

        if ($sub) {
            $expiresAtTimestamp = strtotime($sub['expires_at']);
            $daysRemaining = max(0, ceil(($expiresAtTimestamp - time()) / 86400));

            echo json_encode([
                'success' => true,
                'isSubscribed' => true,
                'subscription' => [
                    'id' => $sub['id'],
                    'instructorId' => $sub['instructor_id'],
                    'instructorName' => $sub['instructor_name'],
                    'instructorEmail' => $sub['instructor_email'],
                    'amount' => (float)$sub['amount'],
                    'currency' => $sub['currency'],
                    'paymentMethod' => $sub['payment_method'],
                    'reference' => $sub['reference'],
                    'status' => 'active',
                    'startedAt' => $sub['started_at'],
                    'expiresAt' => $sub['expires_at'],
                    'daysRemaining' => $daysRemaining
                ]
            ]);
        } else {
            // Check for most recent expired subscription
            $stmtExp = $conn->prepare("SELECT * FROM `custom_mail_subscriptions` 
                WHERE `instructor_id` = ? ORDER BY `created_at` DESC LIMIT 1");
            $stmtExp->bind_param("s", $instructorId);
            $stmtExp->execute();
            $lastSub = $stmtExp->get_result()->fetch_assoc();

            echo json_encode([
                'success' => true,
                'isSubscribed' => false,
                'lastSubscription' => $lastSub ? [
                    'id' => $lastSub['id'],
                    'status' => $lastSub['status'],
                    'expiresAt' => $lastSub['expires_at'],
                    'paymentMethod' => $lastSub['payment_method']
                ] : null
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 4. SUBSCRIBE INSTRUCTOR (After M-Pesa or Card Confirmation)
    // -------------------------------------------------------------
    if ($action === 'subscribe') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $instructorId = trim($input['instructor_id'] ?? $input['instructorId'] ?? $input['userId'] ?? '');
        $instructorName = trim($input['instructor_name'] ?? $input['instructorName'] ?? '');
        $instructorEmail = trim($input['instructor_email'] ?? $input['instructorEmail'] ?? '');
        $paymentMethod = trim($input['payment_method'] ?? $input['paymentMethod'] ?? 'mpesa'); // mpesa or card
        $reference = trim($input['reference'] ?? $input['transaction_reference'] ?? ('CM_' . time() . '_' . rand(1000, 9999)));

        if (empty($instructorId) || empty($instructorEmail)) {
            echo json_encode(['success' => false, 'message' => 'instructor_id and instructor_email are required']);
            exit();
        }

        // Fetch current active pricing & duration from admin config
        $pRes = $conn->query("SELECT `amount_kes`, `period_days` FROM `custom_mail_pricing` ORDER BY `id` DESC LIMIT 1");
        $pRow = $pRes ? $pRes->fetch_assoc() : null;
        $amount = (float)($input['amount'] ?? ($pRow ? $pRow['amount_kes'] : 1500.00));
        $periodDays = max(1, (int)($input['periodDays'] ?? ($pRow ? $pRow['period_days'] : 30)));

        $subId = 'cmsub_' . time() . '_' . bin2hex(random_bytes(4));
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$periodDays} days"));

        $stmt = $conn->prepare("INSERT INTO `custom_mail_subscriptions` 
            (`id`, `instructor_id`, `instructor_name`, `instructor_email`, `amount`, `currency`, `payment_method`, `reference`, `status`, `started_at`, `expires_at`)
            VALUES (?, ?, ?, ?, ?, 'KES', ?, ?, 'active', NOW(), ?)");
        $stmt->bind_param("ssssdsss", $subId, $instructorId, $instructorName, $instructorEmail, $amount, $paymentMethod, $reference, $expiresAt);
        $success = $stmt->execute();

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Custom Mail subscription activated successfully!',
                'subscription' => [
                    'id' => $subId,
                    'instructorId' => $instructorId,
                    'instructorName' => $instructorName,
                    'instructorEmail' => $instructorEmail,
                    'amount' => $amount,
                    'currency' => 'KES',
                    'paymentMethod' => $paymentMethod,
                    'reference' => $reference,
                    'status' => 'active',
                    'expiresAt' => $expiresAt,
                    'daysRemaining' => $periodDays
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to activate subscription: ' . $conn->error
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 5. GET TEMPLATE
    // -------------------------------------------------------------
    if ($action === 'template') {
        $instructorId = trim($_GET['instructor_id'] ?? $_GET['instructorId'] ?? $_GET['userId'] ?? '');
        if (empty($instructorId)) {
            echo json_encode(['success' => false, 'message' => 'instructor_id is required']);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM `custom_mail_templates` WHERE `instructor_id` = ? LIMIT 1");
        $stmt->bind_param("s", $instructorId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if ($row) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'instructorId' => $row['instructor_id'],
                    'senderName' => $row['sender_name'],
                    'replyToEmail' => $row['reply_to_email'],
                    'subject' => $row['subject'],
                    'headline' => $row['headline'],
                    'bodyText' => $row['body_text'],
                    'couponCode' => $row['coupon_code'],
                    'discountPercent' => (int)$row['discount_percent'],
                    'ctaButtonText' => $row['cta_button_text'],
                    'ctaButtonUrl' => $row['cta_button_url'],
                    'footerText' => $row['footer_text'],
                    'delayHours' => (int)$row['delay_hours'],
                    'isActive' => (bool)$row['is_active'],
                    'updatedAt' => $row['updated_at']
                ]
            ]);
        } else {
            // Default template
            echo json_encode([
                'success' => true,
                'data' => [
                    'instructorId' => $instructorId,
                    'senderName' => 'Course Academy Instructor Desk',
                    'replyToEmail' => '',
                    'subject' => 'You left something behind! Complete your course enrollment',
                    'headline' => 'Pick up where you left off',
                    'bodyText' => "Hi there,\n\nWe noticed you recently explored our course curriculum but didn't finish enrolling. Learning moves fast, and your spot in our live cohort is still saved.\n\nUse your exclusive discount voucher below to lock in complete lifetime access to all course modules, assignments, and verified certificates.",
                    'couponCode' => 'SAVE15NOW',
                    'discountPercent' => 15,
                    'ctaButtonText' => 'Complete My Order',
                    'ctaButtonUrl' => '',
                    'footerText' => 'Need personalized academic advice? Simply reply to this email to connect directly with your instructor.',
                    'delayHours' => 1,
                    'isActive' => true,
                    'updatedAt' => date('Y-m-d H:i:s')
                ]
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 6. SAVE TEMPLATE
    // -------------------------------------------------------------
    if ($action === 'save_template') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $instructorId = trim($input['instructor_id'] ?? $input['instructorId'] ?? $input['userId'] ?? '');
        if (empty($instructorId)) {
            echo json_encode(['success' => false, 'message' => 'instructor_id is required']);
            exit();
        }

        $senderName = trim($input['senderName'] ?? $input['sender_name'] ?? '');
        $replyToEmail = trim($input['replyToEmail'] ?? $input['reply_to_email'] ?? '');
        $subject = trim($input['subject'] ?? 'You left something behind! Complete your course enrollment');
        $headline = trim($input['headline'] ?? 'Pick up where you left off');
        $bodyText = trim($input['bodyText'] ?? $input['body_text'] ?? '');
        $couponCode = trim($input['couponCode'] ?? $input['coupon_code'] ?? '');
        $discountPercent = (int)($input['discountPercent'] ?? $input['discount_percent'] ?? 15);
        $ctaButtonText = trim($input['ctaButtonText'] ?? $input['cta_button_text'] ?? 'Complete My Order');
        $ctaButtonUrl = trim($input['ctaButtonUrl'] ?? $input['cta_button_url'] ?? '');
        $footerText = trim($input['footerText'] ?? $input['footer_text'] ?? '');
        $delayHours = (int)($input['delayHours'] ?? $input['delay_hours'] ?? 1);
        $isActive = isset($input['isActive']) ? ((bool)$input['isActive'] ? 1 : 0) : 1;

        $stmt = $conn->prepare("INSERT INTO `custom_mail_templates`
            (`instructor_id`, `sender_name`, `reply_to_email`, `subject`, `headline`, `body_text`, `coupon_code`, `discount_percent`, `cta_button_text`, `cta_button_url`, `footer_text`, `delay_hours`, `is_active`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `sender_name` = VALUES(`sender_name`),
            `reply_to_email` = VALUES(`reply_to_email`),
            `subject` = VALUES(`subject`),
            `headline` = VALUES(`headline`),
            `body_text` = VALUES(`body_text`),
            `coupon_code` = VALUES(`coupon_code`),
            `discount_percent` = VALUES(`discount_percent`),
            `cta_button_text` = VALUES(`cta_button_text`),
            `cta_button_url` = VALUES(`cta_button_url`),
            `footer_text` = VALUES(`footer_text`),
            `delay_hours` = VALUES(`delay_hours`),
            `is_active` = VALUES(`is_active`)");

        $stmt->bind_param("sssssssisssii", 
            $instructorId, $senderName, $replyToEmail, $subject, $headline, $bodyText, 
            $couponCode, $discountPercent, $ctaButtonText, $ctaButtonUrl, $footerText, 
            $delayHours, $isActive
        );
        $success = $stmt->execute();

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Custom Mail template saved successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to save template: ' . $conn->error
            ]);
        }
        exit();
    }

    // -------------------------------------------------------------
    // 7. GET ALL SUBSCRIPTIONS (Admin View)
    // -------------------------------------------------------------
    if ($action === 'subscriptions') {
        @$conn->query("UPDATE `custom_mail_subscriptions` SET `status` = 'expired' WHERE `expires_at` < NOW() AND `status` = 'active'");

        $res = $conn->query("SELECT * FROM `custom_mail_subscriptions` ORDER BY `created_at` DESC LIMIT 200");
        $subscriptions = [];
        while ($row = $res->fetch_assoc()) {
            $daysRemaining = max(0, ceil((strtotime($row['expires_at']) - time()) / 86400));
            $subscriptions[] = [
                'id' => $row['id'],
                'instructorId' => $row['instructor_id'],
                'instructorName' => $row['instructor_name'],
                'instructorEmail' => $row['instructor_email'],
                'amount' => (float)$row['amount'],
                'currency' => $row['currency'],
                'paymentMethod' => $row['payment_method'],
                'reference' => $row['reference'],
                'status' => $row['status'],
                'startedAt' => $row['started_at'],
                'expiresAt' => $row['expires_at'],
                'daysRemaining' => $daysRemaining,
                'createdAt' => $row['created_at']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $subscriptions
        ]);
        exit();
    }

    // Fallback error
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action or request method']);

} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $t->getMessage()
    ]);
}
