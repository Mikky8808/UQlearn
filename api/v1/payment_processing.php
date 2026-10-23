<?php
require_once __DIR__ . '/cors.php';
/**
 * PayHero M-Pesa STK Push API Endpoint (Production Secure)
 * Path: /api/v1/payment_processing.php
 */



header("Content-Type: application/json; charset=UTF-8");


require_once __DIR__ . '/db.php';
$phConfig = include __DIR__ . '/ph.php';

// Disable fatal exception throwing for non-critical checks
mysqli_report(MYSQLI_REPORT_OFF);

/**
 * Helper to get existing columns in `payments` table
 */
function getPaymentsExistingColumns($conn) {
    $existing = [];
    $res = $conn->query("SHOW COLUMNS FROM `payments`");
    if ($res) {
        while ($col = $res->fetch_assoc()) {
            $existing[] = $col['Field'];
        }
    }
    return $existing;
}

/**
 * Dynamic Fail-Safe Insert into `payments` table with Idempotency & Validation
 */
function safeInsertPayment($conn, $data) {
    $existingCols = getPaymentsExistingColumns($conn);
    $insertData = [];

    $txId = $data['transaction_id'] ?? ('tx_' . uniqid());
    $extRef = $data['external_reference'] ?? ('PH_' . time());

    // Idempotency check: If external_reference already exists, return existing txId
    $stmtCheck = $conn->prepare("SELECT transaction_id FROM payments WHERE external_reference = ? LIMIT 1");
    if ($stmtCheck) {
        $stmtCheck->bind_param("s", $extRef);
        $stmtCheck->execute();
        $res = $stmtCheck->get_result();
        if ($res && $row = $res->fetch_assoc()) {
            $stmtCheck->close();
            return $row['transaction_id'] ?? $txId;
        }
        $stmtCheck->close();
    }

    if (in_array('id', $existingCols)) {
        $insertData['id'] = $txId;
    }
    if (in_array('transaction_id', $existingCols)) {
        $insertData['transaction_id'] = $txId;
    }
    if (in_array('user_id', $existingCols)) {
        $insertData['user_id'] = $data['user_id'] ?? $data['student_id'] ?? 'usr_guest';
    }
    if (in_array('student_id', $existingCols)) {
        $insertData['student_id'] = $data['student_id'] ?? $data['user_id'] ?? 'usr_guest';
    }
    if (in_array('course_id', $existingCols)) {
        $insertData['course_id'] = $data['course_id'] ?? '';
    }
    if (in_array('amount', $existingCols)) {
        $insertData['amount'] = floatval($data['amount'] ?? 0);
    }
    if (in_array('status', $existingCols)) {
        $insertData['status'] = $data['status'] ?? 'QUEUED';
    }
    if (in_array('external_reference', $existingCols)) {
        $insertData['external_reference'] = $extRef;
    }
    if (in_array('channel_id', $existingCols)) {
        $insertData['channel_id'] = intval($data['channel_id'] ?? 3501);
    }
    if (in_array('provider', $existingCols)) {
        $insertData['provider'] = $data['provider'] ?? 'm-pesa';
    }
    if (in_array('phone_number', $existingCols)) {
        $insertData['phone_number'] = $data['phone_number'] ?? '0000000000';
    }
    if (in_array('subscription_id', $existingCols)) {
        $insertData['subscription_id'] = $data['subscription_id'] ?? '';
    }
    if (isset($data['callback_payload']) && in_array('callback_payload', $existingCols)) {
        $insertData['callback_payload'] = $data['callback_payload'];
    }

    if (empty($insertData)) {
        return $txId;
    }

    $colNames = array_keys($insertData);
    $placeholders = array_fill(0, count($colNames), '?');
    $sql = "INSERT INTO `payments` (`" . implode("`, `", $colNames) . "`) VALUES (" . implode(", ", $placeholders) . ")";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Failed to prepare payments insert statement: " . $conn->error);
        return $txId;
    }

    $types = '';
    $values = [];
    foreach ($colNames as $col) {
        $val = $insertData[$col];
        if (is_int($val)) {
            $types .= 'i';
        } elseif (is_float($val) || is_double($val)) {
            $types .= 'd';
        } else {
            $types .= 's';
        }
        $values[] = $val;
    }

    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $stmt->close();

    return $txId;
}

$inputRaw = file_get_contents("php://input");
$input = json_decode($inputRaw, true);
if (!$input || !is_array($input)) {
    $input = !empty($_POST) ? $_POST : (!empty($_GET) ? $_GET : []);
}
$action = $_GET['action'] ?? $input['action'] ?? 'stk_push';

/**
 * Format Phone Number to Kenyan M-Pesa standard
 */
function sanitizePhone($phone) {
    $clean = preg_replace('/[^0-9]/', '', $phone);
    if (strpos($clean, '254') === 0 && strlen($clean) === 12) {
        return $clean;
    }
    if (strpos($clean, '0') === 0 && strlen($clean) === 10) {
        return '254' . substr($clean, 1);
    }
    if (strlen($clean) === 9) {
        return '254' . $clean;
    }
    return $clean;
}

/**
 * Auto-enroll student into purchases table upon payment success
 */
function enrollStudentInCourse($conn, $userId, $courseId) {
    if (empty($userId) || empty($courseId)) return;
    $purchaseId = 'prch_' . uniqid();
    $stmt = $conn->prepare("INSERT IGNORE INTO purchases (id, user_id, course_id, amount, payment_status, created_at) VALUES (?, ?, ?, 0.00, 'completed', NOW())");
    if ($stmt) {
        $stmt->bind_param("sss", $purchaseId, $userId, $courseId);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Retrieve PayHero credentials securely from payment_gateways table or environment
 */
/**
 * Retrieve PayHero credentials from ph.php config store
 */
function getPayHeroCredentials($conn, $input) {
    global $phConfig;
    $authToken = $phConfig['auth_token'] ?? 'Basic YTdwanpzdE1SOER5NGdER0hpQnA6T01KdnpoN29LVWdybnk1VmlIQkI3YmVkc0VoSDJPZU9OTHliT1JBNQ==';
    if (strpos($authToken, 'Basic ') !== 0) {
        $authToken = 'Basic ' . $authToken;
    }
    return $authToken;
}

// -------------------------------------------------------------
// ROUTE HANDLERS
// -------------------------------------------------------------

if ($action === 'stk_push' || $action === 'initiate_stk') {
    $rawAmount = $input['amount'] ?? $input['Amount'] ?? $_REQUEST['amount'] ?? $_REQUEST['Amount'] ?? 0;
    $baseAmount = floatval($rawAmount);
    if ($baseAmount <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid payment amount. Course price must be greater than zero.']);
        exit;
    }
    
    $currency = strtoupper($input['currency'] ?? $_REQUEST['currency'] ?? 'USD');
    $exchangeRate = 130; // Fallback conversion rate: 1 USD = 130 KES
    
    if ($currency !== 'KES') {
        $amount = intval(round($baseAmount * $exchangeRate));
    } else {
        $amount = intval(round($baseAmount));
    }

    if ($amount <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid payment amount."]);
        exit();
    }

    $phone = sanitizePhone($input['phone_number'] ?? $input['phone'] ?? '');
    if (empty($phone) || strlen($phone) < 10) {
        echo json_encode(["success" => false, "message" => "Please enter a valid M-Pesa phone number."]);
        exit();
    }

    // Input Validation: Email
    $studentEmail = filter_var($input['student_email'] ?? 'student@uqlearn.org', FILTER_VALIDATE_EMAIL);
    if (!$studentEmail) {
        $studentEmail = 'student@uqlearn.org';
    }

    $channelId = intval($phConfig['channel_id'] ?? $input['channel_id'] ?? 3501);
    $provider = $phConfig['provider'] ?? $input['provider'] ?? 'm-pesa';
    $userId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['user_id'] ?? $input['student_id'] ?? 'usr_guest');
    $studentName = htmlspecialchars(trim($input['student_name'] ?? 'Student'), ENT_QUOTES, 'UTF-8');
    $courseId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['course_id'] ?? '');
    $courseTitle = htmlspecialchars(trim($input['course_title'] ?? 'Online Course'), ENT_QUOTES, 'UTF-8');
    
    $extRef = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['external_reference'] ?? ('PH_' . date('YmdHis') . '_' . rand(1000, 9999)));
    $callbackUrl = 'https://uqlearn.org/api/v1/payment_processing.php?action=callback';

    // Idempotency check on subscriptions and payments
    $stmtDup = $conn->prepare("SELECT id FROM payments WHERE external_reference = ? LIMIT 1");
    if ($stmtDup) {
        $stmtDup->bind_param("s", $extRef);
        $stmtDup->execute();
        $dupRes = $stmtDup->get_result();
        if ($dupRes && $dupRes->num_rows > 0) {
            echo json_encode(["success" => false, "message" => "Duplicate transaction reference detected."]);
            exit();
        }
        $stmtDup->close();
    }

    $subId = 'sub_' . uniqid();
    $usdPrice = floatval($baseAmount);
    $payNotes = "PayHero M-Pesa STK Push initiated to " . $formattedPhone . " (USD " . number_format($usdPrice, 2) . " = KES " . $amount . ")";

    // Ensure columns exist for original payment currency & raw amount
    @$conn->query("ALTER TABLE `subscriptions` ADD COLUMN `original_amount` decimal(10,2) DEFAULT NULL");
    @$conn->query("ALTER TABLE `subscriptions` ADD COLUMN `original_currency` varchar(10) DEFAULT 'KES'");

    // Check if original_amount column exists
    $colsCheck = $conn->query("SHOW COLUMNS FROM `subscriptions` LIKE 'original_amount'");
    if ($colsCheck && $colsCheck->num_rows > 0) {
        $stmtSub = $conn->prepare("INSERT INTO subscriptions (id, student_id, student_name, student_email, course_id, course_title, course_price, original_amount, original_currency, payment_method, transaction_code, status, enrolled_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'KES', 'payhero_stk', ?, 'pending', NOW(), ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("ssssssddss", $subId, $userId, $studentName, $studentEmail, $courseId, $courseTitle, $usdPrice, $amount, $extRef, $payNotes);
            $stmtSub->execute();
            $stmtSub->close();
        }
    } else {
        $stmtSub = $conn->prepare("INSERT INTO subscriptions (id, student_id, student_name, student_email, course_id, course_title, course_price, payment_method, transaction_code, status, enrolled_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 'payhero_stk', ?, 'pending', NOW(), ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("ssssssdss", $subId, $userId, $studentName, $studentEmail, $courseId, $courseTitle, $usdPrice, $extRef, $payNotes);
            $stmtSub->execute();
            $stmtSub->close();
        }
    }

    // Insert payment record into 'payments' table using safe dynamic mapper
    $txId = 'tx_' . uniqid();
    safeInsertPayment($conn, [
        'transaction_id' => $txId,
        'user_id' => $userId,
        'student_id' => $userId,
        'course_id' => $courseId,
        'amount' => $amount,
        'status' => 'QUEUED',
        'external_reference' => $extRef,
        'channel_id' => $channelId,
        'provider' => $provider,
        'phone_number' => $phone,
        'subscription_id' => $subId
    ]);

    // Retrieve secure authentication token
    $authToken = getPayHeroCredentials($conn, $input);
    $formattedPhone = sanitizePhone($phone);

    $payheroPayload = [
        "amount" => $amount,
        "phone_number" => $formattedPhone,
        "channel_id" => intval($channelId > 0 ? $channelId : 3501),
        "provider" => "m-pesa",
        "external_reference" => (string)$extRef,
        "customer_name" => (string)$studentName,
        "callback_url" => (string)$callbackUrl
    ];

    // Call PayHero v2 Payments API with strict SSL verification enabled
    $endpoint = $phConfig['endpoint_stk'] ?? "https://backend.payhero.co.ke/api/v2/payments";
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: " . $authToken
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payheroPayload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $responseRaw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    $resData = json_decode($responseRaw, true) ?? [];
    $checkoutId = $resData['CheckoutRequestID'] ?? $resData['reference'] ?? $resData['data']['external_reference'] ?? $extRef;
    
    // Log CheckoutRequestID & Response in payments table
    $existingCols = getPaymentsExistingColumns($conn);
    $jsonResp = json_encode($resData);

    if (in_array('checkout_request_id', $existingCols) && in_array('payhero_response', $existingCols)) {
        if (in_array('transaction_id', $existingCols)) {
            $stmtUp = $conn->prepare("UPDATE payments SET checkout_request_id = ?, payhero_response = ? WHERE transaction_id = ? OR external_reference = ?");
            if ($stmtUp) {
                $stmtUp->bind_param("ssss", $checkoutId, $jsonResp, $txId, $extRef);
                $stmtUp->execute();
                $stmtUp->close();
            }
        }
    }

    $isSuccess = false;
    if (($httpCode == 201 || $httpCode == 200) && !empty($resData)) {
        if (isset($resData['success']) && $resData['success'] === true) {
            $isSuccess = true;
        } elseif (isset($resData['status']) && (strtoupper($resData['status']) === "QUEUED" || strtoupper($resData['status']) === "SUCCESS")) {
            $isSuccess = true;
        } elseif (!empty($resData['CheckoutRequestID']) || !empty($resData['reference'])) {
            $isSuccess = true;
        }
    }

    if ($isSuccess) {
        echo json_encode([
            "success" => true,
            "status" => "QUEUED",
            "message" => "STK Push sent to " . $formattedPhone . ". Please enter your M-Pesa PIN on your mobile phone.",
            "transaction_id" => $txId,
            "external_reference" => $extRef,
            "checkout_request_id" => $checkoutId,
            "reference" => $resData['reference'] ?? $checkoutId,
            "subscription_id" => $subId,
            "payhero_response" => $resData
        ]);
    } else {
        $errorMsg = $resData['error_message'] ?? $resData['message'] ?? $resData['error'] ?? ("PayHero STK push failed (HTTP " . $httpCode . ")");

        $stmtSubFail = $conn->prepare("UPDATE subscriptions SET status = 'rejected', notes = ? WHERE id = ?");
        if ($stmtSubFail) {
            $stmtSubFail->bind_param("ss", $errorMsg, $subId);
            $stmtSubFail->execute();
            $stmtSubFail->close();
        }

        $stmtPayFail = $conn->prepare("UPDATE payments SET status = 'FAILED' WHERE transaction_id = ? OR external_reference = ?");
        if ($stmtPayFail) {
            $stmtPayFail->bind_param("ss", $txId, $extRef);
            $stmtPayFail->execute();
            $stmtPayFail->close();
        }

        echo json_encode([
            "success" => false,
            "status" => "FAILED",
            "message" => "M-Pesa STK Push Failed: " . $errorMsg,
            "transaction_id" => $txId,
            "external_reference" => $extRef,
            "subscription_id" => $subId,
            "payhero_response" => $resData
        ]);
    }
    exit();

} elseif ($action === 'status' || $action === 'check_status') {
    $ref = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['reference'] ?? $_GET['reference'] ?? $input['external_reference'] ?? $_GET['external_reference'] ?? $input['checkout_request_id'] ?? $_GET['checkout_request_id'] ?? '');

    if (empty($ref)) {
        echo json_encode(["success" => false, "message" => "Missing transaction reference."]);
        exit();
    }

    $dbStatus = 'PENDING';
    $mpesaCode = '';
    $payRes = null;

    $stmtPayCheck = $conn->prepare("SELECT status, mpesa_receipt_number, checkout_request_id, external_reference, transaction_id, payhero_response FROM payments WHERE external_reference = ? OR checkout_request_id = ? OR transaction_id = ? LIMIT 1");
    if ($stmtPayCheck) {
        $stmtPayCheck->bind_param("sss", $ref, $ref, $ref);
        $stmtPayCheck->execute();
        $payRes = $stmtPayCheck->get_result()->fetch_assoc();
        if ($payRes) {
            $dbStatus = strtoupper($payRes['status'] ?? 'PENDING');
            $mpesaCode = $payRes['mpesa_receipt_number'] ?? '';
        }
        $stmtPayCheck->close();
    }

    if ($dbStatus === 'PENDING' || $dbStatus === 'QUEUED') {
        $stmtSubCheck = $conn->prepare("SELECT status, transaction_code FROM subscriptions WHERE transaction_code = ? OR external_reference = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?) LIMIT 1");
        if ($stmtSubCheck) {
            $stmtSubCheck->bind_param("ssss", $ref, $ref, $ref, $ref);
            $stmtSubCheck->execute();
            $subRes = $stmtSubCheck->get_result()->fetch_assoc();
            if ($subRes) {
                $subStat = strtoupper($subRes['status'] ?? '');
                if ($subStat === 'ACTIVE' || $subStat === 'COMPLETED') {
                    $dbStatus = 'SUCCESS';
                    if (!empty($subRes['transaction_code'])) $mpesaCode = $subRes['transaction_code'];
                } elseif ($subStat === 'REJECTED' || $subStat === 'FAILED') {
                    $dbStatus = 'FAILED';
                }
            }
            $stmtSubCheck->close();
        }
    }

    if ($dbStatus === 'SUCCESS' || $dbStatus === 'COMPLETED' || $dbStatus === 'SUCCESSFUL') {
        echo json_encode([
            "success" => true,
            "status" => "COMPLETED",
            "message" => "Payment completed and verified.",
            "data" => [
                "status" => "COMPLETED",
                "reference" => $ref,
                "mpesa_receipt" => $mpesaCode
            ]
        ]);
        exit();
    } elseif ($dbStatus === 'FAILED' || $dbStatus === 'CANCELLED' || $dbStatus === 'REJECTED') {
        echo json_encode([
            "success" => false,
            "status" => "FAILED",
            "message" => "Payment failed or was cancelled.",
            "data" => [
                "status" => "FAILED",
                "reference" => $ref
            ]
        ]);
        exit();
    }

    // Query PayHero v2 transaction-status API with SSL verification enabled
    $authToken = getPayHeroCredentials($conn, $input);
    $queryRef = $ref;
    if ($payRes && !empty($payRes['payhero_response'])) {
        $phSaved = json_decode($payRes['payhero_response'], true);
        if (!empty($phSaved['reference'])) {
            $queryRef = $phSaved['reference'];
        }
    }

    $statusUrl = "https://backend.payhero.co.ke/api/v2/transaction-status?reference=" . urlencode($queryRef);

    $chPH = curl_init($statusUrl);
    curl_setopt($chPH, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Accept: application/json",
        "Authorization: " . $authToken
    ]);
    curl_setopt($chPH, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chPH, CURLOPT_TIMEOUT, 15);
    curl_setopt($chPH, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($chPH, CURLOPT_SSL_VERIFYHOST, 2);

    $responseRaw = curl_exec($chPH);
    $httpCode = curl_getinfo($chPH, CURLINFO_HTTP_CODE);
    curl_close($chPH);

    $resData = json_decode($responseRaw, true) ?? [];
    $phStatus = strtoupper($resData['status'] ?? '');
    if (empty($phStatus) && isset($resData['success'])) {
        $phStatus = ($resData['success'] === true) ? 'SUCCESS' : 'FAILED';
    }

    $mpesaReceipt = $resData['third_party_reference'] 
        ?? $resData['provider_reference'] 
        ?? $resData['MpesaReceiptNumber'] 
        ?? $resData['mpesa_receipt'] 
        ?? $mpesaCode;

    if ($phStatus === 'SUCCESS' || $phStatus === 'COMPLETED' || $phStatus === 'SUCCESSFUL') {
        $stmtSub = $conn->prepare("UPDATE subscriptions SET status = 'active', activated_at = NOW(), transaction_code = IF(? != '', ?, transaction_code) WHERE transaction_code = ? OR external_reference = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("ssssss", $mpesaReceipt, $mpesaReceipt, $ref, $ref, $ref, $ref);
            $stmtSub->execute();
            $stmtSub->close();
        }

        $stmtPay = $conn->prepare("UPDATE payments SET status = 'SUCCESS', mpesa_receipt_number = IF(? != '', ?, mpesa_receipt_number) WHERE external_reference = ? OR checkout_request_id = ? OR transaction_id = ?");
        if ($stmtPay) {
            $stmtPay->bind_param("sssss", $mpesaReceipt, $mpesaReceipt, $ref, $ref, $ref);
            $stmtPay->execute();
            $stmtPay->close();
        }

        $stmtSel = $conn->prepare("SELECT external_reference, course_id FROM payments WHERE external_reference = ? OR checkout_request_id = ? OR transaction_id = ? LIMIT 1");
        if ($stmtSel) {
            $stmtSel->bind_param("sss", $ref, $ref, $ref);
            $stmtSel->execute();
            $payRow = $stmtSel->get_result()->fetch_assoc();
            if ($payRow && !empty($payRow['course_id'])) {
                $stmtSubSel = $conn->prepare("SELECT student_id FROM subscriptions WHERE transaction_code = ? OR external_reference = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?) LIMIT 1");
                if ($stmtSubSel) {
                    $stmtSubSel->bind_param("ssss", $ref, $ref, $ref, $ref);
                    $stmtSubSel->execute();
                    $subRow = $stmtSubSel->get_result()->fetch_assoc();
                    if ($subRow && !empty($subRow['student_id'])) {
                        enrollStudentInCourse($conn, $subRow['student_id'], $payRow['course_id']);
                    }
                    $stmtSubSel->close();
                }
            }
            $stmtSel->close();
        }

        echo json_encode([
            "success" => true,
            "status" => "COMPLETED",
            "message" => "Payment confirmed by PayHero.",
            "data" => [
                "status" => "COMPLETED",
                "mpesa_receipt" => $mpesaReceipt,
                "reference" => $ref,
                "payhero_reference" => $resData['reference'] ?? $queryRef,
                "raw" => $resData
            ]
        ]);
    } elseif ($phStatus === 'FAILED' || $phStatus === 'CANCELLED') {
        $stmtSub = $conn->prepare("UPDATE subscriptions SET status = 'rejected' WHERE transaction_code = ? OR external_reference = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("ssss", $ref, $ref, $ref, $ref);
            $stmtSub->execute();
            $stmtSub->close();
        }

        $stmtPay = $conn->prepare("UPDATE payments SET status = 'FAILED' WHERE external_reference = ? OR checkout_request_id = ? OR transaction_id = ?");
        if ($stmtPay) {
            $stmtPay->bind_param("sss", $ref, $ref, $ref);
            $stmtPay->execute();
            $stmtPay->close();
        }

        echo json_encode([
            "success" => false,
            "status" => "FAILED",
            "message" => "Payment failed or cancelled.",
            "data" => [
                "status" => "FAILED",
                "reference" => $ref,
                "raw" => $resData
            ]
        ]);
    } else {
        echo json_encode([
            "success" => true,
            "status" => "PENDING",
            "message" => "Payment status is queued awaiting PIN entry.",
            "data" => [
                "status" => "PENDING",
                "reference" => $ref,
                "raw" => $resData
            ]
        ]);
    }
    exit();

} elseif ($action === 'callback' || $action === 'webhook') {
    $cbTxId = 'cb_' . uniqid();
    $responseObj = $input['response'] ?? $input;
    $status = strtoupper($responseObj['Status'] ?? $responseObj['status'] ?? 'PENDING');
    $extRef = preg_replace('/[^a-zA-Z0-9_\-]/', '', $responseObj['ExternalReference'] ?? $responseObj['external_reference'] ?? '');
    $mpesaCode = preg_replace('/[^a-zA-Z0-9]/', '', $responseObj['MpesaReceiptNumber'] ?? $responseObj['mpesa_code'] ?? '');
    $checkoutId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $responseObj['CheckoutRequestID'] ?? $responseObj['checkout_request_id'] ?? '');

    safeInsertPayment($conn, [
        'transaction_id' => $cbTxId,
        'user_id' => 'callback_user',
        'student_id' => 'callback_user',
        'course_id' => 'callback_course',
        'amount' => 0,
        'status' => $status,
        'external_reference' => $extRef,
        'checkout_request_id' => $checkoutId,
        'channel_id' => 3501,
        'provider' => 'm-pesa',
        'phone_number' => '0000000000',
        'callback_payload' => json_encode($input)
    ]);

    if ($status === 'SUCCESS' || $status === 'SUCCESSFUL' || $status === 'COMPLETED') {
        $stmtSub = $conn->prepare("UPDATE subscriptions SET status = 'active', activated_at = NOW(), transaction_code = IF(? != '', ?, transaction_code) WHERE transaction_code = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("sssss", $mpesaCode, $mpesaCode, $extRef, $extRef, $checkoutId);
            $stmtSub->execute();
            $stmtSub->close();
        }

        $existingCols = getPaymentsExistingColumns($conn);
        if (in_array('mpesa_receipt_number', $existingCols)) {
            $stmtPay = $conn->prepare("UPDATE payments SET status = 'SUCCESS', mpesa_receipt_number = ? WHERE external_reference = ? OR checkout_request_id = ?");
            if ($stmtPay) {
                $stmtPay->bind_param("sss", $mpesaCode, $extRef, $checkoutId);
                $stmtPay->execute();
                $stmtPay->close();
            }
        }

        $stmtSel = $conn->prepare("SELECT external_reference, course_id FROM payments WHERE external_reference = ? OR checkout_request_id = ? LIMIT 1");
        if ($stmtSel) {
            $stmtSel->bind_param("ss", $extRef, $checkoutId);
            $stmtSel->execute();
            $payRow = $stmtSel->get_result()->fetch_assoc();
            if ($payRow && !empty($payRow['course_id'])) {
                $stmtSubSel = $conn->prepare("SELECT student_id FROM subscriptions WHERE transaction_code = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ?) LIMIT 1");
                if ($stmtSubSel) {
                    $stmtSubSel->bind_param("ss", $extRef, $extRef);
                    $stmtSubSel->execute();
                    $subRow = $stmtSubSel->get_result()->fetch_assoc();
                    if ($subRow) {
                        enrollStudentInCourse($conn, $subRow['student_id'], $payRow['course_id']);
                    }
                    $stmtSubSel->close();
                }
            }
            $stmtSel->close();
        }
    } elseif ($status === 'FAILED' || $status === 'CANCELLED') {
        $stmtSub = $conn->prepare("UPDATE subscriptions SET status = 'rejected' WHERE transaction_code = ? OR id IN (SELECT subscription_id FROM payments WHERE external_reference = ? OR checkout_request_id = ?)");
        if ($stmtSub) {
            $stmtSub->bind_param("sss", $extRef, $extRef, $checkoutId);
            $stmtSub->execute();
            $stmtSub->close();
        }

        $stmtPay = $conn->prepare("UPDATE payments SET status = 'FAILED' WHERE external_reference = ? OR checkout_request_id = ?");
        if ($stmtPay) {
            $stmtPay->bind_param("ss", $extRef, $checkoutId);
            $stmtPay->execute();
            $stmtPay->close();
        }
    }

    echo json_encode(["status" => "ok", "message" => "PayHero STK callback processed successfully"]);
    exit();

} elseif ($action === 'get_subscriptions' || $action === 'get_payments' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['user_id'] ?? $_GET['student_id'] ?? '');
    
    $existingCols = getPaymentsExistingColumns($conn);
    $userColName = in_array('user_id', $existingCols) ? 'user_id' : (in_array('student_id', $existingCols) ? 'student_id' : '');

    if (!empty($userId) && !empty($userColName)) {
        $stmt = $conn->prepare("SELECT * FROM payments WHERE `$userColName` = ? ORDER BY created_at DESC LIMIT 100");
        $stmt->bind_param("s", $userId);
    } else {
        $stmt = $conn->prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 100");
    }

    if ($stmt) {
        $stmt->execute();
        $res = $stmt->get_result();
        $payments = [];
        while ($row = $res->fetch_assoc()) {
            $payments[] = [
                'transaction_id' => $row['transaction_id'] ?? $row['id'] ?? '',
                'user_id' => $row['user_id'] ?? $row['student_id'] ?? '',
                'student_id' => $row['student_id'] ?? $row['user_id'] ?? '',
                'course_id' => $row['course_id'] ?? '',
                'amount' => floatval($row['amount'] ?? 0),
                'status' => $row['status'] ?? 'QUEUED',
                'checkout_request_id' => $row['checkout_request_id'] ?? '',
                'external_reference' => $row['external_reference'] ?? '',
                'mpesa_receipt_number' => $row['mpesa_receipt_number'] ?? '',
                'channel_id' => intval($row['channel_id'] ?? 3501),
                'phone_number' => $row['phone_number'] ?? '',
                'created_at' => $row['created_at'] ?? ''
            ];
        }
        $stmt->close();
        echo json_encode(["success" => true, "payments" => $payments]);
        exit();
    }
}

echo json_encode(["success" => false, "message" => "Invalid action requested"]);
?>
