<?php
require_once __DIR__ . '/cors.php';
/**
 * Email & SMTP Settings API - API v1
 * Path: /api/v1/email-settings.php
 * 
 * Get and update SMTP credentials and outgoing mail configurations
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

try {
    // Ensure settings table exists
    $conn->query("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(128) PRIMARY KEY,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $smtp = AppMailer::getSmtpSettings($conn);
        echo json_encode([
            "success" => true,
            "settings" => [
                "enabled" => (bool)$smtp['enabled'],
                "host" => $smtp['host'],
                "port" => (int)$smtp['port'],
                "crypto" => $smtp['crypto'],
                "auth" => (bool)$smtp['auth'],
                "user" => $smtp['user'],
                "has_pass" => !empty($smtp['pass']),
                "from_email" => $smtp['from_email'],
                "from_name" => $smtp['from_name'],
                "reply_to" => $smtp['reply_to']
            ]
        ]);
        $conn->close();
        exit();
    }

    if ($method === 'POST' || $method === 'PUT') {
        $raw = file_get_contents('php://input');
        $data = !empty($raw) ? json_decode($raw, true) : $_POST;

        $keysToUpdate = [
            'smtp_enabled'    => isset($data['enabled']) ? ($data['enabled'] ? '1' : '0') : null,
            'smtp_host'       => isset($data['host']) ? trim($data['host']) : null,
            'smtp_port'       => isset($data['port']) ? (string)(int)$data['port'] : null,
            'smtp_crypto'     => isset($data['crypto']) ? strtolower(trim($data['crypto'])) : null,
            'smtp_auth'       => isset($data['auth']) ? ($data['auth'] ? '1' : '0') : null,
            'smtp_user'       => isset($data['user']) ? trim($data['user']) : null,
            'smtp_from_email' => isset($data['from_email']) ? trim($data['from_email']) : null,
            'smtp_from_name'  => isset($data['from_name']) ? trim($data['from_name']) : null,
            'smtp_reply_to'   => isset($data['reply_to']) ? trim($data['reply_to']) : null,
        ];

        // Only update password if a non-empty value was explicitly provided
        if (isset($data['pass']) && $data['pass'] !== '') {
            $keysToUpdate['smtp_pass'] = trim($data['pass']);
        }

        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        
        foreach ($keysToUpdate as $k => $v) {
            if ($v !== null) {
                $stmt->bind_param("ss", $k, $v);
                $stmt->execute();
            }
        }
        $stmt->close();

        $updatedSmtp = AppMailer::getSmtpSettings($conn);

        echo json_encode([
            "success" => true,
            "message" => "Email and SMTP settings updated successfully",
            "settings" => [
                "enabled" => (bool)$updatedSmtp['enabled'],
                "host" => $updatedSmtp['host'],
                "port" => (int)$updatedSmtp['port'],
                "crypto" => $updatedSmtp['crypto'],
                "auth" => (bool)$updatedSmtp['auth'],
                "user" => $updatedSmtp['user'],
                "has_pass" => !empty($updatedSmtp['pass']),
                "from_email" => $updatedSmtp['from_email'],
                "from_name" => $updatedSmtp['from_name'],
                "reply_to" => $updatedSmtp['reply_to']
            ]
        ]);

        $conn->close();
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    $conn->close();
} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Settings error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
