<?php
/**
 * UQlearn eLearning Platform - Google Client ID Endpoint
 * File Location: /public/a08f7503225e.php
 */

// Enable CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$googleClientId = '528811302865-ad4h3qmc7jqb6lkuth2u3ivn2ljdf77e.apps.googleusercontent.com';

echo json_encode([
    'success' => true,
    'clientId' => $googleClientId,
    'google_client_id' => $googleClientId,
    'client_id' => $googleClientId,
    'message' => 'Google Client ID retrieved successfully.'
]);
exit();
?>
