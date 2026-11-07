<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
$learnerId = $input['learner_id'] ?? '';
$customMessage = $input['custom_message'] ?? '';
$templateType = $input['template_type'] ?? 'nudge';

if (empty($learnerId)) {
    echo json_encode(['success' => false, 'message' => 'learner_id required']);
    exit();
}

$sql = "SELECT u.email, u.first_name, c.course_id, cr.title as course_title, cr.created_by, cr.price
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

$firstName = $row['first_name'];
$courseTitle = $row['course_title'];
$price = $row['price'];

$subject = "";
$html = "";
$body = "";

if ($templateType === 'scarcity') {
    $subject = "⚠️ Last chance! Your course is still in your cart";
    $body = "Hi {$firstName},\n\nYour cart is about to expire. We've saved {$courseTitle} for you, but spots are filling up fast.\n\nWe would hate for you to miss out on this cohort.\n\nTotal: KES {$price}\n\n[ Complete Enrollment Now ]\n\nNeed help? Reply to this email and our support team will assist you.\n\nBest,\nThe UQLearn Team";
    $html = "<html><body><img src='https://uqlearn.org/logo/logo.png' style='width: 100px; height: 100px; border-radius: 50%; object-fit: cover;' /><p>Hi {$firstName},</p><p>Your cart is about to expire. We've saved <strong>{$courseTitle}</strong> for you, but spots are filling up fast.</p><p>We would hate for you to miss out on this cohort.</p><p>Total: KES {$price}</p><p><a href='https://uqlearn.org/checkout' style='padding: 10px 20px; background: #0d9488; color: white; text-decoration: none; border-radius: 5px;'>Complete Enrollment Now</a></p><p>Need help? Reply to this email and our support team will assist you.</p><p>Best,<br/>The UQLearn Team</p></body></html>";
} elseif ($templateType === 'incentive') {
    $subject = "We saved your seat! Here's a little something to help...";
    $body = "Hi {$firstName},\n\nWe noticed {$courseTitle} is still in your cart. To help you get started, we'd love to offer you 10% off your enrollment!\n\nTotal: KES {$price}\n\n[ Apply Discount & Checkout ]\n\nNeed help? Reply to this email and our support team will assist you.\n\nBest,\nThe UQLearn Team";
    $html = "<html><body><img src='https://uqlearn.org/logo/logo.png' style='width: 100px; height: 100px; border-radius: 50%; object-fit: cover;' /><p>Hi {$firstName},</p><p>We noticed <strong>{$courseTitle}</strong> is still in your cart. To help you get started, we'd love to offer you <strong>10% off</strong> your enrollment!</p><p>Total: KES {$price}</p><p><a href='https://uqlearn.org/checkout' style='padding: 10px 20px; background: #0d9488; color: white; text-decoration: none; border-radius: 5px;'>Apply Discount & Checkout</a></p><p>Need help? Reply to this email and our support team will assist you.</p><p>Best,<br/>The UQLearn Team</p></body></html>";
} else { // nudge
    $subject = "Did you forget something? Your cart is waiting! 🛒";
    $body = "Hi {$firstName},\n\nWe noticed you left {$courseTitle} in your cart.\n\nYour spot isn't secure until you complete your enrollment. Don't miss out on the opportunity to upskill and advance your career!\n\nTotal: KES {$price}\n\n[ Complete Enrollment Now ]\n\nNeed help? Reply to this email and our support team will assist you.\n\nBest,\nThe UQLearn Team";
    $html = "<html><body><img src='https://uqlearn.org/logo/logo.png' style='width: 100px; height: 100px; border-radius: 50%; object-fit: cover;' /><p>Hi {$firstName},</p><p>We noticed you left <strong>{$courseTitle}</strong> in your cart.</p><p>Your spot isn't secure until you complete your enrollment. Don't miss out on the opportunity to upskill and advance your career!</p><p>Total: KES {$price}</p><p><a href='https://uqlearn.org/checkout' style='padding: 10px 20px; background: #0d9488; color: white; text-decoration: none; border-radius: 5px;'>Complete Enrollment Now</a></p><p>Need help? Reply to this email and our support team will assist you.</p><p>Best,<br/>The UQLearn Team</p></body></html>";
}

$mailResult = AppMailer::send($row['email'], $subject, $html, $body, $conn);
if($mailResult['success']) {
    $updStmt = $conn->prepare("UPDATE carts SET last_notified = NOW() WHERE learner_id = ?");
    $updStmt->bind_param("s", $learnerId);
    $updStmt->execute();
    $updStmt->close();
}
echo json_encode($mailResult);
$conn->close();
?>
