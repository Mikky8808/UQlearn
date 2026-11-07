<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

// Auto-migrate instructor_plans table if it does not exist
function ensureInstructorPlansTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return;
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `instructor_plans` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` VARCHAR(64) NOT NULL UNIQUE,
            `plan_type` VARCHAR(32) DEFAULT 'pro',
            `plan_name` VARCHAR(100) DEFAULT 'Pro / Turbo Plan',
            `status` VARCHAR(20) DEFAULT 'active',
            `price` DECIMAL(10,2) DEFAULT 29.99,
            `billing_cycle` VARCHAR(20) DEFAULT 'monthly',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY `idx_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } catch (Exception $e) {
        // Silent resilience catch
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureInstructorPlansTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['user_id'] ?? $_GET['userId'] ?? 'default_instructor';

    try {
        $stmt = $conn->prepare("SELECT * FROM `instructor_plans` WHERE `user_id` = ? LIMIT 1");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result && $result->num_rows > 0) {
            $plan = $result->fetch_assoc();
            $isPro = in_array(strtolower($plan['plan_type']), ['pro', 'turbo', 'pro_turbo']);
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => $plan['id'],
                    'user_id' => $plan['user_id'],
                    'plan_type' => $plan['plan_type'],
                    'plan_name' => $plan['plan_name'],
                    'status' => $plan['status'],
                    'price' => (float)$plan['price'],
                    'billing_cycle' => $plan['billing_cycle'],
                    'is_pro' => $isPro,
                    'updated_at' => $plan['updated_at']
                ]
            ]);
        } else {
            // Default: Auto-provision Pro Plan ("pro plan only no free plan")
            $defaultPlanType = 'pro';
            $defaultPlanName = 'Pro / Turbo Plan';
            $defaultStatus = 'active';
            $defaultPrice = 29.99;
            $defaultCycle = 'monthly';

            $insStmt = $conn->prepare("INSERT INTO `instructor_plans` (`user_id`, `plan_type`, `plan_name`, `status`, `price`, `billing_cycle`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `plan_type` = VALUES(`plan_type`), `status` = VALUES(`status`)");
            $insStmt->bind_param("ssssds", $userId, $defaultPlanType, $defaultPlanName, $defaultStatus, $defaultPrice, $defaultCycle);
            $insStmt->execute();

            echo json_encode([
                'success' => true,
                'data' => [
                    'user_id' => $userId,
                    'plan_type' => 'pro',
                    'plan_name' => 'Pro / Turbo Plan',
                    'status' => 'active',
                    'price' => 29.99,
                    'billing_cycle' => 'monthly',
                    'is_pro' => true,
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $e->getMessage()]);
    }
} elseif ($method === 'POST' || $method === 'PUT') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;

    $userId = $input['user_id'] ?? $input['userId'] ?? 'default_instructor';
    $planType = $input['plan_type'] ?? $input['planType'] ?? 'pro';
    $planName = $input['plan_name'] ?? $input['planName'] ?? ($planType === 'free' ? 'Free Plan' : 'Pro / Turbo Plan');
    $status = $input['status'] ?? 'active';
    $price = isset($input['price']) ? (float)$input['price'] : ($planType === 'free' ? 0.00 : 29.99);
    $billingCycle = $input['billing_cycle'] ?? $input['billingCycle'] ?? 'monthly';

    try {
        $stmt = $conn->prepare("
            INSERT INTO `instructor_plans` (`user_id`, `plan_type`, `plan_name`, `status`, `price`, `billing_cycle`) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                `plan_type` = VALUES(`plan_type`),
                `plan_name` = VALUES(`plan_name`),
                `status` = VALUES(`status`),
                `price` = VALUES(`price`),
                `billing_cycle` = VALUES(`billing_cycle`),
                `updated_at` = NOW()
        ");
        $stmt->bind_param("ssssds", $userId, $planType, $planName, $status, $price, $billingCycle);

        if ($stmt->execute()) {
            $isPro = in_array(strtolower($planType), ['pro', 'turbo', 'pro_turbo']);
            echo json_encode([
                'success' => true,
                'message' => 'Instructor plan updated successfully',
                'data' => [
                    'user_id' => $userId,
                    'plan_type' => $planType,
                    'plan_name' => $planName,
                    'status' => $status,
                    'price' => $price,
                    'billing_cycle' => $billingCycle,
                    'is_pro' => $isPro
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save instructor plan: ' . $conn->error]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
