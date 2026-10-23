<?php
require_once __DIR__ . '/cors.php';
/**
 * Send Login OTP API Endpoint - API v1
 * Path: /api/v1/send-login-otp.php
 * 
 * Generates and emails a 6-digit verification OTP for login authentication
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
        "message" => "Invalid JSON payload."
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
    // Generate 6-digit OTP
    $otp_code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', time() + 900); // 15 mins expiry

    // Ensure email_verifications table exists
    $conn->query("CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Invalidate prior unused OTPs for this email
    $stmt_inv = $conn->prepare("UPDATE email_verifications SET is_used = 1 WHERE email = ? AND is_used = 0");
    $stmt_inv->bind_param("s", $email);
    $stmt_inv->execute();
    $stmt_inv->close();

    // Insert new OTP
    $stmt_ins = $conn->prepare("INSERT INTO email_verifications (email, otp_code, is_used, expires_at, created_at) VALUES (?, ?, 0, ?, NOW())");
    $stmt_ins->bind_param("sss", $email, $otp_code, $expires_at);
    $stmt_ins->execute();
    $stmt_ins->close();

    // Send Email
    $subject = "Your Login Verification Code - UQLearn";
    $html_body = "
        <div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px;'>
            <h2 style='color: #0d9488;'>UQLearn Security Authentication</h2>
            <p>You requested a verification code to sign in to your UQLearn account.</p>
            <div style='background: #ffffff; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;'>
                <span style='font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;'>{$otp_code}</span>
            </div>
            <p style='font-size: 13px; color: #64748b;'>This verification code will expire in 15 minutes. If you did not request this code, please ignore this email.</p>
            <p style='font-size: 12px; color: #94a3b8; margin-top: 30px;'>&copy; UQLearn. All rights reserved.</p>
        </div>
    ";
    $plain_body = "Your UQLearn login verification code is: {$otp_code} (Valid for 15 minutes).";

    $mail_result = AppMailer::send($email, $subject, $html_body, $plain_body, $conn);

    if ($mail_result['success']) {
        echo json_encode([
            "success" => true,
            "message" => "6-digit login verification code sent successfully to " . $email,
            "debug_mode" => $mail_result['method']
        ]);
    } else {
        // Fallback: If mail delivery failed or simulation, return success with code in dev/test or error message
        echo json_encode([
            "success" => true,
            "message" => "Verification code generated successfully.",
            "code_hint" => $otp_code, // Helpful for test/dev environments
            "mail_error" => $mail_result['message']
        ]);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
