<?php
require_once __DIR__ . '/cors.php';
/**
 * Logout API - API v1
 * Path: /api/v1/logout.php
 * 
 * Explicitly destroys PHP session data (session_unset, session_destroy, setcookie)
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    // Start session if not started
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }

    // Unset all session variables
    @session_unset();

    // Delete session cookie if used
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        @setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    // Destroy the session
    @session_destroy();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Server session successfully destroyed."
    ]);
} catch (\Throwable $err) {
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Session cleared"
    ]);
}
exit();
?>
