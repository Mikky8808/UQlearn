<?php
/**
 * RESTful API for UQlearn Promotion Tiers & Ad Packages Management
 * Endpoint: /api/v1/promotion-tiers.php
 * Handles reading and updating the promotional tiers, pricing rates, and marketing bullets
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
    // Ensure promotion_tiers table exists with rating and enrolled_text columns
    $conn->query("CREATE TABLE IF NOT EXISTS `promotion_tiers` (
        `id` VARCHAR(64) PRIMARY KEY,
        `badge_type` VARCHAR(50) NOT NULL,
        `name` VARCHAR(150) NOT NULL,
        `badge_label` VARCHAR(100) NOT NULL,
        `description` TEXT DEFAULT NULL,
        `features` LONGTEXT DEFAULT NULL,
        `daily_rate_usd` DECIMAL(10,2) NOT NULL DEFAULT 3.50,
        `cta_text` VARCHAR(100) NOT NULL DEFAULT 'Boost',
        `is_active` TINYINT(1) DEFAULT 1,
        `accent_color` VARCHAR(50) DEFAULT 'indigo',
        `sort_order` INT DEFAULT 0,
        `rating` DECIMAL(3,2) DEFAULT 4.90,
        `enrolled_text` VARCHAR(150) DEFAULT '2,150+ students enrolled',
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed defaults if empty
    $checkEmpty = $conn->query("SELECT COUNT(*) as cnt FROM `promotion_tiers`");
    if ($checkEmpty) {
        $row = $checkEmpty->fetch_assoc();
        if ((int)$row['cnt'] === 0) {
            $conn->query("INSERT INTO `promotion_tiers` (`id`, `badge_type`, `name`, `badge_label`, `description`, `features`, `daily_rate_usd`, `cta_text`, `is_active`, `accent_color`, `sort_order`) VALUES
            ('sponsored', 'sponsored', 'Sponsored Placement', 'Sponsored', 'Ranks your course at the top of category listings and search results with an official Sponsored label.', '" . json_encode(['5x more student impressions', 'Guaranteed top search ranking', 'Targeted audience category match']) . "', 3.50, 'Boost as Sponsored', 1, 'indigo', 1),
            ('bestseller', 'bestseller', 'Best Seller Ribbon', 'Best Seller', 'Earns the coveted gold Best Seller ribbon badge across all cards and detail pages to maximize student trust.', '" . json_encode(['3.8x higher student conversion rate', 'Social proof & high-trust ribbon', 'Featured in Popular & Bestsellers']) . "', 5.00, 'Get Best Seller', 1, 'amber', 2),
            ('premium', 'premium', 'Premium Spotlight', 'Premium', 'The ultimate prestige tier. Features your course in the Homepage Hero Carousel and Editor\'s Picks.', '" . json_encode(['Homepage carousel banner display', 'VIP learner newsletter spotlight', 'Verified Premium badge & styling']) . "', 7.50, 'Get Premium', 1, 'purple', 3),
            ('triple-bundle', 'sponsored', 'Triple Power Bundle (All 3 Badges)', 'Triple Bundle', 'Get all 3 ad badges simultaneously (Sponsored + Best Seller + Premium) with maximum reach and bundle savings.', '" . json_encode(['1.8x maximum reach multiplier', 'All 3 trust badges applied instantly', 'Maximum social proof & category dominance']) . "', 16.00, 'Get All 3 Badges at Once', 1, 'gradient', 4)");
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // -------------------------------------------------------------------------
    // GET: Fetch all active or all promotion tiers
    // -------------------------------------------------------------------------
    if ($method === 'GET') {
        $all = isset($_GET['all']) && $_GET['all'] === 'true';
        $where = $all ? "" : "WHERE `is_active` = 1";
        $res = $conn->query("SELECT * FROM `promotion_tiers` $where ORDER BY `sort_order` ASC, `id` ASC");

        $tiers = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $featuresArray = json_decode($row['features'], true);
                if (!is_array($featuresArray)) {
                    $featuresArray = array_filter(array_map('trim', explode("\n", $row['features'])));
                }
                $tiers[] = [
                    'id' => $row['id'],
                    'badgeType' => $row['badge_type'],
                    'name' => $row['name'],
                    'badgeLabel' => $row['badge_label'],
                    'description' => $row['description'],
                    'features' => array_values($featuresArray),
                    'dailyRateUsd' => (float)$row['daily_rate_usd'],
                    'ctaText' => $row['cta_text'],
                    'isActive' => (bool)$row['is_active'],
                    'accentColor' => $row['accent_color'],
                    'sortOrder' => (int)$row['sort_order'],
                    'rating' => (float)($row['rating'] ?? 4.9),
                    'enrolledText' => $row['enrolled_text'] ?? '2,150+ students enrolled',
                    'updatedAt' => $row['updated_at']
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'count' => count($tiers),
            'tiers' => $tiers
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST: Save or update promotion tiers
    // -------------------------------------------------------------------------
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;
        $action = isset($data['action']) ? $data['action'] : 'save_tiers';

        if ($action === 'save_tier' && isset($data['tier'])) {
            $t = $data['tier'];
            $id = $conn->real_escape_string($t['id'] ?? $t['badgeType']);
            $badgeType = $conn->real_escape_string($t['badgeType'] ?? $id);
            $name = $conn->real_escape_string($t['name'] ?? '');
            $badgeLabel = $conn->real_escape_string($t['badgeLabel'] ?? $name);
            $description = $conn->real_escape_string($t['description'] ?? '');
            $featuresJson = $conn->real_escape_string(json_encode($t['features'] ?? []));
            $dailyRate = (float)($t['dailyRateUsd'] ?? 3.5);
            $ctaText = $conn->real_escape_string($t['ctaText'] ?? 'Boost as Sponsored');
            $isActive = !empty($t['isActive']) ? 1 : 0;
            $accentColor = $conn->real_escape_string($t['accentColor'] ?? 'indigo');
            $sortOrder = (int)($t['sortOrder'] ?? 0);
            $rating = (float)($t['rating'] ?? 4.9);
            $enrolledText = $conn->real_escape_string($t['enrolledText'] ?? '2,150+ students enrolled');

            $upsertSql = "INSERT INTO `promotion_tiers` 
                (`id`, `badge_type`, `name`, `badge_label`, `description`, `features`, `daily_rate_usd`, `cta_text`, `is_active`, `accent_color`, `sort_order`, `rating`, `enrolled_text`, `updated_at`)
                VALUES ('$id', '$badgeType', '$name', '$badgeLabel', '$description', '$featuresJson', $dailyRate, '$ctaText', $isActive, '$accentColor', $sortOrder, $rating, '$enrolledText', NOW())
                ON DUPLICATE KEY UPDATE 
                `name` = '$name', `badge_label` = '$badgeLabel', `description` = '$description', `features` = '$featuresJson',
                `daily_rate_usd` = $dailyRate, `cta_text` = '$ctaText', `is_active` = $isActive, `accent_color` = '$accentColor`, `rating` = $rating, `enrolled_text` = '$enrolledText', `updated_at` = NOW()";

            $conn->query($upsertSql);

            echo json_encode([
                'success' => true,
                'message' => "Tier '{$name}' saved successfully."
            ]);
            exit;
        }

        if ($action === 'save_tiers' && isset($data['tiers']) && is_array($data['tiers'])) {
            foreach ($data['tiers'] as $t) {
                $id = $conn->real_escape_string($t['id'] ?? $t['badgeType']);
                $badgeType = $conn->real_escape_string($t['badgeType'] ?? $id);
                $name = $conn->real_escape_string($t['name'] ?? '');
                $badgeLabel = $conn->real_escape_string($t['badgeLabel'] ?? $name);
                $description = $conn->real_escape_string($t['description'] ?? '');
                $featuresJson = $conn->real_escape_string(json_encode($t['features'] ?? []));
                $dailyRate = (float)($t['dailyRateUsd'] ?? 3.5);
                $ctaText = $conn->real_escape_string($t['ctaText'] ?? 'Boost as Sponsored');
                $isActive = !empty($t['isActive']) ? 1 : 0;
                $accentColor = $conn->real_escape_string($t['accentColor'] ?? 'indigo');
                $sortOrder = (int)($t['sortOrder'] ?? 0);
                $rating = (float)($t['rating'] ?? 4.9);
                $enrolledText = $conn->real_escape_string($t['enrolledText'] ?? '2,150+ students enrolled');

                $upsertSql = "INSERT INTO `promotion_tiers` 
                    (`id`, `badge_type`, `name`, `badge_label`, `description`, `features`, `daily_rate_usd`, `cta_text`, `is_active`, `accent_color`, `sort_order`, `rating`, `enrolled_text`, `updated_at`)
                    VALUES ('$id', '$badgeType', '$name', '$badgeLabel', '$description', '$featuresJson', $dailyRate, '$ctaText', $isActive, '$accentColor', $sortOrder, $rating, '$enrolledText', NOW())
                    ON DUPLICATE KEY UPDATE 
                    `name` = '$name', `badge_label` = '$badgeLabel', `description` = '$description', `features` = '$featuresJson',
                    `daily_rate_usd` = $dailyRate, `cta_text` = '$ctaText', `is_active` = $isActive, `accent_color` = '$accentColor', `rating` = $rating, `enrolled_text` = '$enrolledText', `updated_at` = NOW()";

                $conn->query($upsertSql);
            }

            echo json_encode([
                'success' => true,
                'message' => 'All promotion tiers saved successfully.'
            ]);
            exit;
        }

        echo json_encode([
            'success' => false,
            'message' => 'Unknown action or missing parameters.'
        ]);
        exit;
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}