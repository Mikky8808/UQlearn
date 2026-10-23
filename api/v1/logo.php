<?php
require_once __DIR__ . '/cors.php';
/**
 * Logo & Branding Settings API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/logo.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure settings table exists
    $conn->query("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $res = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'logo_url' LIMIT 1");
        if ($res && $res->num_rows > 0) {
            $row = $res->fetch_assoc();
            echo json_encode([
                "success" => true,
                "logoUrl" => $row['setting_value'],
                "logo_url" => $row['setting_value']
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "logoUrl" => "https://uqlearn.org/logo/logo.png",
                "logo_url" => "https://uqlearn.org/logo/logo.png"
            ]);
        }
    } elseif ($method === 'POST' || $method === 'PUT') {
        $rawInput = file_get_contents('php://input');
        $input = !empty($rawInput) ? json_decode($rawInput, true) : [];
        $logoUrl = isset($input['logoUrl']) ? trim($input['logoUrl']) : (isset($input['logo_url']) ? trim($input['logo_url']) : (isset($_POST['logoUrl']) ? trim($_POST['logoUrl']) : (isset($_POST['logo_url']) ? trim($_POST['logo_url']) : '')));

        if (empty($logoUrl)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "logoUrl is required"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('logo_url', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        if ($stmt) {
            $stmt->bind_param("s", $logoUrl);
            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Website logo updated successfully",
                    "logoUrl" => $logoUrl,
                    "logo_url" => $logoUrl
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $stmt->error
                ]);
            }
            $stmt->close();
        }
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Logo API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
