<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

// Fetch pending carts
$sql = "SELECT c.id, c.learner_id, c.course_id, u.email, u.first_name, cr.title as course_title, cr.createdBy
        FROM carts c
        JOIN users u ON c.learner_id = u.id
        JOIN courses cr ON c.course_id = cr.id
        WHERE (c.last_notified IS NULL OR c.last_notified < DATE_SUB(NOW(), INTERVAL 24 HOUR))";

$res = $conn->query($sql);
while ($row = $res->fetch_assoc()) {
    // Get instructor template/delay
    $tStmt = $conn->prepare("SELECT subject, body_text, headline, delay_hours FROM custom_mail_templates WHERE instructor_id = ?");
    $tStmt->bind_param("s", $row['createdBy']);
    $tStmt->execute();
    $template = $tStmt->get_result()->fetch_assoc();
    $tStmt->close();
    
    $delayHours = $template['delay_hours'] ?? 1;
    
    // Check if enough time has passed
    $checkAdded = $conn->prepare("SELECT id FROM carts WHERE id = ? AND added_at < DATE_SUB(NOW(), INTERVAL ? HOUR)");
    $checkAdded->bind_param("ii", $row['id'], $delayHours);
    $checkAdded->execute();
    $canSend = $checkAdded->get_result()->num_rows > 0;
    $checkAdded->close();

    if ($canSend) {
        $subject = $template['subject'] ?? "Reminder: Complete your enrollment in " . $row['course_title'];
        $body = $template['body_text'] ?? ("Hi " . $row['first_name'] . ", you left " . $row['course_title'] . " in your cart.");
        $html = "<html><body><h1>" . ($template['headline'] ?? 'Reminder!') . "</h1><p>" . nl2br($body) . "</p></body></html>";
        
        $mailResult = AppMailer::send($row['email'], $subject, $html, $body, $conn);
        
        if ($mailResult['success']) {
            $upd = $conn->prepare("UPDATE carts SET last_notified = NOW() WHERE id = ?");
            $upd->bind_param("i", $row['id']);
            $upd->execute();
        }
    }
}
$conn->close();
echo json_encode(['success' => true, 'message' => 'Reminders processed']);
?>
