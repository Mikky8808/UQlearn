<?php
// instructor-payout-settings.php

header("Content-Type: application/json");
// If your frontend and backend are on different domains, uncomment these lines
// header("Access-Control-Allow-Origin: https://your-frontend-domain.com");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit; // Handle preflight requests
}

require_once 'db.php'; // Assuming db.php handles database connection

// Ensure you handle authentication/authorization here
// session_start();
// if (!isset($_SESSION['user_id'])) {
//     http_response_code(401);
//     echo json_encode(["status" => "error", "message" => "Unauthorized"]);
//     exit;
// }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // TODO: Fetch payout settings from your database
    // $settings = db_fetch_payout_settings($_SESSION['user_id']);
    
    // Placeholder response
    echo json_encode([
        "status" => "success", 
        "data" => [
            "payout_method" => "bank", 
            "currency" => "USD",
            "threshold" => 50
        ]
    ]);
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // TODO: Update payout settings in your database
    // db_update_payout_settings($_SESSION['user_id'], $data);
    
    echo json_encode([
        "status" => "success", 
        "message" => "Settings saved successfully",
        "received_data" => $data
    ]);
} 
else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
}
?>
