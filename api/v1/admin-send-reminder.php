<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
$learnerId = $input['learner_id'] ?? '';

if (empty($learnerId)) {
    echo json_encode(['success' => false, 'message' => 'learner_id required']);
    exit();
}

// Get learner details and first course
$sql = "SELECT u.email, u.first_name, c.course_id, cr.title as course_title, cr.createdBy
        FROM carts c
        JOIN users u ON c.learner_id = u.id
        JOIN courses cr ON c.course_id = cr.id
        WHERE c.learner_id = ? LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $learnerId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Cart empty or learner not found']);
    exit();
}

// Get instructor template
$tStmt = $conn->prepare("SELECT * FROM custom_mail_templates WHERE instructor_id = ? LIMIT 1");
$tStmt->bind_param("s", $row['createdBy']);
$tStmt->execute();
$template = $tStmt->get_result()->fetch_assoc();
$tStmt->close();

$subject = $template['subject'] ?? 'Reminder: Items in your cart';
$body = $template['body_text'] ?? "Hi " . $row['first_name'] . ", you have items in your cart.";
$html = "<html><body><h1>" . ($template['headline'] ?? 'Reminder') . "</h1><p>" . nl2br($body) . "</p></body></html>";

$mailResult = AppMailer::send($row['email'], $subject, $html, $body, $conn);

echo json_encode($mailResult);
$conn->close();
?>
