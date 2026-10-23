<?php
require_once __DIR__ . '/cors.php';
/**
 * Currency Preferences & Supported Currencies API
 * Path: /api/v1/currencies.php
 * Handles fetching supported currencies and updating instructor/user system currency preferences in MySQL.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create currencies table
    $conn->query("CREATE TABLE IF NOT EXISTS `currencies` (
        `code` VARCHAR(10) NOT NULL PRIMARY KEY,
        `symbol` VARCHAR(10) NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        `exchange_rate` DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
        `is_default` TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Seed default currencies if table is empty
    $res_check = $conn->query("SELECT COUNT(*) as cnt FROM currencies");
    $row_check = $res_check ? $res_check->fetch_assoc() : ['cnt' => 0];
    if (intval($row_check['cnt']) === 0) {
        $conn->query("INSERT INTO currencies (code, symbol, name, exchange_rate, is_default) VALUES 
            ('KES', 'KSh', 'Kenyan Shilling', 130.0000, 1),
            ('USD', '$', 'US Dollar', 1.0000, 0),
            ('ZMW', 'ZK', 'Zambian Kwacha', 26.0000, 0),
            ('ZAR', 'R', 'South African Rand', 18.5000, 0),
            ('UGX', 'USh', 'Ugandan Shilling', 3700.0000, 0),
            ('RWF', 'FRw', 'Rwandan Franc', 1300.0000, 0)
        ON DUPLICATE KEY UPDATE name=VALUES(name)");
    }

    // Auto-create user_currency_preferences table
    $conn->query("CREATE TABLE IF NOT EXISTS `user_currency_preferences` (
        `user_id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `currency_code` VARCHAR(10) NOT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $user_id = $_GET['user_id'] ?? ($_GET['userId'] ?? null);

        if ($user_id) {
            $stmt = $conn->prepare("SELECT * FROM user_currency_preferences WHERE user_id = ?");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $pref = $res->fetch_assoc();
            $stmt->close();

            // Also fetch supported currencies list
            $cur_res = $conn->query("SELECT * FROM currencies ORDER BY is_default DESC, code ASC");
            $currencies = [];
            while ($c = $cur_res->fetch_assoc()) {
                $currencies[] = $c;
            }

            echo json_encode([
                "success" => true,
                "preference" => $pref ? $pref['currency_code'] : 'KES',
                "currencies" => $currencies
            ]);
            exit();
        }

        // Return all supported currencies
        $cur_res = $conn->query("SELECT * FROM currencies ORDER BY is_default DESC, code ASC");
        $currencies = [];
        if ($cur_res) {
            while ($c = $cur_res->fetch_assoc()) {
                $currencies[] = $c;
            }
        }

        echo json_encode([
            "success" => true,
            "currencies" => $currencies
        ]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $user_id = $data['user_id'] ?? ($data['userId'] ?? 'current-user');
        $currency_code = $data['currency_code'] ?? ($data['currencyCode'] ?? 'KES');

        if (!$user_id || !$currency_code) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "user_id and currency_code are required"]);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO user_currency_preferences (user_id, currency_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE currency_code = VALUES(currency_code), updated_at = NOW()");
        if ($stmt) {
            $stmt->bind_param("ss", $user_id, $currency_code);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "System currency preference updated successfully to {$currency_code}",
            "currency_code" => $currency_code
        ]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
