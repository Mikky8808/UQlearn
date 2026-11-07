<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

// Admin view: get all abandoned carts grouped by learner
$sql = "SELECT c.learner_id, u.first_name, u.last_name, u.email, 
               GROUP_CONCAT(cr.title) as cart_items,
               GROUP_CONCAT(c.course_id) as course_ids
        FROM carts c
        JOIN users u ON c.learner_id = u.id
        JOIN courses cr ON c.course_id = cr.id
        GROUP BY c.learner_id";

$res = $conn->query($sql);
$data = [];
while ($row = $res->fetch_assoc()) {
    $data[] = [
        'learnerId' => $row['learner_id'],
        'learnerName' => $row['first_name'] . ' ' . $row['last_name'],
        'email' => $row['email'],
        'items' => explode(',', $row['cart_items']),
        'courseIds' => explode(',', $row['course_ids'])
    ];
}

echo json_encode(['success' => true, 'data' => $data]);
$conn->close();
?>
