<?php
require_once __DIR__ . '/cors.php';
/**
 * Authentication & Login API - API v1
 * Path: /api/v1/login.php
 * 
 * Handles Email/Password and Google SSO authentication with shared hosting hardening
 */

// =========================================================================
// 1. Set Timezone & Error Handling
// =========================================================================
date_default_timezone_set('Africa/Nairobi');

// =========================================================================
// 2. CORS Headers
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
// 3. Database Connection & Request Handling
// =========================================================================
try {
    require_once __DIR__ . '/db.php';

    // Ensure $conn is actively resolved and connected
    if (!isset($conn) || !($conn instanceof mysqli)) {
        $conn = function_exists('getDbConnection') ? getDbConnection() : ($GLOBALS['db_conn'] ?? ($GLOBALS['conn'] ?? null));
    }

    if (!$conn || !($conn instanceof mysqli) || $conn->connect_errno) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Database connection unavailable. Please check MySQL server status."
        ]);
        exit();
    }

    // 4. Read JSON Input
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true);

    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid or empty JSON payload provided."
        ]);
        exit();
    }

    // 5. Extract & Normalize Fields
    $raw_provider = '';
    if (!empty($data['authProvider'])) $raw_provider = $data['authProvider'];
    elseif (!empty($data['auth_provider'])) $raw_provider = $data['auth_provider'];
    elseif (!empty($data['provider'])) $raw_provider = $data['provider'];
    elseif (!empty($data['auth_type'])) $raw_provider = $data['auth_type'];
    elseif (!empty($data['is_google']) || !empty($data['google_sso']) || !empty($data['is_google_login'])) $raw_provider = 'google';

    $auth_provider = strtolower(trim((string)$raw_provider));
    if (empty($auth_provider)) {
        $auth_provider = 'email';
    }

    $email = isset($data['email']) ? strtolower(trim((string)$data['email'])) : '';
    $password = isset($data['password']) ? (string)$data['password'] : '';
    $firebase_uid = isset($data['firebaseUid']) ? trim((string)$data['firebaseUid']) : (isset($data['firebase_uid']) ? trim((string)$data['firebase_uid']) : '');
    $role_requested = isset($data['role']) ? strtolower(trim((string)$data['role'])) : '';
    if ($role_requested === 'student') {
        $role_requested = 'learner';
    }

    // 6. Basic Validation
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Please provide a valid email address."
        ]);
        exit();
    }

    if (!in_array($auth_provider, ['email', 'google', 'apple'])) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Invalid authentication provider."
        ]);
        exit();
    }

    // Ensure users table exists
    $table_check = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$table_check || $table_check->num_rows === 0) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Users database table has not been initialized. Please run database setup or sync."
        ]);
        exit();
    }
    if ($table_check instanceof mysqli_result) {
        $table_check->close();
    }

    // =========================================================================
    // 7. FLOW A: GOOGLE / SOCIAL SIGN-IN
    // =========================================================================
    if ($auth_provider === 'google' || $auth_provider === 'apple') {
        // Look up by email or firebase_uid
        $stmt = $conn->prepare("
            SELECT id, role, first_name, last_name, email, password_hash,
                   country_code, phone_number, preferred_language, 
                   avatar_url, auth_provider, firebase_uid, is_email_verified 
            FROM users 
            WHERE email = ? OR (firebase_uid = ? AND firebase_uid IS NOT NULL AND firebase_uid != '')
            LIMIT 1
        ");
        $stmt->bind_param("ss", $email, $firebase_uid);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        // If user not found, auto-create account for Google user
        if (!$user) {
            $displayName = isset($data['displayName']) ? trim((string)$data['displayName']) : (isset($data['name']) ? trim((string)$data['name']) : '');
            $photoURL = isset($data['photoURL']) ? trim((string)$data['photoURL']) : (isset($data['avatar']) ? trim((string)$data['avatar']) : '');
            $nameParts = !empty($displayName) ? explode(' ', $displayName, 2) : ['User', ''];
            $firstName = $nameParts[0];
            $lastName = isset($nameParts[1]) ? $nameParts[1] : '';

            $newId = 'usr_' . bin2hex(random_bytes(8));
            $userRole = in_array($role_requested, ['learner', 'student', 'instructor', 'admin']) ? $role_requested : 'learner';
            $avatar = !empty($photoURL) ? $photoURL : 'https://ui-avatars.com/api/?name=' . urlencode($displayName ?: $email) . '&background=random&size=128';
            $dummy_hash = '*OAUTH_GOOGLE_ACCOUNT*';

            // Attempt insert including password_hash column to avoid MySQL strict NOT NULL errors
            $insert = $conn->prepare("
                INSERT INTO users (
                    id, role, first_name, last_name, email, password_hash,
                    avatar_url, auth_provider, firebase_uid, is_email_verified, 
                    agreed_terms, last_login_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
            ");
            $insert->bind_param("sssssssss", $newId, $userRole, $firstName, $lastName, $email, $dummy_hash, $avatar, $auth_provider, $firebase_uid);
            
            $insert_ok = $insert->execute();
            $insert_error = $insert->error;
            $insert->close();

            if ($insert_ok) {
                $user = [
                    'id' => $newId,
                    'role' => $userRole,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'country_code' => '+254',
                    'phone_number' => null,
                    'preferred_language' => 'en',
                    'avatar_url' => $avatar,
                    'auth_provider' => $auth_provider,
                    'firebase_uid' => $firebase_uid,
                    'is_email_verified' => 1
                ];
            } else {
                // Fallback attempt without password_hash column if schema differs
                $fallback = $conn->prepare("
                    INSERT INTO users (
                        id, role, first_name, last_name, email, 
                        avatar_url, auth_provider, firebase_uid, is_email_verified, 
                        agreed_terms, last_login_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
                ");
                $fallback->bind_param("ssssssss", $newId, $userRole, $firstName, $lastName, $email, $avatar, $auth_provider, $firebase_uid);
                
                if ($fallback->execute()) {
                    $user = [
                        'id' => $newId,
                        'role' => $userRole,
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $email,
                        'country_code' => '+254',
                        'phone_number' => null,
                        'preferred_language' => 'en',
                        'avatar_url' => $avatar,
                        'auth_provider' => $auth_provider,
                        'firebase_uid' => $firebase_uid,
                        'is_email_verified' => 1
                    ];
                    $fallback->close();
                } else {
                    $fallback->close();
                    http_response_code(500);
                    echo json_encode([
                        "success" => false,
                        "message" => "Failed to create account for Google user: " . ($insert_error ?: "Database insert error.")
                    ]);
                    exit();
                }
            }
        } else {
            // Update last login timestamp and email verification flag
            $updateSql = "UPDATE users SET last_login_at = NOW(), updated_at = NOW()";
            if (!empty($firebase_uid) && empty($user['firebase_uid'])) {
                $updateSql .= ", firebase_uid = '" . $conn->real_escape_string($firebase_uid) . "'";
            }
            if (!$user['is_email_verified']) {
                $updateSql .= ", is_email_verified = 1";
                $user['is_email_verified'] = 1;
            }
            $updateSql .= " WHERE id = '" . $conn->real_escape_string($user['id']) . "'";
            $conn->query($updateSql);
        }

        // Generate auth token
        $token = bin2hex(random_bytes(32));

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Google sign-in successful! Welcome back.",
            "token" => $token,
            "user" => [
                "id" => $user['id'],
                "role" => $user['role'],
                "name" => trim($user['first_name'] . ' ' . $user['last_name']),
                "firstName" => $user['first_name'],
                "lastName" => $user['last_name'],
                "email" => $user['email'],
                "countryCode" => $user['country_code'] ?? '+254',
                "phoneNumber" => $user['phone_number'] ?? '',
                "preferredLanguage" => $user['preferred_language'] ?? 'en',
                "avatar" => $user['avatar_url'],
                "avatarUrl" => $user['avatar_url'],
                "authProvider" => $user['auth_provider'],
                "isVerified" => (bool)($user['is_email_verified'] ?? 1),
                "isEmailVerified" => (bool)($user['is_email_verified'] ?? 1)
            ]
        ]);
        exit();
    }

    // =========================================================================
    // 8. FLOW B: EMAIL & PASSWORD LOGIN
    // =========================================================================
    if (empty($password)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Please enter your password."
        ]);
        exit();
    }

    // Get user from database
    $stmt = $conn->prepare("
        SELECT id, role, first_name, last_name, email, password_hash,
               country_code, phone_number, preferred_language,
               avatar_url, auth_provider, firebase_uid, is_email_verified 
        FROM users 
        WHERE email = ? LIMIT 1
    ");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "No account found with this email address. Please check your spelling or sign up."
        ]);
        exit();
    }

    // If account was created with Google only (no password hash)
    if ((empty($user['password_hash']) || $user['password_hash'] === '*OAUTH_GOOGLE_ACCOUNT*') && $user['auth_provider'] === 'google') {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "This account was registered using Google. Please click 'Continue with Google' to log in."
        ]);
        exit();
    }

    // Verify Password Hash
    if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Incorrect password. Please try again or reset your password."
        ]);
        exit();
    }

    // Update last login timestamp
    $update = $conn->prepare("UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?");
    if ($update) {
        $update->bind_param("s", $user['id']);
        $update->execute();
        $update->close();
    }

    // Generate auth token
    $token = bin2hex(random_bytes(32));

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Login successful! Welcome back.",
        "token" => $token,
        "user" => [
            "id" => $user['id'],
            "role" => $user['role'],
            "name" => trim($user['first_name'] . ' ' . $user['last_name']),
            "firstName" => $user['first_name'],
            "lastName" => $user['last_name'],
            "email" => $user['email'],
            "countryCode" => $user['country_code'] ?? '+254',
            "phoneNumber" => $user['phone_number'] ?? '',
            "preferredLanguage" => $user['preferred_language'] ?? 'en',
            "avatar" => $user['avatar_url'],
            "avatarUrl" => $user['avatar_url'],
            "authProvider" => $user['auth_provider'],
            "isVerified" => (bool)($user['is_email_verified'] ?? 0),
            "isEmailVerified" => (bool)($user['is_email_verified'] ?? 0)
        ]
    ]);
    exit();

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error during authentication: " . $e->getMessage()
    ]);
    exit();
}
?>
