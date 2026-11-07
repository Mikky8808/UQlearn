<?php
require_once __DIR__ . '/cors.php';
/**
 * Live Email Diagnostics & Test Endpoint - API v1
 * Path: /api/v1/test-email.php
 * 
 * Inspects server mail capability, recent OTP verification codes, and triggers live test emails
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    // Retrieve recent OTPs from database
    $recentOtps = [];
    $otpRes = $conn->query("SELECT id, email, otp_code, is_used, expires_at, created_at FROM email_verifications ORDER BY created_at DESC LIMIT 15");
    if ($otpRes) {
        while ($row = $otpRes->fetch_assoc()) {
            $isExpired = (strtotime($row['expires_at']) < time());
            $recentOtps[] = [
                'id' => $row['id'],
                'email' => $row['email'],
                'otp_code' => $row['otp_code'],
                'is_used' => (bool)$row['is_used'],
                'expires_at' => $row['expires_at'],
                'created_at' => $row['created_at'],
                'status' => $row['is_used'] ? 'USED' : ($isExpired ? 'EXPIRED' : 'ACTIVE_VALID')
            ];
        }
    }

    $smtp = AppMailer::getSmtpSettings($conn);
    $maskedPass = !empty($smtp['pass']) ? str_repeat('*', min(8, strlen($smtp['pass']))) : '';

    // Retrieve last email log
    $lastLog = null;
    $logRes = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'last_email_log' LIMIT 1");
    if ($logRes && $logRes->num_rows > 0) {
        $lastLog = json_decode($logRes->fetch_assoc()['setting_value'], true);
    }

    if ($method === 'GET') {
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "server_time" => date('Y-m-d H:i:s T'),
            "diagnostics" => [
                "php_version" => phpversion(),
                "mail_function_enabled" => function_exists('mail'),
                "openssl_extension" => extension_loaded('openssl'),
                "sockets_enabled" => function_exists('stream_socket_client'),
                "smtp_configured" => !empty($smtp['enabled']) && !empty($smtp['host']),
                "active_method" => (!empty($smtp['enabled']) && !empty($smtp['host'])) ? 'SMTP' : (function_exists('mail') ? 'Native PHP mail()' : 'NONE (Mail Disabled)')
            ],
            "smtp_settings" => [
                "enabled" => $smtp['enabled'],
                "host" => $smtp['host'],
                "port" => $smtp['port'],
                "crypto" => $smtp['crypto'],
                "auth" => $smtp['auth'],
                "user" => $smtp['user'],
                "pass_configured" => !empty($smtp['pass']),
                "from_email" => $smtp['from_email'],
                "from_name" => $smtp['from_name'],
                "reply_to" => $smtp['reply_to']
            ],
            "last_email_log" => $lastLog,
            "recent_verification_codes" => $recentOtps,
            "tip" => "If you are not receiving verification emails in Gmail, you can use the active 6-digit OTP code shown in recent_verification_codes above to verify immediately."
        ], JSON_PRETTY_PRINT);
        
        $conn->close();
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $body = !empty($raw) ? json_decode($raw, true) : [];
        
        $to = isset($body['to']) ? trim($body['to']) : (isset($_POST['to']) ? trim($_POST['to']) : 'MICHAELOMARE045@gmail.com');
        $subject = isset($body['subject']) ? trim($body['subject']) : "AQLEARN Test Email - " . date('Y-m-d H:i:s');
        
        $testCode = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        
        // Save test OTP into DB
        $vId = 'ver_test_' . bin2hex(random_bytes(6));
        $exp = date('Y-m-d H:i:s', time() + 3600);
        $insertOtp = $conn->prepare("INSERT INTO email_verifications (id, email, otp_code, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())");
        if ($insertOtp) {
            $insertOtp->bind_param("ssss", $vId, $to, $testCode, $exp);
            $insertOtp->execute();
            $insertOtp->close();
        }

        $htmlContent = '
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">AQLEARN</h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Email Delivery Diagnostic Test</p>
            </div>
            <div style="padding: 28px 24px; color: #334155;">
                <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Email System Operational Check</h2>
                <p style="font-size: 14px; line-height: 1.6;">This is a live test email sent from your LMS backend to verify that outgoing mail is properly delivered to your Gmail inbox.</p>
                <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Test Verification Code</div>
                    <div style="font-size: 36px; font-weight: 800; color: #0284c7; letter-spacing: 6px; font-family: monospace;">' . $testCode . '</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for 1 hour</div>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                    <strong>Delivery Method:</strong> ' . ((!empty($smtp['enabled']) && !empty($smtp['host'])) ? 'Authenticated SMTP (' . $smtp['host'] . ')' : 'PHP mail()') . '<br>
                    <strong>Timestamp:</strong> ' . date('Y-m-d H:i:s T') . '<br>
                    <strong>Recipient:</strong> ' . $to . '
                </p>
            </div>
            <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                &copy; ' . date('Y') . ' AQLEARN LMS Platform. All rights reserved.
            </div>
        </div>';

        $plainContent = "AQLEARN Test Email\n\nYour test verification code is: {$testCode}\n\nTime: " . date('Y-m-d H:i:s') . "\nRecipient: {$to}";

        $result = AppMailer::send($to, $subject, $htmlContent, $plainContent, $conn);

        http_response_code($result['success'] ? 200 : 500);
        echo json_encode([
            "success" => $result['success'],
            "message" => $result['message'],
            "delivery_method" => $result['method'],
            "recipient" => $to,
            "generated_test_otp" => $testCode,
            "debug_logs" => $result['logs'],
            "diagnostic_tip" => $result['success'] 
                ? "Email sent! If you do not see it in your Gmail Inbox, please check your Spam/Junk and Promotions folders, or search for 'AQLEARN' in Gmail search."
                : "Outgoing email attempt failed. See debug_logs for exact error reasons."
        ], JSON_PRETTY_PRINT);

        $conn->close();
        exit();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Test email execution error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
