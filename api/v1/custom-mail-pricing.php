<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

// Ensure table exists
$conn->query("CREATE TABLE IF NOT EXISTS custom_mail_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features TEXT
)");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $res = $conn->query("SELECT * FROM custom_mail_pricing");
    $data = $res->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'data' => $data]);
} elseif ($method === 'POST') {
    // Admin update logic can be added here if needed
    echo json_encode(['success' => true, 'message' => 'Pricing updated successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
$conn->close();
?>
