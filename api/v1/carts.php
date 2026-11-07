<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

// Ensure carts table exists
$createCartsTable = "CREATE TABLE IF NOT EXISTS `carts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `learner_id` VARCHAR(64) NOT NULL,
    `course_id` VARCHAR(64) NOT NULL,
    `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_notified` DATETIME DEFAULT NULL,
    UNIQUE KEY `unique_learner_course` (`learner_id`, `course_id`),
    INDEX `idx_learner` (`learner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if (!$conn->query($createCartsTable)) {
    echo json_encode(['success' => false, 'message' => 'Table creation failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $_GET['action'] ?? $_POST['action'] ?? ($input['action'] ?? '');

if ($action === 'add') {
    $learnerId = trim($input['learner_id'] ?? '');
    $courseId = trim($input['course_id'] ?? '');
    if (empty($learnerId) || empty($courseId)) {
        echo json_encode(['success' => false, 'message' => 'Missing learner_id or course_id']);
        exit();
    }
    $stmt = $conn->prepare("INSERT IGNORE INTO carts (learner_id, course_id, added_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $learnerId, $courseId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Item added']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Insert failed: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'remove') {
    $learnerId = trim($input['learner_id'] ?? '');
    $courseId = trim($input['course_id'] ?? '');
    $stmt = $conn->prepare("DELETE FROM carts WHERE learner_id = ? AND course_id = ?");
    $stmt->bind_param("ss", $learnerId, $courseId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Item removed']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Delete failed: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'list') {
    $learnerId = trim($_GET['learner_id'] ?? '');
    $stmt = $conn->prepare("SELECT course_id FROM carts WHERE learner_id = ?");
    $stmt->bind_param("s", $learnerId);
    $stmt->execute();
    $res = $stmt->get_result();
    $items = [];
    while ($row = $res->fetch_assoc()) { $items[] = $row['course_id']; }
    echo json_encode(['success' => true, 'data' => $items]);
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
$conn->close();
?>
