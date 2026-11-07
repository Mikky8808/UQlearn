<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

// Ensure table exists
$conn->query("CREATE TABLE IF NOT EXISTS custom_mail_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    headline VARCHAR(255),
    INDEX idx_instructor (instructor_id)
)");

$id = $_GET['id'] ?? '';
if (empty($id)) {
    echo json_encode(['success' => false, 'message' => 'id required']);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM custom_mail_templates WHERE instructor_id = ?");
$stmt->bind_param("s", $id);
$stmt->execute();
$res = $stmt->get_result();
$data = $res->fetch_all(MYSQLI_ASSOC);
echo json_encode(['success' => true, 'data' => $data]);
$stmt->close();
$conn->close();
?>
