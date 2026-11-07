<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);

$courseId = $input['course_id'] ?? $input['courseId'] ?? '';
$message = $input['message'] ?? '';
$senderName = $input['sender_name'] ?? $input['senderName'] ?? 'Reviewer';

if (empty($courseId) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'course_id and message are required']);
    exit();
}

// Get instructor email
$stmt = $conn->prepare("SELECT u.email, u.first_name, c.title as course_title 
                        FROM courses c 
                        JOIN users u ON c.created_by = u.id 
                        WHERE c.id = ?");
$stmt->bind_param("s", $courseId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Instructor not found or course not linked to an instructor user']);
    exit();
}

$subject = "New Reviewer Message for: " . $row['course_title'];
$html = "<html><body>
    <img src='https://uqlearn.org/logo/logo.png' style='width: 100px; height: 100px; border-radius: 50%; object-fit: cover;' />
    <h2>New Message from Reviewer</h2>
    <p>Hi {$row['first_name']},</p>
    <p><strong>{$senderName}</strong> has sent you a message regarding your course <em>{$row['course_title']}</em>:</p>
    <div style='background: #f4f4f4; padding: 15px; border-radius: 10px;'>{$message}</div>
    <br>
    <a href='https://uqlearn.org/instructor/studio' style='padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;'>View in Studio</a>
</body></html>";

$mailResult = AppMailer::send($row['email'], $subject, $html, $message, $conn);

echo json_encode($mailResult);
$conn->close();
?>
