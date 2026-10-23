<?php
require_once __DIR__ . '/db.php';
header("Content-Type: application/json; charset=UTF-8");

// Create table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS `reminders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `day` VARCHAR(20) NOT NULL,
  `time` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['user_id'] ?? $_POST['user_id'] ?? 'user_123'; // Should get from session

if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT * FROM reminders WHERE user_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $reminders = [];
    while ($row = $result->fetch_assoc()) {
        $reminders[] = $row;
    }
    echo json_encode(['success' => true, 'reminders' => $reminders]);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Support manual insertion from calendar data
    $title = $data['title'] ?? $data['summary'] ?? 'Learning Reminder';
    $day = $data['day'] ?? 'Monday';
    $time = $data['time'] ?? '09:00 AM';

    $id = uniqid('rem_');
    $stmt = $conn->prepare("INSERT INTO reminders (id, user_id, title, day, time) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $id, $userId, $title, $day, $time);
    $stmt->execute();
    echo json_encode(['success' => true, 'id' => $id]);
}
