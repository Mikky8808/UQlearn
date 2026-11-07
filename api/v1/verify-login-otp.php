<?php
require_once __DIR__ . '/cors.php';
session_start();
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed."]);
    exit();
}

require_once __DIR__ . '/db.php';

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);
$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
$otp = isset($data['otp']) ? trim($data['otp']) : '';

// Verify session
if (!isset($_SESSION['login_otp']) || $_SESSION['login_otp'] !== $otp || 
    !isset($_SESSION['login_otp_email']) || $_SESSION['login_otp_email'] !== $email ||
    time() > $_SESSION['login_otp_expires']) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid or expired verification code."]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

// OTP valid, lookup user
$user_data = $conn->prepare("SELECT id, role, first_name, last_name, email, avatar_url, is_email_verified FROM users WHERE email = ?");
$user_data->bind_param("s", $email);
$user_data->execute();
$user_info = $user_data->get_result()->fetch_assoc();
$user_data->close();

// Clear session
unset($_SESSION['login_otp']);
unset($_SESSION['login_otp_email']);
unset($_SESSION['login_otp_expires']);

$token = bin2hex(random_bytes(32));

echo json_encode([
    "success" => true,
    "message" => "Login verified successfully!",
    "token" => $token,
    "user" => $user_info
]);

if (isset($conn) && $conn instanceof mysqli) $conn->close();
?>
