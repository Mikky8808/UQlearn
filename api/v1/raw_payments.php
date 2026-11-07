<?php
/**
 * UQLearn LMS - Raw Payments & Multi-Currency Audit API
 * Path: /api/v1/raw_payments.php
 *
 * Saves and retrieves raw amounts directly from payment gateways (PayHero & Paystack)
 * alongside the converted USD course price to provide full transactional transparency.
 */

require_once __DIR__ . '/cors.php';
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

if (!isset($conn) || !($conn instanceof mysqli)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection unavailable.'
    ]);
    exit();
}

// Ensure subscriptions table has original_amount & original_currency columns
@$conn->query("ALTER TABLE `subscriptions` ADD COLUMN IF NOT EXISTS `original_amount` decimal(10,2) DEFAULT NULL");
@$conn->query("ALTER TABLE `subscriptions` ADD COLUMN IF NOT EXISTS `original_currency` varchar(10) DEFAULT 'USD'");

// Ensure raw_payments audit table exists
@$conn->query("CREATE TABLE IF NOT EXISTS `raw_payments` (
  `id` varchar(64) NOT NULL,
  `provider` varchar(30) NOT NULL DEFAULT 'payhero',
  `transaction_code` varchar(100) NOT NULL,
  `external_reference` varchar(100) DEFAULT NULL,
  `student_id` varchar(64) DEFAULT NULL,
  `student_email` varchar(191) DEFAULT NULL,
  `course_id` varchar(64) DEFAULT NULL,
  `raw_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `raw_currency` varchar(10) NOT NULL DEFAULT 'KES',
  `usd_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `exchange_rate` decimal(10,4) NOT NULL DEFAULT 130.0000,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `payload` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_raw_tx` (`transaction_code`),
  KEY `idx_raw_ref` (`external_reference`),
  KEY `idx_raw_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: query raw payment history
if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $provider = trim($_GET['provider'] ?? '');
    $txCode = trim($_GET['transaction_code'] ?? $_GET['reference'] ?? '');
    $studentId = trim($_GET['student_id'] ?? $_GET['user_id'] ?? '');

    $where = ["1=1"];
    $types = "";
    $params = [];

    if (!empty($provider)) {
        $where[] = "provider = ?";
        $types .= "s";
        $params[] = $provider;
    }
    if (!empty($txCode)) {
        $where[] = "(transaction_code = ? OR external_reference = ?)";
        $types .= "ss";
        $params[] = $txCode;
        $params[] = $txCode;
    }
    if (!empty($studentId)) {
        $where[] = "student_id = ?";
        $types .= "s";
        $params[] = $studentId;
    }
    if (!empty($search)) {
        $where[] = "(transaction_code LIKE ? OR student_email LIKE ?)";
        $types .= "ss";
        $sTerm = "%" . $search . "%";
        $params[] = $sTerm;
        $params[] = $sTerm;
    }

    $sql = "SELECT * FROM raw_payments WHERE " . implode(" AND ", $where) . " ORDER BY created_at DESC LIMIT 100";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        if (count($params) > 0) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $records = [];
        while ($row = $res->fetch_assoc()) {
            $records[] = [
                'id' => $row['id'],
                'provider' => $row['provider'],
                'transaction_code' => $row['transaction_code'],
                'external_reference' => $row['external_reference'],
                'student_id' => $row['student_id'],
                'student_email' => $row['student_email'],
                'course_id' => $row['course_id'],
                'raw_amount' => (float)$row['raw_amount'],
                'raw_currency' => $row['raw_currency'],
                'usd_amount' => (float)$row['usd_amount'],
                'exchange_rate' => (float)$row['exchange_rate'],
                'status' => $row['status'],
                'created_at' => $row['created_at']
            ];
        }
        echo json_encode([
            'success' => true,
            'count' => count($records),
            'data' => $records
        ]);
        exit();
    }
}

// Handle POST: record raw gateway amount and ensure USD normalization
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $provider = strtolower(trim($input['provider'] ?? 'payhero'));
    $txCode = trim($input['transaction_code'] ?? $input['reference'] ?? $input['transactionCode'] ?? '');
    $extRef = trim($input['external_reference'] ?? $input['externalReference'] ?? $txCode);
    $studentId = trim($input['student_id'] ?? $input['studentId'] ?? $input['user_id'] ?? '');
    $studentEmail = strtolower(trim($input['student_email'] ?? $input['studentEmail'] ?? ''));
    $studentName = trim($input['student_name'] ?? $input['studentName'] ?? 'Learner');
    $courseId = trim($input['course_id'] ?? $input['courseId'] ?? '');
    $courseTitle = trim($input['course_title'] ?? $input['courseTitle'] ?? 'Course Enrollment');

    $rawAmount = floatval($input['raw_amount'] ?? $input['amount'] ?? 0);
    $rawCurrency = strtoupper(trim($input['raw_currency'] ?? $input['currency'] ?? ($provider === 'payhero' ? 'KES' : 'USD')));
    
    // Exchange rate calculation
    $exchangeRate = floatval($input['exchange_rate'] ?? 130.0);
    if ($exchangeRate <= 0) $exchangeRate = 130.0;

    $usdAmount = floatval($input['usd_amount'] ?? $input['usdPrice'] ?? $input['course_price'] ?? 0);
    if ($usdAmount <= 0) {
        if ($rawCurrency === 'USD') {
            $usdAmount = $rawAmount;
        } else {
            $usdAmount = round($rawAmount / $exchangeRate, 2);
        }
    }

    $status = strtolower(trim($input['status'] ?? 'active'));
    if ($status === 'success' || $status === 'completed') $status = 'active';

    if (empty($txCode)) {
        $txCode = strtoupper($provider) . '_' . time() . '_' . rand(1000, 9999);
    }

    $id = 'raw_' . uniqid() . '_' . substr(md5(microtime()), 0, 5);

    // 1. Insert into raw_payments audit table
    $stmtRaw = $conn->prepare("INSERT INTO `raw_payments` 
        (`id`, `provider`, `transaction_code`, `external_reference`, `student_id`, `student_email`, `course_id`, `raw_amount`, `raw_currency`, `usd_amount`, `exchange_rate`, `status`, `payload`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        `raw_amount` = VALUES(`raw_amount`),
        `raw_currency` = VALUES(`raw_currency`),
        `usd_amount` = VALUES(`usd_amount`),
        `status` = VALUES(`status`);");
    
    $payloadJson = json_encode($input);
    if ($stmtRaw) {
        $stmtRaw->bind_param("sssssssdsddss", $id, $provider, $txCode, $extRef, $studentId, $studentEmail, $courseId, $rawAmount, $rawCurrency, $usdAmount, $exchangeRate, $status, $payloadJson);
        $stmtRaw->execute();
        $stmtRaw->close();
    }

    // 2. Also update matching subscription if present, setting course_price to USD and saving original_amount
    $stmtUpSub = $conn->prepare("UPDATE `subscriptions` SET 
        `course_price` = ?, 
        `original_amount` = ?, 
        `original_currency` = ?, 
        `status` = IF(? = 'active', 'active', `status`),
        `activated_at` = IF(? = 'active' AND (`activated_at` IS NULL OR `activated_at` = ''), NOW(), `activated_at`)
        WHERE `transaction_code` = ? OR `id` = ?");
    if ($stmtUpSub) {
        $stmtUpSub->bind_param("ddsssss", $usdAmount, $rawAmount, $rawCurrency, $status, $status, $txCode, $extRef);
        $stmtUpSub->execute();
        $stmtUpSub->close();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Raw payment logged and USD course price normalized successfully.',
        'data' => [
            'id' => $id,
            'provider' => $provider,
            'transaction_code' => $txCode,
            'raw_amount' => $rawAmount,
            'raw_currency' => $rawCurrency,
            'usd_amount' => $usdAmount,
            'status' => $status
        ]
    ]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
exit();
