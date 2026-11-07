<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful Change Password API
 * Path: /api/v1/change-password.php
 * Handles secure updating of user password hashes
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

    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "Method Not Allowed. Only POST is accepted."
        ]);
        exit();
    }

    // 2. Read input payload
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    $id = $data['id'] ?? null;
    $password = $data['password'] ?? null;
    $current_password = $data['current_password'] ?? null;

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID is required."]);
        exit();
    }

    if (empty($password) || strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "New password must be at least 6 characters long."]);
        exit();
    }

    // 3. Fetch user and check current password hash if it exists
    $stmt = $conn->prepare("SELECT password_hash, auth_provider FROM users WHERE id = ?");
    if (!$stmt) {
        throw new Exception("SQL Preparation failed: " . $conn->error);
    }
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "User not found."]);
        exit();
    }

    // If password_hash exists in db, require current_password verification
    if (!empty($user['password_hash'])) {
        if (empty($current_password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Current password is required to change password."]);
            exit();
        }
        if (!password_verify($current_password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Incorrect current password."]);
            exit();
        }
    }

    // 4. Securely hash the password and update
    $new_hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt_update = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    if (!$stmt_update) {
        throw new Exception("SQL Update statement prep failed: " . $conn->error);
    }
    $stmt_update->bind_param("ss", $new_hash, $id);
    $stmt_update->execute();
    $stmt_update->close();

    echo json_encode([
        "success" => true,
        "message" => "Password updated successfully!"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Internal Server Error: " . $e->getMessage()
    ]);
}
?>
