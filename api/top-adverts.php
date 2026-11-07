<?php
/**
 * RESTful API for UQlearn Top Nav Advertisements
 * Endpoint: /api/v1/top-adverts.php
 * Automatically provisions the `top_adverts` table if missing.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // 1. Auto-create `top_adverts` table if it doesn't exist
    $table_check_sql = "CREATE TABLE IF NOT EXISTS `top_adverts` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `image_url` varchar(512) NOT NULL,
      `link_url` varchar(512) DEFAULT NULL,
      `title` varchar(255) DEFAULT NULL,
      `alt_text` varchar(255) DEFAULT NULL,
      `bg_color` varchar(32) DEFAULT '#0f172a',
      `is_active` tinyint(1) NOT NULL DEFAULT 1,
      `display_order` int(11) NOT NULL DEFAULT 0,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `active_order_idx` (`is_active`, `display_order`, `created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    if (isset($conn) && $conn instanceof mysqli) {
        @$conn->query($table_check_sql);
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        @$pdo->exec($table_check_sql);
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // 2. Direct Image Upload Action
    if ($action === 'upload' || (!empty($_FILES) && $method === 'POST' && $action !== 'save')) {
        $fileKey = isset($_FILES['image']) ? 'image' : (isset($_FILES['file']) ? 'file' : (isset($_FILES['fileData']) ? 'fileData' : null));
        
        if (!$fileKey || !isset($_FILES[$fileKey])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No image file provided in upload."]);
            exit;
        }

        $file = $_FILES[$fileKey];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "File upload error code: " . $file['error']]);
            exit;
        }

        $baseUploadDir = "../../uploads/adverts/";
        if (!is_dir($baseUploadDir)) {
            $baseUploadDir = "../../uploads/";
            if (!is_dir($baseUploadDir)) {
                @mkdir($baseUploadDir, 0755, true);
            }
            $baseUploadDir = "../../uploads/adverts/";
            @mkdir($baseUploadDir, 0755, true);
        }

        $fileName = basename($file["name"]);
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

        if (!in_array($fileExt, $allowedExts)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid image extension. Only JPG, PNG, WEBP, GIF, SVG allowed."]);
            exit;
        }

        $finalFileName = time() . '_' . bin2hex(random_bytes(8)) . '.' . $fileExt;
        $targetFilePath = $baseUploadDir . $finalFileName;

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
            $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'uqlearn.org';
            $publicUrl = $protocol . "://" . $host . "/uploads/adverts/" . $finalFileName;

            // If action is upload_and_save, insert immediately into top_adverts
            if ($action === 'upload_and_save') {
                $linkUrl = $_POST['link_url'] ?? $_POST['linkUrl'] ?? '';
                $title = $_POST['title'] ?? 'Top Nav Advert';
                $altText = $_POST['alt_text'] ?? $_POST['altText'] ?? 'UQlearn Special Offer';
                $bgColor = $_POST['bg_color'] ?? $_POST['bgColor'] ?? '#0f172a';
                $isActive = isset($_POST['is_active']) ? (int)$_POST['is_active'] : (isset($_POST['isActive']) ? ($_POST['isActive'] === 'true' || $_POST['isActive'] === '1' ? 1 : 0) : 1);
                $displayOrder = isset($_POST['display_order']) ? (int)$_POST['display_order'] : (isset($_POST['displayOrder']) ? (int)$_POST['displayOrder'] : 0);

                if (isset($conn) && $conn instanceof mysqli) {
                    $stmt = $conn->prepare("INSERT INTO `top_adverts` (`image_url`, `link_url`, `title`, `alt_text`, `bg_color`, `is_active`, `display_order`) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param("sssssii", $publicUrl, $linkUrl, $title, $altText, $bgColor, $isActive, $displayOrder);
                    $stmt->execute();
                    $insertId = $conn->insert_id;
                    $stmt->close();
                }

                echo json_encode([
                    "success" => true,
                    "message" => "Advert uploaded and saved successfully",
                    "id" => $insertId ?? null,
                    "url" => $publicUrl,
                    "image_url" => $publicUrl
                ]);
                exit;
            }

            echo json_encode([
                "success" => true,
                "message" => "Image uploaded successfully",
                "url" => $publicUrl,
                "image_url" => $publicUrl
            ]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to move uploaded file to destination"]);
            exit;
        }
    }

    // 3. GET: Retrieve Advertisements
    if ($method === 'GET') {
        $activeOnly = isset($_GET['active']) && ($_GET['active'] === '1' || $_GET['active'] === 'true');
        $id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;

        if ($id) {
            $sql = "SELECT * FROM `top_adverts` WHERE `id` = $id LIMIT 1";
            $res = $conn->query($sql);
            if ($res && $row = $res->fetch_assoc()) {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "id" => (int)$row['id'],
                        "imageUrl" => $row['image_url'],
                        "image_url" => $row['image_url'],
                        "linkUrl" => $row['link_url'],
                        "link_url" => $row['link_url'],
                        "title" => $row['title'],
                        "altText" => $row['alt_text'],
                        "alt_text" => $row['alt_text'],
                        "bgColor" => $row['bg_color'],
                        "bg_color" => $row['bg_color'],
                        "isActive" => (bool)$row['is_active'],
                        "is_active" => (int)$row['is_active'],
                        "displayOrder" => (int)$row['display_order'],
                        "display_order" => (int)$row['display_order'],
                        "createdAt" => $row['created_at'],
                        "updatedAt" => $row['updated_at']
                    ]
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Advert not found"]);
            }
            exit;
        }

        $whereClause = $activeOnly ? "WHERE `is_active` = 1" : "";
        $sql = "SELECT * FROM `top_adverts` $whereClause ORDER BY `display_order` ASC, `created_at` DESC";
        $result = $conn->query($sql);

        $adverts = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $adverts[] = [
                    "id" => (int)$row['id'],
                    "imageUrl" => $row['image_url'],
                    "image_url" => $row['image_url'],
                    "linkUrl" => $row['link_url'],
                    "link_url" => $row['link_url'],
                    "title" => $row['title'],
                    "altText" => $row['alt_text'],
                    "alt_text" => $row['alt_text'],
                    "bgColor" => $row['bg_color'] ?? '#0f172a',
                    "bg_color" => $row['bg_color'] ?? '#0f172a',
                    "isActive" => (bool)$row['is_active'],
                    "is_active" => (int)$row['is_active'],
                    "displayOrder" => (int)$row['display_order'],
                    "display_order" => (int)$row['display_order'],
                    "createdAt" => $row['created_at'],
                    "updatedAt" => $row['updated_at']
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "data" => $adverts,
            "count" => count($adverts)
        ]);
        exit;
    }

    // 4. POST: Create or Update Advert
    if ($method === 'POST') {
        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true) ?? $_POST;
        $reqAction = $data['action'] ?? $action;

        // Toggle Active Action
        if ($reqAction === 'toggle_active') {
            $id = (int)($data['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Advert ID is required"]);
                exit;
            }
            $newState = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : (isset($data['is_active']) ? (int)$data['is_active'] : null);
            
            if ($newState !== null) {
                $conn->query("UPDATE `top_adverts` SET `is_active` = $newState, `updated_at` = NOW() WHERE `id` = $id");
            } else {
                $conn->query("UPDATE `top_adverts` SET `is_active` = IF(`is_active` = 1, 0, 1), `updated_at` = NOW() WHERE `id` = $id");
            }

            echo json_encode(["success" => true, "message" => "Advert status updated"]);
            exit;
        }

        // Delete Action
        if ($reqAction === 'delete') {
            $id = (int)($data['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Advert ID is required"]);
                exit;
            }
            $conn->query("DELETE FROM `top_adverts` WHERE `id` = $id");
            echo json_encode(["success" => true, "message" => "Advert deleted successfully"]);
            exit;
        }

        // Save / Update Action
        $id = isset($data['id']) && is_numeric($data['id']) ? (int)$data['id'] : null;
        $imageUrl = trim($data['imageUrl'] ?? ($data['image_url'] ?? ''));
        $linkUrl = trim($data['linkUrl'] ?? ($data['link_url'] ?? ''));
        $title = trim($data['title'] ?? 'Special Announcement');
        $altText = trim($data['altText'] ?? ($data['alt_text'] ?? 'Advert Banner'));
        $bgColor = trim($data['bgColor'] ?? ($data['bg_color'] ?? '#0f172a'));
        $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : (isset($data['is_active']) ? (int)$data['is_active'] : 1);
        $displayOrder = isset($data['displayOrder']) ? (int)$data['displayOrder'] : (isset($data['display_order']) ? (int)$data['display_order'] : 0);

        if (empty($imageUrl)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Advert image URL is required"]);
            exit;
        }

        if ($id) {
            // Update existing
            $stmt = $conn->prepare("UPDATE `top_adverts` SET `image_url` = ?, `link_url` = ?, `title` = ?, `alt_text` = ?, `bg_color` = ?, `is_active` = ?, `display_order` = ?, `updated_at` = NOW() WHERE `id` = ?");
            $stmt->bind_param("sssssiii", $imageUrl, $linkUrl, $title, $altText, $bgColor, $isActive, $displayOrder, $id);
            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true, 
                    "message" => "Top advert updated successfully",
                    "id" => $id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Update failed: " . $stmt->error]);
            }
            $stmt->close();
        } else {
            // Insert new
            $stmt = $conn->prepare("INSERT INTO `top_adverts` (`image_url`, `link_url`, `title`, `alt_text`, `bg_color`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->bind_param("sssssii", $imageUrl, $linkUrl, $title, $altText, $bgColor, $isActive, $displayOrder);
            if ($stmt->execute()) {
                $newId = $conn->insert_id;
                echo json_encode([
                    "success" => true,
                    "message" => "Top advert created successfully",
                    "id" => $newId,
                    "data" => [
                        "id" => $newId,
                        "imageUrl" => $imageUrl,
                        "linkUrl" => $linkUrl,
                        "title" => $title,
                        "isActive" => (bool)$isActive,
                        "displayOrder" => $displayOrder
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Insert failed: " . $stmt->error]);
            }
            $stmt->close();
        }
        exit;
    }

    // 5. DELETE
    if ($method === 'DELETE') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        $id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : ($data['id'] ?? null);

        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Advert ID is required for deletion"]);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM `top_adverts` WHERE `id` = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Top advert deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Deletion failed: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
