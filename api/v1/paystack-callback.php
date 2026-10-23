<?php
/**
 * UQlearn LMS - Paystack Payment Callback & Verification Endpoint
 * 
 * Handles browser redirects and API callbacks following a Paystack payment.
 * Verifies the transaction reference with Paystack, activates course enrollment,
 * records payment/purchase records in MySQL, and redirects the user to their
 * learning dashboard with confirmed status and feedback.
 * 
 * Path: /api/v1/paystack-callback.php
 */

// Error handling settings
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', 0);

require_once __DIR__ . '/cors.php';

// Load Paystack secret key from config
$config = file_exists(__DIR__ . '/paystack-keys.php') 
    ? require __DIR__ . '/paystack-keys.php' 
    : (file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : []);

$PAYSTACK_SECRET_KEY = $config['paystack']['secret_key'] 
    ?? getenv('PAYSTACK_SECRET_KEY') 
    ?: 'sk_live_f57fdd97f82425508e6542e9b59c9bdce105caa0';

// Connect to Database
@require_once __DIR__ . '/db.php';

// Detect Reference from Query or Body
$reference = trim(
    $_GET['reference'] 
    ?? $_GET['trxref'] 
    ?? $_POST['reference'] 
    ?? $_POST['trxref'] 
    ?? ''
);

// If raw JSON body was sent
if (empty($reference)) {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonInput = json_decode($rawInput, true);
        if (is_array($jsonInput)) {
            $reference = trim($jsonInput['reference'] ?? $jsonInput['trxref'] ?? $jsonInput['data']['reference'] ?? '');
        }
    }
}

// Sanitize reference
$reference = preg_replace('/[^a-zA-Z0-9_\-]/', '', $reference);

// Determine host & protocol for client redirection
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
    || ($_SERVER['SERVER_PORT'] ?? 0) == 443 
    || (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$protocol = $isHttps ? 'https://' : 'http://';
$httpHost = $_SERVER['HTTP_HOST'] ?? 'uqlearn.org';
$baseUrl = $protocol . $httpHost;

// Verification flags and payload
$isVerified = false;
$paymentStatus = 'unknown';
$amount = 0.00;
$currency = 'KES';
$customerEmail = '';
$customerName = '';
$channel = 'card';
$paidAt = date('Y-m-d H:i:s');
$verificationMessage = '';
$rawVerificationData = null;

if (!empty($reference)) {
    // Verify reference with Paystack API
    $ch = curl_init('https://api.paystack.co/transaction/verify/' . rawurlencode($reference));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $PAYSTACK_SECRET_KEY,
            'Accept: application/json',
            'Cache-Control: no-cache',
            'User-Agent: UQlearn-LMS/1.0'
        ],
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $responseRaw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($responseRaw) {
        $verification = json_decode($responseRaw, true);
        $rawVerificationData = $verification;

        if ($httpCode === 200 && !empty($verification['status']) && !empty($verification['data'])) {
            $data = $verification['data'];
            $apiStatus = strtolower($data['status'] ?? '');

            if ($apiStatus === 'success') {
                $isVerified = true;
                $paymentStatus = 'success';
                $amount = floatval($data['amount'] ?? 0) / 100; // Paystack returns amount in subunits (cents/kobo)
                $currency = strtoupper($data['currency'] ?? 'KES');
                $customerEmail = strtolower(trim($data['customer']['email'] ?? ''));
                $customerName = trim(($data['customer']['first_name'] ?? '') . ' ' . ($data['customer']['last_name'] ?? ''));
                $channel = $data['channel'] ?? 'card';
                $paidAt = !empty($data['paid_at']) ? date('Y-m-d H:i:s', strtotime($data['paid_at'])) : date('Y-m-d H:i:s');
                $verificationMessage = $data['gateway_response'] ?? 'Payment verified and confirmed successfully.';
            } else {
                $paymentStatus = $apiStatus;
                $verificationMessage = $data['gateway_response'] ?? ('Payment status is ' . $apiStatus);
            }
        } else {
            $verificationMessage = $verification['message'] ?? 'Could not verify transaction with Paystack';
            $paymentStatus = 'failed';
        }
    } else {
        $verificationMessage = $curlError ?: 'No response from payment gateway';
        $paymentStatus = 'network_error';
    }
} else {
    $verificationMessage = 'No transaction reference was provided in the request.';
    $paymentStatus = 'missing_reference';
}

// Perform Database Updates & Student Enrollment if Payment Confirmed
$enrolledCoursesCount = 0;
if ($isVerified && isset($conn) && ($conn instanceof mysqli)) {
    try {
        // 1. Activate Subscriptions matching transaction code
        $stmtSub = $conn->prepare("UPDATE subscriptions SET status = 'active', activated_at = NOW(), activated_by = 'Paystack Callback' WHERE transaction_code = ? AND status != 'active'");
        if ($stmtSub) {
            $stmtSub->bind_param("s", $reference);
            $stmtSub->execute();
            $enrolledCoursesCount += $stmtSub->affected_rows;
            $stmtSub->close();
        }

        // 2. Also check if there are pending subscriptions for this customer email if reference didn't match
        if ($enrolledCoursesCount === 0 && !empty($customerEmail)) {
            $stmtSubEmail = $conn->prepare("UPDATE subscriptions SET status = 'active', activated_at = NOW(), activated_by = 'Paystack Callback', transaction_code = IF(transaction_code IS NULL OR transaction_code = '', ?, transaction_code) WHERE LOWER(student_email) = ? AND status = 'pending'");
            if ($stmtSubEmail) {
                $stmtSubEmail->bind_param("ss", $reference, $customerEmail);
                $stmtSubEmail->execute();
                $enrolledCoursesCount += $stmtSubEmail->affected_rows;
                $stmtSubEmail->close();
            }
        }

        // 3. Update or Insert record in payments table
        $stmtPay = $conn->prepare("UPDATE payments SET status = 'SUCCESS', mpesa_receipt_number = IF(mpesa_receipt_number IS NULL OR mpesa_receipt_number = '', ?, mpesa_receipt_number) WHERE external_reference = ? OR transaction_id = ?");
        if ($stmtPay) {
            $stmtPay->bind_param("sss", $reference, $reference, $reference);
            $stmtPay->execute();
            $stmtPay->close();
        }

        // 4. Record purchase in purchases table if subscription exists
        $stmtFind = $conn->prepare("SELECT student_id, course_id, course_price FROM subscriptions WHERE transaction_code = ? LIMIT 10");
        if ($stmtFind) {
            $stmtFind->bind_param("s", $reference);
            $stmtFind->execute();
            $findRes = $stmtFind->get_result();
            if ($findRes) {
                while ($subRow = $findRes->fetch_assoc()) {
                    if (!empty($subRow['student_id']) && !empty($subRow['course_id'])) {
                        $purId = 'pur_' . uniqid();
                        $cPrice = floatval($subRow['course_price'] ?: $amount);
                        $stmtPur = $conn->prepare("INSERT IGNORE INTO purchases (id, user_id, course_id, amount, payment_status, created_at) VALUES (?, ?, ?, ?, 'completed', NOW())");
                        if ($stmtPur) {
                            $stmtPur->bind_param("sssd", $purId, $subRow['student_id'], $subRow['course_id'], $cPrice);
                            $stmtPur->execute();
                            $stmtPur->close();
                        }
                    }
                }
            }
            $stmtFind->close();
        }
    } catch (Throwable $dbErr) {
        // Non-blocking catch to ensure redirect continues uninterrupted
        error_log("Paystack callback database sync notice: " . $dbErr->getMessage());
    }
}

// Construct Learning Dashboard URL
$queryParams = [
    'tab' => 'learning',
    'payment' => $isVerified ? 'success' : 'failed',
    'ref' => $reference,
    'status' => $isVerified ? 'confirmed' : 'unconfirmed',
    'provider' => 'paystack',
    'currency' => $currency,
    'amount' => number_format($amount, 2, '.', '')
];

if (!$isVerified && !empty($verificationMessage)) {
    $queryParams['msg'] = $verificationMessage;
}

$dashboardRedirectUrl = $baseUrl . '/dashboard?' . http_build_query($queryParams);

// Detect if caller expects JSON (e.g. AJAX verification request or Webhook)
$isJsonRequested = (isset($_GET['format']) && $_GET['format'] === 'json')
    || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
    || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

if ($isJsonRequested) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success'        => $isVerified,
        'verified'       => $isVerified,
        'status'         => $paymentStatus,
        'message'        => $isVerified ? 'Payment confirmed and verified successfully.' : $verificationMessage,
        'reference'      => $reference,
        'amount'         => $amount,
        'currency'       => $currency,
        'customerEmail'  => $customerEmail,
        'redirect_url'   => $dashboardRedirectUrl,
        'data'           => $rawVerificationData
    ]);
    exit();
}

// RENDER INTERSTITIAL HTML SUCCESS / STATUS PAGE WITH INSTANT AUTO-REDIRECT
// This guarantees the learner sees the confirmation message while seamlessly
// landing on their Learning Dashboard!
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $isVerified ? 'Payment Confirmed - UQlearn' : 'Payment Status - UQlearn'; ?></title>
    <!-- Auto Redirect Meta Tag -->
    <meta http-equiv="refresh" content="2;url=<?php echo htmlspecialchars($dashboardRedirectUrl); ?>">
    <link rel="icon" type="image/png" href="<?php echo htmlspecialchars($baseUrl); ?>/logo/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
            background-color: #090d16;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow-x: hidden;
        }
        .card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid <?php echo $isVerified ? 'rgba(20, 184, 166, 0.35)' : 'rgba(239, 68, 68, 0.35)'; ?>;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 40px <?php echo $isVerified ? 'rgba(13, 148, 136, 0.15)' : 'rgba(220, 38, 38, 0.15)'; ?>;
            backdrop-filter: blur(16px);
            border-radius: 28px;
            max-width: 480px;
            width: 100%;
            padding: 40px 32px;
            text-align: center;
            position: relative;
            animation: cardAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cardAppear {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .icon-wrap {
            width: 76px;
            height: 76px;
            border-radius: 22px;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: <?php echo $isVerified ? 'rgba(13, 148, 136, 0.18)' : 'rgba(220, 38, 38, 0.18)'; ?>;
            border: 1px solid <?php echo $isVerified ? 'rgba(20, 184, 166, 0.4)' : 'rgba(239, 68, 68, 0.4)'; ?>;
            color: <?php echo $isVerified ? '#14b8a6' : '#ef4444'; ?>;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: <?php echo $isVerified ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)'; ?>;
            color: <?php echo $isVerified ? '#2dd4bf' : '#f87171'; ?>;
            border: 1px solid <?php echo $isVerified ? 'rgba(45, 212, 191, 0.3)' : 'rgba(248, 113, 113, 0.3)'; ?>;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            letter-spacing: -0.02em;
        }
        p.subtitle {
            font-size: 13.5px;
            color: #94a3b8;
            line-height: 1.55;
            margin-bottom: 24px;
        }
        .details-box {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(51, 65, 85, 0.6);
            border-radius: 18px;
            padding: 16px 20px;
            margin-bottom: 24px;
            text-align: left;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 12.5px;
        }
        .detail-row:not(:last-child) {
            border-bottom: 1px solid rgba(51, 65, 85, 0.4);
        }
        .detail-label {
            color: #94a3b8;
            font-weight: 500;
        }
        .detail-value {
            color: #f1f5f9;
            font-weight: 700;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .progress-container {
            width: 100%;
            height: 6px;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 9999px;
            overflow: hidden;
            margin-bottom: 22px;
        }
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #0d9488, #2dd4bf);
            animation: fillProgress 2.2s linear forwards;
        }
        @keyframes fillProgress {
            from { width: 0%; }
            to { width: 100%; }
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 14px 20px;
            border-radius: 14px;
            background: #0d9488;
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            border: none;
            box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
        }
        .btn:hover {
            background: #14b8a6;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(20, 184, 166, 0.5);
        }
        .btn-secondary {
            background: rgba(30, 41, 59, 0.9);
            color: #cbd5e1;
            box-shadow: none;
            border: 1px solid rgba(71, 85, 105, 0.6);
            margin-top: 10px;
        }
        .btn-secondary:hover {
            background: rgba(51, 65, 85, 0.9);
            color: #ffffff;
            box-shadow: none;
        }
        .countdown-text {
            font-size: 11.5px;
            color: #64748b;
            margin-top: 14px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <?php if ($isVerified): ?>
                <!-- Green Success Check SVG -->
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            <?php else: ?>
                <!-- Red Alert SVG -->
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            <?php endif; ?>
        </div>

        <div class="badge">
            <?php if ($isVerified): ?>
                ● Paystack Payment Confirmed
            <?php else: ?>
                ▲ Verification Notice
            <?php endif; ?>
        </div>

        <h1><?php echo $isVerified ? 'Payment Confirmed!' : 'Verification Notice'; ?></h1>
        
        <p class="subtitle">
            <?php if ($isVerified): ?>
                Thank you! Your Paystack transaction has been verified. Your course enrollment is now active.
            <?php else: ?>
                <?php echo htmlspecialchars($verificationMessage ?: 'We could not confirm this transaction reference with Paystack.'); ?>
            <?php endif; ?>
        </p>

        <div class="details-box">
            <?php if (!empty($reference)): ?>
                <div class="detail-row">
                    <span class="detail-label">Reference</span>
                    <span class="detail-value"><?php echo htmlspecialchars($reference); ?></span>
                </div>
            <?php endif; ?>

            <?php if ($amount > 0): ?>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid</span>
                    <span class="detail-value" style="color: #2dd4bf;"><?php echo htmlspecialchars($currency . ' ' . number_format($amount, 2)); ?></span>
                </div>
            <?php endif; ?>

            <?php if (!empty($customerEmail)): ?>
                <div class="detail-row">
                    <span class="detail-label">Learner Email</span>
                    <span class="detail-value"><?php echo htmlspecialchars($customerEmail); ?></span>
                </div>
            <?php endif; ?>

            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value" style="color: <?php echo $isVerified ? '#2dd4bf' : '#f87171'; ?>;">
                    <?php echo htmlspecialchars(strtoupper($paymentStatus)); ?>
                </span>
            </div>
        </div>

        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>

        <a id="redirectBtn" href="<?php echo htmlspecialchars($dashboardRedirectUrl); ?>" class="btn">
            Proceed to Learning Dashboard →
        </a>

        <?php if (!$isVerified): ?>
            <a href="<?php echo htmlspecialchars($baseUrl); ?>/checkout" class="btn btn-secondary">
                Return to Checkout
            </a>
        <?php endif; ?>

        <p class="countdown-text" id="countdownLabel">
            Redirecting you to your learning dashboard in <span id="secs">2</span> seconds...
        </p>
    </div>

    <script>
        (function() {
            var targetUrl = <?php echo json_encode($dashboardRedirectUrl); ?>;
            var countdown = 2;
            var secsSpan = document.getElementById('secs');

            var interval = setInterval(function() {
                countdown--;
                if (secsSpan) {
                    secsSpan.textContent = countdown > 0 ? countdown : 1;
                }
                if (countdown <= 0) {
                    clearInterval(interval);
                    // Seamless redirect to user dashboard
                    if (window.top && window.top !== window.self) {
                        try {
                            window.top.location.href = targetUrl;
                        } catch (e) {
                            window.location.replace(targetUrl);
                        }
                    } else {
                        window.location.replace(targetUrl);
                    }
                }
            }, 1000);
        })();
    </script>
</body>
</html>
