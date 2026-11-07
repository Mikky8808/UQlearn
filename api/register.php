<?php
require_once __DIR__ . '/cors.php';
/**
 * Registration Endpoint - API v1
 * Path: /api/v1/register.php
 * 
 * Handles user registration for the LMS platform
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
// 3. Include Database Connection & Mailer
// =========================================================================
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

// Ensure custom profile columns exist in the 'users' table
$profile_columns = [
    'bio' => 'TEXT DEFAULT NULL',
    'website' => 'VARCHAR(255) DEFAULT NULL',
    'twitter' => 'VARCHAR(100) DEFAULT NULL',
    'instructor_title' => 'VARCHAR(255) DEFAULT NULL'
];
foreach ($profile_columns as $col => $definition) {
    $check_col = @$conn->query("SHOW COLUMNS FROM `users` LIKE '$col'");
    if ($check_col && $check_col->num_rows === 0) {
        @$conn->query("ALTER TABLE `users` ADD COLUMN `$col` $definition");
    }
}

// =========================================================================
// 4. Read & Decode Incoming JSON Payload
// =========================================================================
$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON payload provided."
    ]);
    $conn->close();
    exit();
}

// =========================================================================
// 5. Extract and Sanitize Fields
// =========================================================================
$role               = isset($data['role']) ? trim($data['role']) : 'learner';
$first_name         = isset($data['firstName']) ? trim($data['firstName']) : '';
$last_name          = isset($data['lastName']) ? trim($data['lastName']) : '';
$email              = isset($data['email']) ? strtolower(trim($data['email'])) : '';
$password           = isset($data['password']) ? $data['password'] : '';
$country_code       = isset($data['phoneCountry']) ? trim($data['phoneCountry']) : 
                      (isset($data['countryCode']) ? trim($data['countryCode']) : null);
$phone_number       = isset($data['phoneNumber']) ? trim($data['phoneNumber']) : null;
$preferred_language = isset($data['preferredLanguage']) ? trim($data['preferredLanguage']) : 'en';
$auth_provider      = isset($data['authProvider']) ? trim($data['authProvider']) : 'email';
$firebase_uid       = isset($data['firebaseUid']) ? trim($data['firebaseUid']) : null;
$avatar_url         = isset($data['avatar']) ? trim($data['avatar']) : 
                      (isset($data['avatarUrl']) ? trim($data['avatarUrl']) : null);
$agreed_marketing   = isset($data['agreedMarketing']) ? (int)$data['agreedMarketing'] : 0;
$agreed_terms       = isset($data['agreedTerms']) ? (int)$data['agreedTerms'] : 1;

// Instructor-specific dynamic fields (with defaults if registering as instructor)
$bio              = isset($data['bio']) ? trim($data['bio']) : ($role === 'instructor' ? 'Principal Educator & Systems Engineer.' : null);
$website          = isset($data['website']) ? trim($data['website']) : null;
$twitter          = isset($data['twitter']) ? trim($data['twitter']) : null;
$instructor_title = isset($data['instructorTitle']) ? trim($data['instructorTitle']) : ($role === 'instructor' ? 'Senior Educator' : null);

// =========================================================================
// 6. Validation
// =========================================================================

// Required fields
if (empty($first_name) || empty($last_name)) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "First name and last name are required."
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

// Password validation for email registration
if ($auth_provider === 'email') {
    if (empty($password)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Password is required."
        ]);
        $conn->close();
        exit();
    }
    
    if (strlen($password) < 8) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Password must be at least 8 characters long."
        ]);
        $conn->close();
        exit();
    }
    
    if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Password must contain both uppercase and lowercase letters."
        ]);
        $conn->close();
        exit();
    }
    
    if (!preg_match('/[0-9!@#$%^&*]/', $password)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Password must contain at least one number or special character."
        ]);
        $conn->close();
        exit();
    }
}

// Role validation
if (!in_array($role, ['learner', 'instructor', 'admin'])) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Invalid role selected."
    ]);
    $conn->close();
    exit();
}

// Auth provider validation
if (!in_array($auth_provider, ['email', 'google', 'apple'])) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Invalid authentication provider."
    ]);
    $conn->close();
    exit();
}

// Terms agreement
if (!$agreed_terms) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "You must agree to the Terms of Service and Privacy Policy."
    ]);
    $conn->close();
    exit();
}

// =========================================================================
// 7. Check for Duplicate Email
// =========================================================================
$check_sql = "SELECT id, email FROM users WHERE email = ? LIMIT 1";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("s", $email);
$check_stmt->execute();
$result = $check_stmt->get_result();

if ($result->num_rows > 0) {
    http_response_code(409);
    echo json_encode([
        "success" => false,
        "message" => "An account with this email address already exists. Please log in."
    ]);
    $check_stmt->close();
    $conn->close();
    exit();
}
$check_stmt->close();

// =========================================================================
// 8. Hash Password and Insert User
// =========================================================================
$password_hash = !empty($password) ? password_hash($password, PASSWORD_BCRYPT) : null;
$user_id = 'usr_' . bin2hex(random_bytes(8));
$full_name = trim($first_name . ' ' . $last_name);

// Generate avatar URL if not provided
if (empty($avatar_url)) {
    $avatar_url = 'https://ui-avatars.com/api/?name=' . urlencode($full_name) . '&background=random&size=128';
}

// Start transaction
$conn->begin_transaction();

try {
    // Insert user
    $insert_sql = "INSERT INTO users (
        id, role, first_name, last_name, email, password_hash, 
        country_code, phone_number, preferred_language, avatar_url,
        auth_provider, firebase_uid, agreed_terms, agreed_marketing, 
        is_email_verified, bio, website, twitter, instructor_title, created_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?,
        ?, ?, ?, ?, 
        0, ?, ?, ?, ?, NOW()
    )";

    $insert_stmt = $conn->prepare($insert_sql);
    $insert_stmt->bind_param(
        "ssssssssssssiissss",
        $user_id,
        $role,
        $first_name,
        $last_name,
        $email,
        $password_hash,
        $country_code,
        $phone_number,
        $preferred_language,
        $avatar_url,
        $auth_provider,
        $firebase_uid,
        $agreed_terms,
        $agreed_marketing,
        $bio,
        $website,
        $twitter,
        $instructor_title
    );

    if (!$insert_stmt->execute()) {
        throw new Exception("Failed to create user: " . $insert_stmt->error);
    }
    $insert_stmt->close();

    // =========================================================================
    // 9. Generate and Store OTP for Email Verification
    // =========================================================================
    $otp_code = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    $verification_id = 'ver_' . bin2hex(random_bytes(8));
    $expires_at = date('Y-m-d H:i:s', time() + 3600);

    $otp_sql = "INSERT INTO email_verifications (id, email, otp_code, expires_at, created_at) 
                VALUES (?, ?, ?, ?, NOW())";
    $otp_stmt = $conn->prepare($otp_sql);
    $otp_stmt->bind_param("ssss", $verification_id, $email, $otp_code, $expires_at);

    if (!$otp_stmt->execute()) {
        throw new Exception("Failed to generate verification code: " . $otp_stmt->error);
    }
    $otp_stmt->close();

    // =========================================================================
    // 10. Send Branded HTML Email with AQLEARN Logo
    // =========================================================================
    $subject = "Verify Your Email - AQLEARN";
    
    // HTML Email Body with AQLEARN Branding
    $html_message = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - AQLEARN</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1a237e, #0d47a1);
                padding: 30px 20px;
                text-align: center;
            }
            .header img {
                max-width: 180px;
                height: auto;
                margin-bottom: 10px;
            }
            .header h1 {
                color: #ffffff;
                font-size: 28px;
                margin: 10px 0 0 0;
                font-weight: 700;
                letter-spacing: 2px;
            }
            .content {
                padding: 40px 30px;
                color: #333333;
            }
            .content h2 {
                color: #1a237e;
                font-size: 22px;
                margin-top: 0;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
            }
            .otp-box {
                background: #f5f7ff;
                border: 2px dashed #1a237e;
                border-radius: 12px;
                padding: 25px;
                text-align: center;
                margin: 25px 0;
            }
            .otp-code {
                font-size: 48px;
                font-weight: 700;
                color: #1a237e;
                letter-spacing: 10px;
                font-family: "Courier New", monospace;
            }
            .otp-label {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            .info-box {
                background: #f8f9fa;
                border-left: 4px solid #0d47a1;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .info-box p {
                margin: 5px 0;
                font-size: 14px;
                color: #555;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #1a237e, #0d47a1);
                color: #ffffff;
                padding: 14px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                transition: all 0.3s ease;
            }
            .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(13, 71, 161, 0.4);
            }
            .footer {
                background: #f4f4f4;
                padding: 25px 30px;
                text-align: center;
                color: #888;
                font-size: 13px;
                border-top: 1px solid #e0e0e0;
            }
            .footer a {
                color: #1a237e;
                text-decoration: none;
            }
            .footer .social-links {
                margin: 10px 0;
            }
            .footer .social-links a {
                margin: 0 8px;
                color: #555;
            }
            .divider {
                height: 1px;
                background: #e0e0e0;
                margin: 20px 0;
            }
            @media only screen and (max-width: 480px) {
                .content {
                    padding: 20px;
                }
                .otp-code {
                    font-size: 36px;
                    letter-spacing: 6px;
                }
                .header h1 {
                    font-size: 22px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header with Logo -->
            <div class="header">
                <img src="https://uqlearn.org/logo/logo.png" alt="AQLEARN Logo">
                <h1>AQLEARN</h1>
            </div>
            
            <!-- Content -->
            <div class="content">
                <h2>Verify Your Email Address</h2>
                
                <p class="greeting">Hello <strong>' . $first_name . '</strong>,</p>
                
                <p>Thank you for joining <strong>AQLEARN</strong>! We\'re excited to have you on board.</p>
                
                <p>Please use the verification code below to confirm your email address and activate your account:</p>
                
                <div class="otp-box">
                    <div class="otp-code">' . $otp_code . '</div>
                    <div class="otp-label">Verification Code - Valid for 1 hour</div>
                </div>
                
                <div class="info-box">
                    <p><strong>📧 Email:</strong> ' . $email . '</p>
                    <p><strong>👤 Role:</strong> ' . ucfirst($role) . '</p>
                    <p><strong>⏰ Expires:</strong> 1 hour from now</p>
                </div>
                
                <p style="text-align: center;">
                    <a href="https://uqlearn.org" class="button">Go to AQLEARN</a>
                </p>
                
                <div class="divider"></div>
                
                <p style="font-size: 14px; color: #666;">
                    <strong>Didn\'t request this?</strong><br>
                    If you didn\'t create an account with AQLEARN, please ignore this email. No action is required.
                </p>
            </div>
            
            <!-- Footer -->
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
                <p style="font-size: 11px; color: #aaa;">
                    This email was sent to <a href="mailto:' . $email . '" style="color: #888;">' . $email . '</a>
                </p>
            </div>
        </div>
    </body>
    </html>';

    // Plain text version (fallback)
    $plain_message = "AQLEARN - Verify Your Email\n\n";
    $plain_message .= "Hello " . $first_name . ",\n\n";
    $plain_message .= "Thank you for joining AQLEARN!\n\n";
    $plain_message .= "Your verification code is: " . $otp_code . "\n\n";
    $plain_message .= "This code expires in 1 hour.\n\n";
    $plain_message .= "Email: " . $email . "\n";
    $plain_message .= "Role: " . ucfirst($role) . "\n\n";
    $plain_message .= "If you didn't request this, please ignore this email.\n\n";
    $plain_message .= "© " . date('Y') . " AQLEARN - All Rights Reserved\n";
    $plain_message .= "https://uqlearn.org\n";

    // =========================================================================
    // 11. Send Email via AppMailer (Authenticated SMTP / RFC-Compliant PHP mail)
    // =========================================================================
    $mailResult = AppMailer::send($email, $subject, $html_message, $plain_message, $conn);
    $mail_sent = $mailResult['success'];

    // Commit transaction
    $conn->commit();

    // =========================================================================
    // 12. Generate Auth Token and Return Success
    // =========================================================================
    $token = bin2hex(random_bytes(32));

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => $mail_sent
            ? "Account created successfully! Please check your email for the verification code."
            : "Account created successfully! Please check your email inbox or spam folder for your verification code.",
        "token" => $token,
        "user" => [
            "id" => $user_id,
            "role" => $role,
            "name" => $full_name,
            "firstName" => $first_name,
            "lastName" => $last_name,
            "countryCode" => $country_code,
            "phoneNumber" => $phone_number,
            "preferredLanguage" => $preferred_language,
            "avatarUrl" => $avatar_url,
            "authProvider" => $auth_provider,
            "isEmailVerified" => false,
            "createdAt" => date('Y-m-d H:i:s')
        ]
    ]);

} catch (\Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli && $conn->ping()) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
