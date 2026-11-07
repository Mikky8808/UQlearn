<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful Profile & Accolades Management API
 * Path: /api/v1/profile.php
 * Handles GET (fetch) and POST/PUT (update) for instructor profiles
 */

// Enable full error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

// Central CORS headers
header("Content-Type: application/json; charset=UTF-8");


try {
    // 1. Establish central database connection
    require_once __DIR__ . '/db.php';

    // 2. Ensure custom profile columns exist in the 'users' table
    $columns = [
        'bio' => 'TEXT DEFAULT NULL',
        'website' => 'VARCHAR(255) DEFAULT NULL',
        'twitter' => 'VARCHAR(100) DEFAULT NULL',
        'instructor_title' => 'VARCHAR(255) DEFAULT NULL',
        'country_code' => "VARCHAR(10) DEFAULT '+254'",
        'phone_number' => "VARCHAR(30) DEFAULT NULL",
        'preferred_language' => "VARCHAR(10) DEFAULT 'en'",
        'avatar_url' => "VARCHAR(2083) DEFAULT NULL",
        'agreed_marketing' => "TINYINT(1) DEFAULT 0",
        'status' => "VARCHAR(50) DEFAULT 'Active'",
        'auth_provider' => "VARCHAR(50) DEFAULT 'email'",
        'is_email_verified' => "TINYINT(1) DEFAULT 0",
        'last_login_at' => "DATETIME DEFAULT NULL"
    ];

    foreach ($columns as $col => $definition) {
        $check_col = @$conn->query("SHOW COLUMNS FROM `users` LIKE '$col'");
        if ($check_col && $check_col->num_rows === 0) {
            @$conn->query("ALTER TABLE `users` ADD COLUMN `$col` $definition");
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    $id = $_GET['id'] ?? ($data['id'] ?? null);

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID is required."]);
        exit();
    }

    if ($method === 'GET') {
        // --- FETCH PROFILE ---
        $stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
        if (!$stmt) {
            throw new Exception("SQL Preparation failed: " . $conn->error);
        }
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $user = $res->fetch_assoc();
        $stmt->close();

        if (!$user) {
            // User doesn't exist yet (e.g. newly signed-up Firebase user). Create a dynamic row.
            $first_name = $_GET['first_name'] ?? 'Instructor';
            $last_name = $_GET['last_name'] ?? 'Educator';
            $email = $_GET['email'] ?? ($id . "@uqlearn.org");
            $role = 'instructor';
            $status = 'Active';

            $stmt_insert = $conn->prepare("INSERT INTO users (id, role, first_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, ?)");
            if ($stmt_insert) {
                $stmt_insert->bind_param("ssssss", $id, $role, $first_name, $last_name, $email, $status);
                $stmt_insert->execute();
                $stmt_insert->close();
            }

            // Fetch newly created user
            $stmt_refetch = $conn->prepare("SELECT * FROM users WHERE id = ?");
            if ($stmt_refetch) {
                $stmt_refetch->bind_param("s", $id);
                $stmt_refetch->execute();
                $res_refetch = $stmt_refetch->get_result();
                $user = $res_refetch->fetch_assoc();
                $stmt_refetch->close();
            }
        }

        if ($user) {
            echo json_encode([
                "success" => true,
                "data" => [
                    "id" => $user['id'],
                    "role" => $user['role'],
                    "first_name" => $user['first_name'],
                    "last_name" => $user['last_name'],
                    "name" => trim($user['first_name'] . ' ' . $user['last_name']),
                    "email" => $user['email'],
                    "phone_number" => $user['phone_number'] ?? '',
                    "country_code" => $user['country_code'] ?? '+254',
                    "preferred_language" => $user['preferred_language'] ?? 'en',
                    "avatar_url" => $user['avatar_url'] ?? '',
                    "bio" => $user['bio'] ?? '',
                    "website" => $user['website'] ?? '',
                    "twitter" => $user['twitter'] ?? '',
                    "instructor_title" => $user['instructor_title'] ?? 'Senior Educator',
                    "is_email_verified" => (int)($user['is_email_verified'] ?? 0),
                    "agreed_marketing" => (int)($user['agreed_marketing'] ?? 0),
                    "status" => $user['status'] ?? 'Active',
                    "auth_provider" => $user['auth_provider'] ?? 'email',
                    "created_at" => $user['created_at'] ?? '',
                    "last_login_at" => $user['last_login_at'] ?? ''
                ]
            ]);
        } else {
            http_response_code(444);
            echo json_encode(["success" => false, "message" => "Failed to fetch or establish profile session."]);
        }

    } else if ($method === 'POST') {
        // --- UPDATE PROFILE ---
        $bio = $data['bio'] ?? null;
        $website = $data['website'] ?? null;
        $twitter = $data['twitter'] ?? null;
        $first_name = $data['first_name'] ?? null;
        $last_name = $data['last_name'] ?? null;
        $phone_number = $data['phone_number'] ?? null;
        $country_code = $data['country_code'] ?? null;
        $preferred_language = $data['preferred_language'] ?? null;
        $agreed_marketing = isset($data['agreed_marketing']) ? (int)$data['agreed_marketing'] : null;
        $instructor_title = $data['instructor_title'] ?? null;
        $avatar_url = $data['avatar_url'] ?? null;
        
        // Password-specific fields
        $password = $data['password'] ?? ($data['new_password'] ?? null);
        $current_password = $data['current_password'] ?? null;

        // Build dynamic SET clause
        $updates = [];
        $params = [];
        $types = "";

        if ($bio !== null) { $updates[] = "bio = ?"; $params[] = $bio; $types .= "s"; }
        if ($website !== null) { $updates[] = "website = ?"; $params[] = $website; $types .= "s"; }
        if ($twitter !== null) { $updates[] = "twitter = ?"; $params[] = $twitter; $types .= "s"; }
        if ($first_name !== null) { $updates[] = "first_name = ?"; $params[] = $first_name; $types .= "s"; }
        if ($last_name !== null) { $updates[] = "last_name = ?"; $params[] = $last_name; $types .= "s"; }
        if ($phone_number !== null) { $updates[] = "phone_number = ?"; $params[] = $phone_number; $types .= "s"; }
        if ($country_code !== null) { $updates[] = "country_code = ?"; $params[] = $country_code; $types .= "s"; }
        if ($preferred_language !== null) { $updates[] = "preferred_language = ?"; $params[] = $preferred_language; $types .= "s"; }
        if ($agreed_marketing !== null) { $updates[] = "agreed_marketing = ?"; $params[] = $agreed_marketing; $types .= "i"; }
        if ($instructor_title !== null) { $updates[] = "instructor_title = ?"; $params[] = $instructor_title; $types .= "s"; }
        if ($avatar_url !== null) { $updates[] = "avatar_url = ?"; $params[] = $avatar_url; $types .= "s"; }

        // Securely process password changes if requested
        if ($password !== null && trim($password) !== '') {
            // First fetch existing password hash to confirm identity
            $stmt_check = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
            if ($stmt_check) {
                $stmt_check->bind_param("s", $id);
                $stmt_check->execute();
                $res_check = $stmt_check->get_result();
                $row_check = $res_check->fetch_assoc();
                $stmt_check->close();

                if ($row_check && !empty($row_check['password_hash'])) {
                    if (empty($current_password)) {
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Current password is required to change password."]);
                        exit();
                    }
                    if (!password_verify($current_password, $row_check['password_hash'])) {
                        http_response_code(401);
                        echo json_encode(["success" => false, "message" => "Incorrect current password."]);
                        exit();
                    }
                }
            }

            // Securely hash the password using current standard PHP hashing (BCRYPT)
            $new_hash = password_hash($password, PASSWORD_BCRYPT);
            $updates[] = "password_hash = ?";
            $params[] = $new_hash;
            $types .= "s";
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No profile fields specified for update."]);
            exit();
        }

        // Add user ID to bind parameters
        $params[] = $id;
        $types .= "s";

        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("SQL Update Statement preparation failed: " . $conn->error);
        }

        $stmt->bind_param($types, ...$params);
        $exec = $stmt->execute();
        $stmt->close();

        if ($exec) {
            // Retrieve and return updated row
            $stmt_fetch = $conn->prepare("SELECT * FROM users WHERE id = ?");
            $stmt_fetch->bind_param("s", $id);
            $stmt_fetch->execute();
            $res = $stmt_fetch->get_result();
            $user = $res->fetch_assoc();
            $stmt_fetch->close();

            echo json_encode([
                "success" => true,
                "message" => "Public profile successfully updated and synchronized.",
                "data" => [
                    "id" => $user['id'],
                    "role" => $user['role'],
                    "first_name" => $user['first_name'],
                    "last_name" => $user['last_name'],
                    "name" => trim($user['first_name'] . ' ' . $user['last_name']),
                    "email" => $user['email'],
                    "phone_number" => $user['phone_number'] ?? '',
                    "country_code" => $user['country_code'] ?? '+254',
                    "preferred_language" => $user['preferred_language'] ?? 'en',
                    "avatar_url" => $user['avatar_url'] ?? '',
                    "bio" => $user['bio'] ?? '',
                    "website" => $user['website'] ?? '',
                    "twitter" => $user['twitter'] ?? '',
                    "instructor_title" => $user['instructor_title'] ?? 'Senior Educator',
                    "is_email_verified" => (int)($user['is_email_verified'] ?? 0),
                    "agreed_marketing" => (int)($user['agreed_marketing'] ?? 0),
                    "status" => $user['status'] ?? 'Active',
                    "auth_provider" => $user['auth_provider'] ?? 'email',
                    "created_at" => $user['created_at'] ?? '',
                    "last_login_at" => $user['last_login_at'] ?? ''
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update profile parameters in database."]);
        }

    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed. Use GET or POST."]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
