<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

// Ensure table exists
$conn->query("CREATE TABLE IF NOT EXISTS custom_mail_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id VARCHAR(64) NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_instructor (instructor_id)
)");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $instructorId = $_GET['instructor_id'] ?? '';
    if ($instructorId) {
        $stmt = $conn->prepare("SELECT * FROM custom_mail_subscriptions WHERE instructor_id = ?");
        $stmt->bind_param("s", $instructorId);
        $stmt->execute();
        $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        $stmt->close();
    } else {
        $res = $conn->query("SELECT * FROM custom_mail_subscriptions");
        $data = $res->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $instructorId = $input['instructor_id'] ?? '';
    $planId = $input['plan_id'] ?? '';
    
    if (empty($instructorId) || empty($planId)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO custom_mail_subscriptions (instructor_id, plan_id) VALUES (?, ?)");
    $stmt->bind_param("ss", $instructorId, $planId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Subscription created']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create subscription']);
    }
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
$conn->close();
?>
