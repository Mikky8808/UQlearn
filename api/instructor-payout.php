<?php
require_once __DIR__ . '/cors.php';
/**
 * Instructor Payout Settings API Endpoint (PHP Backend for Shared Hosting / MySQL)
 * LMS Platform - UQlearn
 * 
 * Path: /api/v1/instructor-payout.php
 * 
 * Manages instructor bank account and payout details.
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    $createTableSql = "CREATE TABLE IF NOT EXISTS `instructor_payout_settings` (
        `user_id` VARCHAR(64) PRIMARY KEY,
        `country_id` VARCHAR(64) DEFAULT NULL,
        `country` VARCHAR(128) DEFAULT NULL,
        `bank_name` VARCHAR(128) DEFAULT NULL,
        `account_number` VARCHAR(128) DEFAULT NULL,
        `full_name` VARCHAR(128) DEFAULT NULL,
        `email` VARCHAR(128) DEFAULT NULL,
        `phone` VARCHAR(64) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($createTableSql);

    $createWithdrawalsSql = "CREATE TABLE IF NOT EXISTS `instructor_withdrawals` (
        `id` VARCHAR(64) PRIMARY KEY,
        `instructor_id` VARCHAR(64) DEFAULT NULL,
        `instructor_email` VARCHAR(128) DEFAULT NULL,
        `instructor_name` VARCHAR(128) DEFAULT NULL,
        `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `currency` VARCHAR(16) DEFAULT 'KES',
        `bank_name` VARCHAR(128) DEFAULT NULL,
        `account_number` VARCHAR(128) DEFAULT NULL,
        `account_name` VARCHAR(128) DEFAULT NULL,
        `country` VARCHAR(64) DEFAULT 'Kenya',
        `status` VARCHAR(32) DEFAULT 'pending',
        `reference` VARCHAR(64) DEFAULT NULL,
        `notes` TEXT DEFAULT NULL,
        `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `settled_at` DATETIME DEFAULT NULL,
        INDEX `idx_instructor` (`instructor_id`),
        INDEX `idx_email` (`instructor_email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($createWithdrawalsSql);

    $createBalancesSql = "CREATE TABLE IF NOT EXISTS `instructor_balances` (
        `user_id` VARCHAR(64) PRIMARY KEY,
        `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `gross_earned` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `total_withdrawn` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createBalancesSql);

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $action = $_GET['action'] ?? '';
        if ($action === 'balance') {
            $userId = $_GET['user_id'] ?? $_GET['userId'] ?? $_GET['instructor_id'] ?? '';
            $stmt = $conn->prepare("SELECT * FROM `instructor_balances` WHERE `user_id` = ?");
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $res = $stmt->get_result();
            $balance = $res->fetch_assoc();
            echo json_encode(['success' => true, 'data' => $balance ?: ['current_balance' => 0, 'gross_earned' => 0, 'total_withdrawn' => 0]]);
            exit();
        }

        if ($action === 'withdrawals') {
            $instructorId = $_GET['instructor_id'] ?? $_GET['user_id'] ?? '';
            $instructorEmail = $_GET['instructor_email'] ?? '';
            $list = [];
            if (!empty($instructorId) || !empty($instructorEmail)) {
                $stmt = $conn->prepare("SELECT * FROM `instructor_withdrawals` WHERE `instructor_id` = ? OR `instructor_email` = ? ORDER BY `requested_at` DESC");
                $stmt->bind_param("ss", $instructorId, $instructorEmail);
            } else {
                $stmt = $conn->prepare("SELECT * FROM `instructor_withdrawals` ORDER BY `requested_at` DESC LIMIT 200");
            }
            if ($stmt && $stmt->execute()) {
                $res = $stmt->get_result();
                while ($r = $res->fetch_assoc()) {
                    $list[] = [
                        'id' => $r['id'],
                        'instructorId' => $r['instructor_id'],
                        'instructorEmail' => $r['instructor_email'],
                        'instructorName' => $r['instructor_name'],
                        'amount' => (float)$r['amount'],
                        'currency' => $r['currency'],
                        'bankName' => $r['bank_name'],
                        'accountNumber' => $r['account_number'],
                        'accountName' => $r['account_name'],
                        'country' => $r['country'],
                        'status' => $r['status'],
                        'reference' => $r['reference'],
                        'notes' => $r['notes'],
                        'requestedAt' => $r['requested_at'],
                        'settledAt' => $r['settled_at']
                    ];
                }
            }
            echo json_encode(['success' => true, 'data' => $list]);
            exit();
        }

        $userId = $_GET['user_id'] ?? $_GET['userId'] ?? $_GET['instructor_id'] ?? $_GET['instructor_email'] ?? '';
        if (empty($userId)) {
            echo json_encode(['success' => true, 'data' => null]);
            exit();
        }

        $stmt = $conn->prepare("SELECT * FROM `instructor_payout_settings` WHERE `user_id` = ? OR `email` = ? LIMIT 1");
        $stmt->bind_param("ss", $userId, $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();

        if ($row) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'userId' => $row['user_id'],
                    'countryId' => $row['country_id'],
                    'country' => $row['country'],
                    'bankName' => $row['bank_name'],
                    'accountNumber' => $row['account_number'],
                    'fullName' => $row['full_name'],
                    'accountHolderName' => $row['full_name'],
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                    'phoneNumber' => $row['phone'],
                    'updatedAt' => $row['updated_at']
                ]
            ]);
        } else {
            echo json_encode(['success' => true, 'data' => null]);
        }
        exit();
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $action = $input['action'] ?? '';
        if ($action === 'request_withdrawal') {
            $instId = $input['instructorId'] ?? $input['instructor_id'] ?? $input['user_id'] ?? '';
            $amount = (float)($input['amount'] ?? 0);
            
            // Check funds
            $stmt = $conn->prepare("SELECT current_balance FROM `instructor_balances` WHERE `user_id` = ?");
            $stmt->bind_param("s", $instId);
            $stmt->execute();
            $res = $stmt->get_result();
            $balance = $res->fetch_assoc();

            if (!$balance || $balance['current_balance'] < $amount) {
                echo json_encode(['success' => false, 'message' => 'Insufficient funds']);
                exit();
            }

            // Record Withdrawal
            $wId = $input['id'] ?? ('wd_' . time() . '_' . rand(1000, 9999));
            $instEmail = $input['instructorEmail'] ?? $input['instructor_email'] ?? '';
            $instName = $input['instructorName'] ?? $input['instructor_name'] ?? 'Instructor';
            $currency = $input['currency'] ?? 'KES';
            $bankName = $input['bankName'] ?? $input['bank_name'] ?? '';
            $accountNumber = $input['accountNumber'] ?? $input['account_number'] ?? '';
            $accountName = $input['accountName'] ?? $input['account_name'] ?? $instName;
            $country = $input['country'] ?? 'Kenya';
            $status = $input['status'] ?? 'pending';
            $reference = $input['reference'] ?? ('WD-' . date('Ymd') . '-' . rand(1000, 9999));
            $notes = $input['notes'] ?? '';

            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare("INSERT INTO `instructor_withdrawals` 
                    (`id`, `instructor_id`, `instructor_email`, `instructor_name`, `amount`, `currency`, `bank_name`, `account_number`, `account_name`, `country`, `status`, `reference`, `notes`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssssdssssssss", $wId, $instId, $instEmail, $instName, $amount, $currency, $bankName, $accountNumber, $accountName, $country, $status, $reference, $notes);
                $stmt->execute();

                // Update Balance
                $stmt = $conn->prepare("UPDATE `instructor_balances` SET `current_balance` = `current_balance` - ?, `total_withdrawn` = `total_withdrawn` + ? WHERE `user_id` = ?");
                $stmt->bind_param("dds", $amount, $amount, $instId);
                $stmt->execute();

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Withdrawal request recorded and balance updated']);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => 'Transaction failed: ' . $e->getMessage()]);
            }
            exit();
        }

        $userId = $input['user_id'] ?? $input['userId'] ?? $input['instructorId'] ?? $input['email'] ?? '';
        if (empty($userId)) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        $countryId = $input['countryId'] ?? $input['country_id'] ?? '';
        $country = $input['country'] ?? $input['bankCountry'] ?? '';
        $bankName = $input['bankName'] ?? $input['bank_name'] ?? '';
        $accountNumber = $input['accountNumber'] ?? $input['account_number'] ?? '';
        $fullName = $input['fullName'] ?? $input['full_name'] ?? $input['accountHolderName'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? $input['phoneNumber'] ?? '';

        $stmt = $conn->prepare("INSERT INTO `instructor_payout_settings` 
            (`user_id`, `country_id`, `country`, `bank_name`, `account_number`, `full_name`, `email`, `phone`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            `country_id` = VALUES(`country_id`), 
            `country` = VALUES(`country`), 
            `bank_name` = VALUES(`bank_name`), 
            `account_number` = VALUES(`account_number`), 
            `full_name` = VALUES(`full_name`), 
            `email` = VALUES(`email`), 
            `phone` = VALUES(`phone`)");

        $stmt->bind_param("ssssssss", $userId, $countryId, $country, $bankName, $accountNumber, $fullName, $email, $phone);
        $success = $stmt->execute();

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Instructor payout settings saved to database successfully',
                'data' => [
                    'userId' => $userId,
                    'countryId' => $countryId,
                    'country' => $country,
                    'bankName' => $bankName,
                    'accountNumber' => $accountNumber,
                    'fullName' => $fullName,
                    'email' => $email,
                    'phone' => $phone
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => $conn->error]);
        }
        exit();
    }


} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
