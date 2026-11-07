<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Payment Gateways
 * Compatible with Shared Hosting (PHP 7.4+ / MySQLi)
 * Path: /api/v1/payment-gateways.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    // Use centralized database connection
    require_once __DIR__ . '/db.php';

    // Auto-create payment_gateways table if it doesn't exist
    $table_check_sql = "CREATE TABLE IF NOT EXISTS `payment_gateways` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `name` VARCHAR(128) NOT NULL,
      `slug` VARCHAR(64) NOT NULL,
      `logo_url` TEXT DEFAULT NULL,
      `is_active` TINYINT(1) NOT NULL DEFAULT 1,
      `api_key` TEXT DEFAULT NULL,
      `secret_key` TEXT DEFAULT NULL,
      `environment` VARCHAR(32) NOT NULL DEFAULT 'sandbox',
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($table_check_sql);

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            $result = $conn->query("SELECT * FROM payment_gateways ORDER BY created_at DESC");
            if ($result) {
                $gateways = [];
                while ($row = $result->fetch_assoc()) {
                    // Map snake_case database columns to camelCase expected by frontend
                    $gateways[] = [
                        "id" => $row['id'],
                        "name" => $row['name'],
                        "slug" => $row['slug'],
                        "logoUrl" => $row['logo_url'],
                        "isActive" => (bool)$row['is_active'],
                        "apiKey" => $row['api_key'],
                        "secretKey" => $row['secret_key'],
                        "environment" => $row['environment'],
                        "createdAt" => $row['created_at']
                    ];
                }
                echo json_encode(["success" => true, "data" => $gateways]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $conn->error]);
            }
            break;

        case 'POST':
        case 'PUT':
            $rawInput = file_get_contents("php://input");
            $data = json_decode($rawInput, true);
            
            if (!$data || !is_array($data)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid JSON payload"]);
                break;
            }

            if (!isset($data['name']) || empty(trim($data['name']))) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Gateway name is required."]);
                break;
            }

            $id = isset($data['id']) && !empty($data['id']) ? trim($data['id']) : 'gw-' . time();
            $name = trim($data['name']);
            $slug = isset($data['slug']) && !empty($data['slug']) ? trim($data['slug']) : strtolower(preg_replace('/[^a-z0-9]/', '-', $name));
            $logoUrl = isset($data['logoUrl']) ? $data['logoUrl'] : (isset($data['logo_url']) ? $data['logo_url'] : '');
            $isActive = isset($data['isActive']) ? (int)$data['isActive'] : (isset($data['is_active']) ? (int)$data['is_active'] : 1);
            $apiKey = isset($data['apiKey']) ? $data['apiKey'] : (isset($data['api_key']) ? $data['api_key'] : '');
            $secretKey = isset($data['secretKey']) ? $data['secretKey'] : (isset($data['secret_key']) ? $data['secret_key'] : '');
            $environment = isset($data['environment']) ? $data['environment'] : 'sandbox';

            // Check if gateway exists
            $check = $conn->prepare("SELECT id FROM payment_gateways WHERE id = ?");
            if ($check) {
                $check->bind_param("s", $id);
                $check->execute();
                $check_res = $check->get_result();

                if ($check_res && $check_res->num_rows > 0) {
                    // Update
                    $stmt = $conn->prepare("UPDATE payment_gateways SET name = ?, slug = ?, logo_url = ?, is_active = ?, api_key = ?, secret_key = ?, environment = ? WHERE id = ?");
                    if ($stmt) {
                        $stmt->bind_param("sssissss", $name, $slug, $logoUrl, $isActive, $apiKey, $secretKey, $environment, $id);
                        if ($stmt->execute()) {
                            echo json_encode(["success" => true, "message" => "Gateway updated successfully", "id" => $id]);
                        } else {
                            http_response_code(500);
                            echo json_encode(["success" => false, "error" => $stmt->error]);
                        }
                        $stmt->close();
                    }
                } else {
                    // Insert
                    $stmt = $conn->prepare("INSERT INTO payment_gateways (id, name, slug, logo_url, is_active, api_key, secret_key, environment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    if ($stmt) {
                        $stmt->bind_param("ssssisss", $id, $name, $slug, $logoUrl, $isActive, $apiKey, $secretKey, $environment);
                        if ($stmt->execute()) {
                            echo json_encode(["success" => true, "message" => "Gateway created successfully", "id" => $id]);
                        } else {
                            http_response_code(500);
                            echo json_encode(["success" => false, "error" => $stmt->error]);
                        }
                        $stmt->close();
                    }
                }
                $check->close();
            }
            break;

        case 'DELETE':
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
            $id = isset($_GET['id']) ? $_GET['id'] : ($input['id'] ?? '');
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Gateway ID is required."]);
                break;
            }

            $stmt = $conn->prepare("DELETE FROM payment_gateways WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("s", $id);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "Gateway deleted successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "error" => $stmt->error]);
                }
                $stmt->close();
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "error" => "Method not allowed"]);
            break;
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Payment gateways API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
