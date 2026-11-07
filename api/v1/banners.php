<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Banners
 * Compatible with Shared Hosting (PHP 7.4+)
 * Path: /api/v1/banners.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    // Use centralized database connection
    require_once __DIR__ . '/db.php';

    // Auto-create banners table if it doesn't exist
    $table_check_sql = "CREATE TABLE IF NOT EXISTS `banners` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `image_url` varchar(512) NOT NULL,
      `is_active` tinyint(1) DEFAULT 1,
      `display_order` int(11) DEFAULT 0,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `active_order` (`is_active`,`display_order`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($table_check_sql);

    $method = $_SERVER['REQUEST_METHOD'];
    $path_info = $_SERVER['PATH_INFO'] ?? '';
    $request = explode('/', trim($path_info, '/'));
    $id = isset($request[0]) && is_numeric($request[0]) ? (int)$request[0] : (isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null);

    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM banners WHERE id = ?");
                if ($stmt) {
                    $stmt->bind_param("i", $id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $banner = $result->fetch_assoc();
                    $stmt->close();
                    if ($banner) {
                        echo json_encode(["success" => true, "data" => $banner]);
                    } else {
                        http_response_code(404);
                        echo json_encode(["success" => false, "message" => "Banner not found"]);
                    }
                }
            } else {
                $result = $conn->query("SELECT * FROM banners ORDER BY display_order ASC, created_at DESC");
                $banners = [];
                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $banners[] = [
                            'id' => (int)$row['id'],
                            'imageUrl' => $row['image_url'],
                            'image_url' => $row['image_url'],
                            'isActive' => (bool)$row['is_active'],
                            'is_active' => (int)$row['is_active'],
                            'displayOrder' => (int)$row['display_order'],
                            'display_order' => (int)$row['display_order'],
                            'createdAt' => $row['created_at'],
                            'updatedAt' => $row['updated_at']
                        ];
                    }
                }
                echo json_encode(["success" => true, "data" => $banners]);
            }
            break;

        case 'POST':
            $rawInput = file_get_contents("php://input");
            $data = json_decode($rawInput, true);
            $imageUrl = $data['imageUrl'] ?? ($data['image_url'] ?? '');

            if (!empty($imageUrl)) {
                $stmt = $conn->prepare("INSERT INTO banners (image_url, is_active, display_order) VALUES (?, ?, ?)");
                if ($stmt) {
                    $is_active = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : ($data['is_active'] ?? 1);
                    $display_order = isset($data['displayOrder']) ? (int)$data['displayOrder'] : ($data['display_order'] ?? 0);
                    $stmt->bind_param("sii", $imageUrl, $is_active, $display_order);
                    
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "id" => $conn->insert_id, "message" => "Banner created successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => "Save failed: " . $stmt->error]);
                    }
                    $stmt->close();
                }
            } else {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Banner image URL is required"]);
            }
            break;

        case 'PUT':
            $rawInput = file_get_contents("php://input");
            $data = json_decode($rawInput, true);
            $targetId = $id ?? ($data['id'] ?? null);

            if (!$targetId) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID required for update"]);
                break;
            }

            $imageUrl = $data['imageUrl'] ?? ($data['image_url'] ?? '');
            $is_active = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : ($data['is_active'] ?? 1);
            $display_order = isset($data['displayOrder']) ? (int)$data['displayOrder'] : ($data['display_order'] ?? 0);

            $stmt = $conn->prepare("UPDATE banners SET image_url=?, is_active=?, display_order=? WHERE id=?");
            if ($stmt) {
                $stmt->bind_param("siii", $imageUrl, $is_active, $display_order, $targetId);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "Banner updated successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "message" => "Update failed: " . $stmt->error]);
                }
                $stmt->close();
            }
            break;

        case 'DELETE':
            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true);
            $targetId = $id ?? ($data['id'] ?? null);

            if (!$targetId) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID required for deletion"]);
                break;
            }
            $stmt = $conn->prepare("DELETE FROM banners WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("i", $targetId);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "Banner deleted successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "message" => "Deletion failed: " . $stmt->error]);
                }
                $stmt->close();
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Method not allowed"]);
            break;
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Banners API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
