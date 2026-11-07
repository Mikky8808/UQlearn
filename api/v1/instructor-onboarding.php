<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

error_reporting(0);
ini_set('display_errors', '0');
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? $_POST['userId'] ?? '';
    $answers = $input['answers'] ?? [];

    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing userId']);
        exit;
    }

    if (isset($conn) && $conn instanceof mysqli) {
        @$conn->query("CREATE TABLE IF NOT EXISTS `instructor_onboarding` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` varchar(100) NOT NULL,
            `answers` text DEFAULT NULL,
            `completed_at` datetime DEFAULT current_timestamp(),
            PRIMARY KEY (`id`),
            UNIQUE KEY `user_id_idx` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

        $answersJson = json_encode($answers);
        $stmt = $conn->prepare("INSERT INTO `instructor_onboarding` (`user_id`, `answers`, `completed_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `answers` = VALUES(`answers`), `completed_at` = NOW()");
        if ($stmt) {
            $stmt->bind_param("ss", $userId, $answersJson);
            $stmt->execute();
            $stmt->close();
        }
    }

    echo json_encode(['success' => true, 'message' => 'Onboarding saved successfully']);
    exit;
}

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? '';
    if (empty($userId)) {
        echo json_encode(['success' => true, 'completed' => false]);
        exit;
    }

    $completed = false;
    if (isset($conn) && $conn instanceof mysqli) {
        $stmt = $conn->prepare("SELECT COUNT(*) FROM `instructor_onboarding` WHERE `user_id` = ?");
        if ($stmt) {
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $stmt->bind_result($count);
            if ($stmt->fetch() && $count > 0) {
                $completed = true;
            }
            $stmt->close();
        }
    }

    echo json_encode(['success' => true, 'completed' => $completed]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid method']);
