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

    // 4. Read JSON Input
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true);

    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid or empty JSON payload provided."
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // 5. Extract Fields
    $auth_provider = isset($data['authProvider']) ? strtolower(trim($data['authProvider'])) : 'email';
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
    $password = isset($data['password']) ? (string)$data['password'] : '';
    $firebase_uid = isset($data['firebaseUid']) ? trim($data['firebaseUid']) : (isset($data['firebase_uid']) ? trim($data['firebase_uid']) : '');
    $role_requested = isset($data['role']) ? strtolower(trim($data['role'])) : '';

    // 6. Basic Validation
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Please provide a valid email address."
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if (!in_array($auth_provider, ['email', 'google', 'apple'])) {
        http_response_code(422);
        echo json_encode([
            "success" => false,
            "message" => "Invalid authentication provider."
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
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
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
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

        // If user not found, auto-create or return 404 with guidance
        if (!$user) {
            $displayName = isset($data['displayName']) ? trim($data['displayName']) : (isset($data['name']) ? trim($data['name']) : '');
            $photoURL = isset($data['photoURL']) ? trim($data['photoURL']) : (isset($data['avatar']) ? trim($data['avatar']) : '');
            $nameParts = !empty($displayName) ? explode(' ', $displayName, 2) : ['User', ''];
            $firstName = $nameParts[0];
            $lastName = isset($nameParts[1]) ? $nameParts[1] : '';

            $newId = 'usr_' . bin2hex(random_bytes(8));
            $userRole = in_array($role_requested, ['learner', 'instructor', 'admin']) ? $role_requested : 'learner';
            $avatar = !empty($photoURL) ? $photoURL : 'https://ui-avatars.com/api/?name=' . urlencode($displayName ?: $email) . '&background=random&size=128';

            $insert = $conn->prepare("
                INSERT INTO users (
                    id, role, first_name, last_name, email, 
                    avatar_url, auth_provider, firebase_uid, is_email_verified, 
                    agreed_terms, last_login_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
            ");
            $insert->bind_param("ssssssss", $newId, $userRole, $firstName, $lastName, $email, $avatar, $auth_provider, $firebase_uid);
            
            if ($insert->execute()) {
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
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "No account found with this Google email. Please register first."
                ]);
                $conn->close();
                exit();
            }
            $insert->close();
        } else {
            // Update firebase_uid and last_login if needed
            $updateSql = "UPDATE users SET last_login_at = NOW(), updated_at = NOW()";
            if (!empty($firebase_uid) && empty($user['firebase_uid'])) {
                $updateSql .= ", firebase_uid = '" . $conn->real_escape_string($firebase_uid) . "'";
            }
            // Auto mark verified if logging in via Google
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
        $conn->close();
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
        $conn->close();
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
        $conn->close();
        exit();
    }

    // If account was created with Google only (no password hash)
    if (empty($user['password_hash']) && $user['auth_provider'] === 'google') {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "This account was registered using Google. Please click 'Continue with Google' to log in."
        ]);
        $conn->close();
        exit();
    }

    // Verify Password Hash
    if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Incorrect password. Please try again or reset your password."
        ]);
        $conn->close();
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

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error during authentication: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
