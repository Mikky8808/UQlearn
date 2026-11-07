<?php
require_once __DIR__ . '/cors.php';
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed."]);
    exit();
}

require_once __DIR__ . '/db.php';

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
$otp = isset($data['otp']) ? trim((string)$data['otp']) : '';

if (empty($email) || empty($otp)) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Email and OTP are required."]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

// Fetch the latest unused OTP from the login_otps table
$stmt = $conn->prepare("
    SELECT id, otp_code, expires_at 
    FROM login_otps 
    WHERE email = ? AND is_used = 0 
    ORDER BY created_at DESC LIMIT 1
");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No active verification code found. Please request a new one."]);
    $stmt->close();
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

$otp_record = $result->fetch_assoc();
$stmt->close();

// Check if it matches
if ($otp_record['otp_code'] !== $otp) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid verification code."]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

// Check if expired
if (time() > strtotime($otp_record['expires_at'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Verification code has expired."]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
    exit();
}

// Mark OTP as used
$update_stmt = $conn->prepare("UPDATE login_otps SET is_used = 1 WHERE id = ?");
$update_stmt->bind_param("s", $otp_record['id']);
$update_stmt->execute();
$update_stmt->close();

// OTP is valid, lookup user
$user_data = $conn->prepare("SELECT id, role, first_name, last_name, email, avatar_url, is_email_verified FROM users WHERE email = ?");
$user_data->bind_param("s", $email);
$user_data->execute();
$user_info = $user_data->get_result()->fetch_assoc();
$user_data->close();

$token = bin2hex(random_bytes(32));

echo json_encode([
    "success" => true,
    "message" => "Login verified successfully!",
    "token" => $token,
    "user" => $user_info
]);

if (isset($conn) && $conn instanceof mysqli) $conn->close();
?>
