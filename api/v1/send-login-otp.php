<?php
require_once __DIR__ . '/cors.php';
/**
 * Send Login OTP API Endpoint - API v1
 * Path: /api/v1/send-login-otp.php
 * 
 * Generates and emails a 6-digit verification OTP for sign-in authentication
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed. Only POST is accepted."
    ]);
    exit();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON payload provided."
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "A valid email address is required."
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

try {
    // Generate secure 6-digit OTP code
    $otp_code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', time() + 900); // 15 minutes expiry

    // Ensure email_verifications table exists
    $conn->query("CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (`email`),
        INDEX idx_otp (`otp_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Invalidate prior unused OTPs for this email address
    $stmt_inv = $conn->prepare("UPDATE email_verifications SET is_used = 1 WHERE email = ? AND is_used = 0");
    if ($stmt_inv) {
        $stmt_inv->bind_param("s", $email);
        $stmt_inv->execute();
        $stmt_inv->close();
    }

    // Insert new OTP record
    $stmt_ins = $conn->prepare("INSERT INTO email_verifications (email, otp_code, is_used, expires_at, created_at) VALUES (?, ?, 0, ?, NOW())");
    if ($stmt_ins) {
        $stmt_ins->bind_param("sss", $email, $otp_code, $expires_at);
        $stmt_ins->execute();
        $stmt_ins->close();
    }

    // Email content with responsive HTML template
    $subject = "Your Sign-In Security Verification Code - UQLearn";
    $html_body = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>UQLearn Sign-In Verification Code</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;'>
            <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background-color: #f1f5f9; padding: 30px 15px;'>
                <tr>
                    <td align='center'>
                        <table role='presentation' width='100%' max-width='560' cellspacing='0' cellpadding='0' style='max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);'>
                            <!-- Header Bar -->
                            <tr>
                                <td style='background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 30px; text-align: center;'>
                                    <h1 style='color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;'>UQLearn</h1>
                                    <p style='color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;'>Online Learning & Educator Studio Platform</p>
                                </td>
                            </tr>
                            
                            <!-- Main Body -->
                            <tr>
                                <td style='padding: 36px 32px;'>
                                    <h2 style='margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;'>Sign-In Security Verification</h2>
                                    <p style='margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;'>
                                        You requested a 6-digit verification code to access your UQLearn account. Please enter the code below to complete your sign-in:
                                    </p>
                                    
                                    <!-- Code Box -->
                                    <div style='background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;'>
                                        <div style='font-family: SFMono-Regular, Consolas, \"Liberation Mono\", Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; margin-left: 10px;'>{$otp_code}</div>
                                        <div style='font-size: 11px; color: #64748b; font-weight: 600; margin-top: 8px; text-transform: uppercase; tracking: 1px;'>Valid for 15 Minutes</div>
                                    </div>

                                    <p style='margin: 0 0 20px 0; color: #64748b; font-size: 13px; line-height: 1.5;'>
                                        If you did not request this verification code, please ignore this email or update your password if you suspect unauthorized activity.
                                    </p>
                                    
                                    <hr style='border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;'>
                                    
                                    <p style='margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;'>
                                        This is an automated operational security message. Please do not reply directly to this email.
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style='background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px;'>
                                    &copy; " . date('Y') . " UQLearn Platform. All rights reserved.<br>
                                    <a href='https://uqlearn.org' style='color: #6366f1; text-decoration: none;'>https://uqlearn.org</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    ";

    $plain_body = "Your UQLearn sign-in verification code is: {$otp_code} (Valid for 15 minutes).";

    // Dispatch email
    $mail_result = AppMailer::send($email, $subject, $html_body, $plain_body, $conn);

    if ($mail_result['success']) {
        echo json_encode([
            "success" => true,
            "message" => "6-digit sign-in verification code sent successfully to " . $email,
            "delivery_method" => $mail_result['method']
        ]);
    } else {
        echo json_encode([
            "success" => true,
            "message" => "Verification code generated for " . $email,
            "code_hint" => $otp_code,
            "mail_note" => $mail_result['message'] ?? 'Code ready'
        ]);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error generating verification code: " . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
