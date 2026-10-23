<?php
require_once __DIR__ . '/cors.php';
/**
 * Assets & Folder Management API for UQlearn
 * Path: /api/v1/assets.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    require_once __DIR__ . '/db.php';

    // Auto-create tables & migrations
    $schema = [
        "CREATE TABLE IF NOT EXISTS `asset_folders` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` varchar(128) NOT NULL,
            `name` varchar(255) NOT NULL,
            `parent_id` int(11) DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`id`),
            INDEX `idx_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
        
        "CREATE TABLE IF NOT EXISTS `uploaded_assets` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` varchar(128) NOT NULL,
            `folder_id` int(11) DEFAULT NULL,
            `file_name` varchar(255) NOT NULL,
            `file_path` varchar(512) NOT NULL,
            `file_url` varchar(512) NOT NULL,
            `file_type` varchar(64) DEFAULT NULL,
            `file_size` bigint(20) DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`id`),
            INDEX `idx_user_folder` (`user_id`, `folder_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    ];

    foreach ($schema as $sql) {
        @$conn->query($sql);
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $rawInput = file_get_contents("php://input");
    $data = !empty($rawInput) ? json_decode($rawInput, true) : [];

    $user_id = $_GET['user_id'] ?? ($_GET['userId'] ?? ($data['user_id'] ?? ($data['userId'] ?? 'admin')));

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            
            if ($action === 'list') {
                // Get Folders
                $folders = [];
                $stmt = $conn->prepare("SELECT * FROM asset_folders WHERE user_id = ? OR ? = 'admin' ORDER BY name ASC");
                if ($stmt) {
                    $stmt->bind_param("ss", $user_id, $user_id);
                    $stmt->execute();
                    $folders_result = $stmt->get_result();
                    if ($folders_result) {
                        while ($row = $folders_result->fetch_assoc()) {
                            $folders[] = $row;
                        }
                    }
                    $stmt->close();
                }

                // Get Assets
                $assets = [];
                $stmt = $conn->prepare("SELECT * FROM uploaded_assets WHERE user_id = ? OR ? = 'admin' ORDER BY created_at DESC");
                if ($stmt) {
                    $stmt->bind_param("ss", $user_id, $user_id);
                    $stmt->execute();
                    $assets_result = $stmt->get_result();
                    if ($assets_result) {
                        while ($row = $assets_result->fetch_assoc()) {
                            $assets[] = $row;
                        }
                    }
                    $stmt->close();
                }

                echo json_encode([
                    "success" => true,
                    "data" => [
                        "folders" => $folders,
                        "assets" => $assets
                    ]
                ]);
            }
            break;

        case 'POST':
            $action = $data['action'] ?? ($_GET['action'] ?? '');

            if ($action === 'create_folder') {
                $name = trim($data['name'] ?? 'New Folder');
                $parent_id = !empty($data['parent_id']) ? (int)$data['parent_id'] : (!empty($data['parentId']) ? (int)$data['parentId'] : null);
                
                $stmt = $conn->prepare("INSERT INTO asset_folders (user_id, name, parent_id) VALUES (?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("ssi", $user_id, $name, $parent_id);
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "id" => $conn->insert_id, "message" => "Folder created successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => $stmt->error]);
                    }
                    $stmt->close();
                }
            } 
            elseif ($action === 'rename_folder') {
                $folder_id = $data['folder_id'] ?? ($data['folderId'] ?? null);
                $name = trim($data['name'] ?? '');
                
                if (!$folder_id || !$name) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Folder ID and name required"]);
                    break;
                }

                $stmt = $conn->prepare("UPDATE asset_folders SET name = ? WHERE id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("siss", $name, $folder_id, $user_id, $user_id);
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "message" => "Folder renamed successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => $stmt->error]);
                    }
                    $stmt->close();
                }
            }
            elseif ($action === 'move_asset') {
                $asset_id = $data['asset_id'] ?? ($data['assetId'] ?? null);
                $folder_id = !empty($data['folder_id']) ? (int)$data['folder_id'] : (!empty($data['folderId']) ? (int)$data['folderId'] : null);
                
                if (!$asset_id) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Asset ID required"]);
                    break;
                }

                $stmt = $conn->prepare("UPDATE uploaded_assets SET folder_id = ? WHERE id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("iiss", $folder_id, $asset_id, $user_id, $user_id);
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "message" => "Asset moved successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => $stmt->error]);
                    }
                    $stmt->close();
                }
            }
            break;

        case 'DELETE':
            $action = $_GET['action'] ?? ($data['action'] ?? '');
            $id = $_GET['id'] ?? ($data['id'] ?? null);

            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "ID is required for deletion"]);
                break;
            }

            if ($action === 'delete_folder') {
                // First, move assets to root
                $stmt = $conn->prepare("UPDATE uploaded_assets SET folder_id = NULL WHERE folder_id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("iss", $id, $user_id, $user_id);
                    $stmt->execute();
                    $stmt->close();
                }

                // Then delete folder
                $stmt = $conn->prepare("DELETE FROM asset_folders WHERE id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("iss", $id, $user_id, $user_id);
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "message" => "Folder deleted successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => $stmt->error]);
                    }
                    $stmt->close();
                }
            }
            elseif ($action === 'delete_asset' || empty($action)) {
                // Get asset path first to delete file safely
                $stmt = $conn->prepare("SELECT file_path FROM uploaded_assets WHERE id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("iss", $id, $user_id, $user_id);
                    $stmt->execute();
                    $res = $stmt->get_result();
                    if ($res && $row = $res->fetch_assoc()) {
                        if (!empty($row['file_path']) && file_exists($row['file_path']) && is_file($row['file_path'])) {
                            @unlink($row['file_path']);
                        }
                    }
                    $stmt->close();
                }

                $stmt = $conn->prepare("DELETE FROM uploaded_assets WHERE id = ? AND (user_id = ? OR ? = 'admin')");
                if ($stmt) {
                    $stmt->bind_param("iss", $id, $user_id, $user_id);
                    if ($stmt->execute()) {
                        echo json_encode(["success" => true, "message" => "Asset deleted successfully"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["success" => false, "message" => $stmt->error]);
                    }
                    $stmt->close();
                }
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
        "message" => "Assets API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>