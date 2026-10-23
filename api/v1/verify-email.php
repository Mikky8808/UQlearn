<?php
require_once __DIR__ . '/cors.php';
/**
 * Email Verification Endpoint - API v1
 * Path: /api/v1/verify-email.php
 * 
 * Handles email OTP verification and resend requests
 * Actions: verify | resend
 */

// =========================================================================
// 1. Set Timezone
// =========================================================================
date_default_timezone_set('Africa/Nairobi');

// =========================================================================
// 2. CORS and Response Headers
// =========================================================================
header("Content-Type: application/json; charset=UTF-8");


// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed. Only POST is accepted."
    ]);
    exit();
}

// =========================================================================
// 3. Database Connection & Mailer
// =========================================================================
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

// =========================================================================
// 4. Read & Decode JSON Payload
// =========================================================================
$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON payload."
    ]);
    $conn->close();
    exit();
}

// =========================================================================
// 5. Extract Fields
// =========================================================================
$action = isset($data['action']) ? trim($data['action']) : '';
$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
$otp = isset($data['otp']) ? trim($data['otp']) : '';

// =========================================================================
// 6. Validation
// =========================================================================
if (empty($action) || !in_array($action, ['verify', 'resend'])) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Valid action is required: 'verify' or 'resend'."
    ]);
    $conn->close();
    exit();
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "A valid email address is required."
    ]);
    $conn->close();
    exit();
}

// =========================================================================
// 7. Handle Actions
// =========================================================================

// -------------------- ACTION: VERIFY --------------------
if ($action === 'verify') {
    if (empty($otp) || strlen($otp) !== 6 || !ctype_digit($otp)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "A valid 6-digit OTP is required."
        ]);
        $conn->close();
        exit();
    }

    // Check if user exists
    $user_check = $conn->prepare("SELECT id, first_name, last_name, email, is_email_verified FROM users WHERE email = ? LIMIT 1");
    $user_check->bind_param("s", $email);
    $user_check->execute();
    $user_result = $user_check->get_result();

    if ($user_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "No account found with this email address."
        ]);
        $user_check->close();
        $conn->close();
        exit();
    }

    $user = $user_result->fetch_assoc();
    $user_check->close();

    // Check if already verified
    if ($user['is_email_verified']) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "This email is already verified."
        ]);
        $conn->close();
        exit();
    }

    // Find the OTP record
    $otp_check = $conn->prepare("
        SELECT id, otp_code, is_used, expires_at 
        FROM email_verifications 
        WHERE email = ? AND is_used = 0 
        ORDER BY created_at DESC LIMIT 1
    ");
    $otp_check->bind_param("s", $email);
    $otp_check->execute();
    $otp_result = $otp_check->get_result();

    if ($otp_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "No verification code found. Please request a new one."
        ]);
        $otp_check->close();
        $conn->close();
        exit();
    }

    $otp_record = $otp_result->fetch_assoc();
    $otp_check->close();

    // Check if OTP is expired
    $expires_at = strtotime($otp_record['expires_at']);
    if (time() > $expires_at) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Verification code has expired. Please request a new one."
        ]);
        $conn->close();
        exit();
    }

    // Verify OTP
    if ($otp_record['otp_code'] !== $otp) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid verification code. Please try again."
        ]);
        $conn->close();
        exit();
    }

    // Mark OTP as used and update user
    $conn->begin_transaction();

    try {
        // Mark OTP as used
        $mark_used = $conn->prepare("UPDATE email_verifications SET is_used = 1 WHERE id = ?");
        $mark_used->bind_param("s", $otp_record['id']);
        $mark_used->execute();
        $mark_used->close();

        // Update user as verified
        $update_user = $conn->prepare("UPDATE users SET is_email_verified = 1, updated_at = NOW() WHERE email = ?");
        $update_user->bind_param("s", $email);
        $update_user->execute();
        $update_user->close();

        // Generate session token
        $token = bin2hex(random_bytes(32));

        $conn->commit();

        // Get updated user data
        $user_data = $conn->prepare("SELECT id, role, first_name, last_name, email, avatar_url, is_email_verified FROM users WHERE email = ?");
        $user_data->bind_param("s", $email);
        $user_data->execute();
        $user_info = $user_data->get_result()->fetch_assoc();
        $user_data->close();

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Email verified successfully! Welcome to AQLEARN.",
            "token" => $token,
            "user" => $user_info
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Verification failed: " . $e->getMessage()
        ]);
    }

    $conn->close();
    exit();
}

// -------------------- ACTION: RESEND --------------------
if ($action === 'resend') {
    // Check if user exists
    $user_check = $conn->prepare("SELECT id, first_name, email, is_email_verified FROM users WHERE email = ? LIMIT 1");
    $user_check->bind_param("s", $email);
    $user_check->execute();
    $user_result = $user_check->get_result();

    if ($user_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "No account found with this email address."
        ]);
        $user_check->close();
        $conn->close();
        exit();
    }

    $user = $user_result->fetch_assoc();
    $user_check->close();

    // Check if already verified
    if ($user['is_email_verified']) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "This email is already verified."
        ]);
        $conn->close();
        exit();
    }

    // Rate limiting: max 3 requests per minute
    $rate_check = $conn->prepare("
        SELECT COUNT(*) as count 
        FROM email_verifications 
        WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    ");
    $rate_check->bind_param("s", $email);
    $rate_check->execute();
    $rate_result = $rate_check->get_result()->fetch_assoc();
    $rate_check->close();

    if ($rate_result['count'] >= 3) {
        http_response_code(429);
        echo json_encode([
            "success" => false,
            "message" => "Too many requests. Please wait 1 minute before trying again."
        ]);
        $conn->close();
        exit();
    }

    // Generate new OTP
    $new_otp = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    $verification_id = 'ver_' . bin2hex(random_bytes(8));
    $expires_at = date('Y-m-d H:i:s', time() + 3600);

    // Store new OTP
    $insert_otp = $conn->prepare("
        INSERT INTO email_verifications (id, email, otp_code, expires_at, created_at) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    $insert_otp->bind_param("ssss", $verification_id, $email, $new_otp, $expires_at);

    if ($insert_otp->execute()) {
        $insert_otp->close();

        // =========================================================================
        // Send Branded HTML Email with New OTP
        // =========================================================================
        $subject = "New Verification Code - AQLEARN";

        $html_message = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Verification Code - AQLEARN</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #1a237e, #0d47a1); padding: 30px 20px; text-align: center; }
                .header img { max-width: 180px; height: auto; margin-bottom: 10px; }
                .header h1 { color: #ffffff; font-size: 28px; margin: 10px 0 0 0; font-weight: 700; letter-spacing: 2px; }
                .content { padding: 40px 30px; color: #333333; }
                .content h2 { color: #1a237e; font-size: 22px; margin-top: 0; }
                .greeting { font-size: 18px; margin-bottom: 20px; }
                .otp-box { background: #f5f7ff; border: 2px dashed #1a237e; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
                .otp-code { font-size: 48px; font-weight: 700; color: #1a237e; letter-spacing: 10px; font-family: "Courier New", monospace; }
                .otp-label { font-size: 14px; color: #666; margin-top: 5px; }
                .info-box { background: #f8f9fa; border-left: 4px solid #0d47a1; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
                .info-box p { margin: 5px 0; font-size: 14px; color: #555; }
                .button { display: inline-block; background: linear-gradient(135deg, #1a237e, #0d47a1); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
                .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(13, 71, 161, 0.4); }
                .footer { background: #f4f4f4; padding: 25px 30px; text-align: center; color: #888; font-size: 13px; border-top: 1px solid #e0e0e0; }
                .footer a { color: #1a237e; text-decoration: none; }
                .social-links { margin: 10px 0; }
                .social-links a { margin: 0 8px; color: #555; }
                .divider { height: 1px; background: #e0e0e0; margin: 20px 0; }
                @media only screen and (max-width: 480px) {
                    .content { padding: 20px; }
                    .otp-code { font-size: 36px; letter-spacing: 6px; }
                    .header h1 { font-size: 22px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://uqlearn.org/logo/logo.png" alt="AQLEARN Logo">
                    <h1>AQLEARN</h1>
                </div>
                <div class="content">
                    <h2>New Verification Code</h2>
                    <p class="greeting">Hello <strong>' . $user['first_name'] . '</strong>,</p>
                    <p>You requested a new verification code for your <strong>AQLEARN</strong> account.</p>
                    <div class="otp-box">
                        <div class="otp-code">' . $new_otp . '</div>
                        <div class="otp-label">Verification Code - Valid for 1 hour</div>
                    </div>
                    <div class="info-box">
                        <p><strong>📧 Email:</strong> ' . $email . '</p>
                        <p><strong>⏰ Expires:</strong> 1 hour from now</p>
                    </div>
                    <p style="text-align: center;">
                        <a href="https://uqlearn.org" class="button">Go to AQLEARN</a>
                    </p>
                    <div class="divider"></div>
                    <p style="font-size: 14px; color: #666;">
                        <strong>Didn\'t request this?</strong><br>
                        If you didn\'t request a new verification code, please ignore this email.
                    </p>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://twitter.com/aqlearn">Twitter</a> •
                        <a href="https://linkedin.com/company/aqlearn">LinkedIn</a> •
                        <a href="https://youtube.com/aqlearn">YouTube</a>
                    </div>
                    <p>
                        &copy; ' . date('Y') . ' <strong>AQLEARN</strong> — All Rights Reserved<br>
                        <a href="https://uqlearn.org">uqlearn.org</a> | 
                        <a href="mailto:support@aqlearn.com">support@aqlearn.com</a>
                    </p>
                </div>
            </div>
        </body>
        </html>';

        // Send Email via AppMailer (Authenticated SMTP / RFC-Compliant PHP mail)
        $mailResult = AppMailer::send($email, $subject, $html_message, '', $conn);
        $mail_sent = $mailResult['success'];

        if ($mail_sent) {
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "A new verification code has been sent. Please check your inbox and spam folder.",
                "expiresIn" => 3600
            ]);
        } else {
            http_response_code(200);
            echo json_encode([
                "success" => false,
                "message" => "Unable to send verification email: Outgoing mail server is not configured. Please contact the site administrator to configure SMTP."
            ]);
        }
    } else {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to generate verification code: " . $insert_otp->error
        ]);
    }

    $insert_otp->close();
    $conn->close();
    exit();
}
?>
