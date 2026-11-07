<?php
/**
 * Purchases API Endpoint
 * Location: api/v1/purchases.php
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db.php';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = $input['action'] ?? '';

    if ($action === 'create_purchase') {
        $student_id = $input['student_id'] ?? $input['user_id'] ?? null;
        $course_id = $input['course_id'] ?? null;
        $amount = $input['amount'] ?? 0;
        $status = $input['status'] ?? 'success';

        if (!$student_id || !$course_id) {
            echo json_encode(["success" => false, "message" => "Missing student_id or course_id"]);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO purchases (id, user_id, course_id, amount, payment_status, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $purchase_id = $input['id'] ?? 'pur_' . uniqid();
        $stmt->execute([$purchase_id, $student_id, $course_id, $amount, $status]);

        echo json_encode(["success" => true, "message" => "Purchase record created successfully."]);
        exit();
    }
}

// Handle GET lookups
$student_id = $_GET['student_id'] ?? null;

if (!$student_id) {
    echo json_encode(["success" => false, "message" => "Missing student_id"]);
    exit();
}

$sql = "SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute([$student_id]);
$purchases = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "data" => $purchases
]);
?>
