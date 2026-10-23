<?php
require_once __DIR__ . '/cors.php';
/**
 * Gemini API Key Manager Backend
 * Path: /api/v1/gemini-keys.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create gemini_api_keys table
    $conn->query("CREATE TABLE IF NOT EXISTS `gemini_api_keys` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `key_name` VARCHAR(255) NOT NULL,
        `api_key` TEXT NOT NULL,
        `model_default` VARCHAR(100) DEFAULT 'gemini-3.8-flash',
        `is_default` TINYINT(1) DEFAULT 0,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $res = $conn->query("SELECT * FROM gemini_api_keys ORDER BY is_default DESC, created_at DESC");
        $keys = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $keys[] = [
                    "id" => $row['id'],
                    "keyName" => $row['key_name'],
                    "apiKey" => $row['api_key'],
                    "modelDefault" => $row['model_default'],
                    "isDefault" => intval($row['is_default']) === 1,
                    "createdAt" => $row['created_at']
                ];
            }
        }

        echo json_encode(["success" => true, "keys" => $keys]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];
        $action = $data['action'] ?? 'add_key';

        if ($action === 'add_key') {
            $id = $data['id'] ?? ('gkey_' . time() . '_' . rand(100, 999));
            $key_name = $data['key_name'] ?? ($data['keyName'] ?? 'Production Gemini Key');
            $api_key = $data['api_key'] ?? ($data['apiKey'] ?? '');
            $model_default = $data['model_default'] ?? 'gemini-3.8-flash';

            if (!$api_key) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "API key is required"]);
                exit();
            }

            // Check if table is empty, if so make default
            $res_c = $conn->query("SELECT COUNT(*) as cnt FROM gemini_api_keys");
            $row_c = $res_c ? $res_c->fetch_assoc() : ['cnt' => 0];
            $is_default = intval($row_c['cnt']) === 0 ? 1 : (intval($data['is_default'] ?? 0) === 1 ? 1 : 0);

            if ($is_default === 1) {
                $conn->query("UPDATE gemini_api_keys SET is_default = 0");
            }

            $stmt = $conn->prepare("INSERT INTO gemini_api_keys (id, key_name, api_key, model_default, is_default) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $id, $key_name, $api_key, $model_default, $is_default);
            $stmt->execute();
            $stmt->close();

            echo json_encode(["success" => true, "message" => "Gemini API key added successfully", "id" => $id]);
            exit();
        }

        if ($action === 'set_default') {
            $id = $data['id'] ?? '';
            if ($id) {
                $conn->query("UPDATE gemini_api_keys SET is_default = 0");
                $stmt = $conn->prepare("UPDATE gemini_api_keys SET is_default = 1 WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
            }
            echo json_encode(["success" => true, "message" => "Default Gemini API key updated"]);
            exit();
        }

        if ($action === 'delete_key') {
            $id = $data['id'] ?? '';
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM gemini_api_keys WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
            }
            echo json_encode(["success" => true, "message" => "Gemini API key deleted"]);
            exit();
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>
