<?php
/**
 * RESTful API for UQlearn Video Folders (Film & Edit Drive)
 * Endpoint: /api/v1/video-folders.php
 * Handles creating, listing, renaming, deleting folders and moving videos between folders.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$jsonStoreFile = __DIR__ . '/../../uploads/video_folders.json';

function getFolderJsonStore($filePath) {
    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveFolderJsonStore($filePath, $data) {
    $dir = dirname($filePath);
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents($filePath, json_encode(array_values($data), JSON_PRETTY_PRINT));
}

try {
    // Ensure table exists
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->query("CREATE TABLE IF NOT EXISTS `video_folders` (
            `id` VARCHAR(64) PRIMARY KEY,
            `user_id` VARCHAR(100) NOT NULL,
            `course_id` VARCHAR(100) DEFAULT NULL,
            `name` VARCHAR(255) NOT NULL,
            `color` VARCHAR(50) DEFAULT 'indigo',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_vfolders_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Ensure uploaded_videos table exists
        $conn->query("CREATE TABLE IF NOT EXISTS `uploaded_videos` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `upload_id` varchar(100) NOT NULL,
            `user_id` varchar(100) DEFAULT NULL,
            `user_email` varchar(255) DEFAULT NULL,
            `file_name` varchar(255) NOT NULL,
            `file_path` varchar(255) NOT NULL,
            `file_url` varchar(500) NOT NULL,
            `file_size` bigint(20) NOT NULL,
            `folder` varchar(100) DEFAULT 'videos',
            `folder_id` varchar(64) DEFAULT NULL,
            `source` varchar(100) DEFAULT 'film_and_edit',
            `status` varchar(50) DEFAULT 'completed',
            `created_at` datetime DEFAULT current_timestamp(),
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

        // Ensure uploaded_videos has folder_id column (Migration for older tables)
        $checkCol = $conn->query("SHOW COLUMNS FROM `uploaded_videos` LIKE 'folder_id'");
        if ($checkCol && $checkCol->num_rows == 0) {
            // Silently try to add column to avoid crash if another request beat us to it
            @$conn->query("ALTER TABLE `uploaded_videos` ADD COLUMN `folder_id` VARCHAR(64) DEFAULT NULL AFTER `folder`;");
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // -------------------------------------------------------------------------
    // GET: List all folders for a user / course with video count
    // -------------------------------------------------------------------------
    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? $_GET['userId'] ?? $_SERVER['HTTP_X_USER_ID'] ?? '';
        $courseId = $_GET['course_id'] ?? $_GET['courseId'] ?? '';

        $folders = [];
        $usedDb = false;

        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $query = "SELECT f.*, 
                          (SELECT COUNT(*) FROM `uploaded_videos` uv 
                           WHERE (uv.folder = f.name OR uv.folder_id = f.id) 
                           AND (uv.user_id = f.user_id OR uv.user_id IS NULL OR uv.user_id = '')) as video_count
                          FROM `video_folders` f WHERE 1=1";
                $params = [];
                $types = "";

                if (!empty($userId)) {
                    $query .= " AND (f.user_id = ? OR f.user_id = 'global' OR f.user_id = 'admin')";
                    $params[] = $userId;
                    $types .= "s";
                }
                if (!empty($courseId)) {
                    $query .= " AND (f.course_id = ? OR f.course_id IS NULL OR f.course_id = '')";
                    $params[] = $courseId;
                    $types .= "s";
                }

                $query .= " ORDER BY f.name ASC";
                $stmt = $conn->prepare($query);
                if ($stmt) {
                    if (!empty($params)) {
                        $stmt->bind_param($types, ...$params);
                    }
                    $stmt->execute();
                    $res = $stmt->get_result();
                    $folders = $res->fetch_all(MYSQLI_ASSOC);
                    $stmt->close();
                    $usedDb = true;
                }
            } catch (Exception $e) {
                $usedDb = false;
            }
        }

        if (!$usedDb) {
            $all = getFolderJsonStore($jsonStoreFile);
            $folders = array_filter($all, function($f) use ($userId, $courseId) {
                if (!empty($userId) && !empty($f['user_id']) && strcasecmp($f['user_id'], $userId) !== 0 && $f['user_id'] !== 'global') {
                    return false;
                }
                return true;
            });
            $folders = array_values($folders);
        }

        $formatted = array_map(function($f) {
            return [
                'id' => $f['id'],
                'userId' => $f['user_id'] ?? 'instructor_user',
                'courseId' => $f['course_id'] ?? null,
                'name' => $f['name'],
                'color' => $f['color'] ?? 'indigo',
                'videoCount' => intval($f['video_count'] ?? 0),
                'createdAt' => $f['created_at'] ?? date('Y-m-d H:i:s'),
                'updatedAt' => $f['updated_at'] ?? date('Y-m-d H:i:s')
            ];
        }, $folders);

        echo json_encode([
            'success' => true,
            'count' => count($formatted),
            'folders' => $formatted
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST: Create folder, rename folder, or move video
    // -------------------------------------------------------------------------
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? $_POST;

        $action = $data['action'] ?? 'create';

        // 1. Move video to folder
        if ($action === 'move_video') {
            $videoId = $data['videoId'] ?? $data['video_id'] ?? '';
            $targetFolder = $data['folder'] ?? $data['targetFolder'] ?? '';
            $targetFolderId = $data['folderId'] ?? $data['targetFolderId'] ?? null;
            $userId = $data['userId'] ?? $data['user_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? '';

            if (empty($videoId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing videoId.']);
                exit;
            }

            if (isset($conn) && $conn instanceof mysqli) {
                try {
                    $stmt = $conn->prepare("UPDATE `uploaded_videos` SET `folder` = ?, `folder_id` = ? WHERE `upload_id` = ? OR `id` = ?");
                    if ($stmt) {
                        $stmt->bind_param("ssss", $targetFolder, $targetFolderId, $videoId, $videoId);
                        $stmt->execute();
                        $stmt->close();
                    }
                } catch (Exception $e) {}
            }

            // Also update JSON fallback store if present
            $jsonUserVideosFile = __DIR__ . '/../../uploads/user_videos.json';
            if (file_exists($jsonUserVideosFile)) {
                $vStore = json_decode(file_get_contents($jsonUserVideosFile), true);
                if (is_array($vStore)) {
                    foreach ($vStore as &$v) {
                        if (($v['id'] ?? '') === $videoId || ($v['upload_id'] ?? '') === $videoId) {
                            $v['folder'] = $targetFolder;
                            $v['folder_id'] = $targetFolderId;
                            break;
                        }
                    }
                    @file_put_contents($jsonUserVideosFile, json_encode($vStore, JSON_PRETTY_PRINT));
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Video moved successfully.',
                'videoId' => $videoId,
                'folder' => $targetFolder,
                'folderId' => $targetFolderId
            ]);
            exit;
        }

        // 2. Rename folder
        if ($action === 'rename') {
            $folderId = $data['id'] ?? $data['folderId'] ?? '';
            $newName = trim($data['name'] ?? $data['newName'] ?? '');

            if (empty($folderId) || empty($newName)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Folder ID and new name are required.']);
                exit;
            }

            if (isset($conn) && $conn instanceof mysqli) {
                try {
                    // Update folder
                    $stmt = $conn->prepare("UPDATE `video_folders` SET `name` = ? WHERE `id` = ?");
                    if ($stmt) {
                        $stmt->bind_param("ss", $newName, $folderId);
                        $stmt->execute();
                        $stmt->close();
                    }
                    // Update videos belonging to this folder_id
                    $stmt2 = $conn->prepare("UPDATE `uploaded_videos` SET `folder` = ? WHERE `folder_id` = ?");
                    if ($stmt2) {
                        $stmt2->bind_param("ss", $newName, $folderId);
                        $stmt2->execute();
                        $stmt2->close();
                    }
                } catch (Exception $e) {}
            }

            // Update JSON fallback
            $all = getFolderJsonStore($jsonStoreFile);
            foreach ($all as &$f) {
                if ($f['id'] === $folderId) {
                    $f['name'] = $newName;
                    $f['updated_at'] = date('Y-m-d H:i:s');
                    break;
                }
            }
            saveFolderJsonStore($jsonStoreFile, $all);

            echo json_encode([
                'success' => true,
                'message' => 'Folder renamed successfully.',
                'folder' => ['id' => $folderId, 'name' => $newName]
            ]);
            exit;
        }

        // 3. Create folder
        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Folder name is required.']);
            exit;
        }

        $userId = $data['userId'] ?? $data['user_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 'instructor_user';
        $courseId = $data['courseId'] ?? $data['course_id'] ?? null;
        $color = $data['color'] ?? 'indigo';
        $id = $data['id'] ?? ('vfolder_' . time() . '_' . bin2hex(random_bytes(3)));
        $now = date('Y-m-d H:i:s');

        $record = [
            'id' => $id,
            'user_id' => $userId,
            'course_id' => $courseId,
            'name' => $name,
            'color' => $color,
            'created_at' => $now,
            'updated_at' => $now
        ];

        $savedDb = false;
        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $stmt = $conn->prepare("INSERT INTO `video_folders` (`id`, `user_id`, `course_id`, `name`, `color`, `created_at`) VALUES (?, ?, ?, ?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("ssssss", $id, $userId, $courseId, $name, $color, $now);
                    $stmt->execute();
                    $stmt->close();
                    $savedDb = true;
                }
            } catch (Exception $e) {
                $savedDb = false;
            }
        }

        if (!$savedDb) {
            $all = getFolderJsonStore($jsonStoreFile);
            $all[] = $record;
            saveFolderJsonStore($jsonStoreFile, $all);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Folder created successfully.',
            'folder' => [
                'id' => $id,
                'userId' => $userId,
                'courseId' => $courseId,
                'name' => $name,
                'color' => $color,
                'videoCount' => 0,
                'createdAt' => $now,
                'updatedAt' => $now
            ]
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // DELETE: Delete folder
    // -------------------------------------------------------------------------
    if ($method === 'DELETE') {
        $folderId = $_GET['id'] ?? $_GET['folderId'] ?? '';
        if (empty($folderId)) {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];
            $folderId = $data['id'] ?? $data['folderId'] ?? '';
        }

        if (empty($folderId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Folder ID is required for deletion.']);
            exit;
        }

        if (isset($conn) && $conn instanceof mysqli) {
            try {
                // Reset videos that were in this folder
                $stmt = $conn->prepare("UPDATE `uploaded_videos` SET `folder` = 'film-edit-studio', `folder_id` = NULL WHERE `folder_id` = ?");
                if ($stmt) {
                    $stmt->bind_param("s", $folderId);
                    $stmt->execute();
                    $stmt->close();
                }

                // Delete folder
                $stmt2 = $conn->prepare("DELETE FROM `video_folders` WHERE `id` = ?");
                if ($stmt2) {
                    $stmt2->bind_param("s", $folderId);
                    $stmt2->execute();
                    $stmt2->close();
                }
            } catch (Exception $e) {}
        }

        // Delete from JSON
        $all = getFolderJsonStore($jsonStoreFile);
        $filtered = array_filter($all, function($f) use ($folderId) {
            return ($f['id'] ?? '') !== $folderId;
        });
        saveFolderJsonStore($jsonStoreFile, $filtered);

        echo json_encode([
            'success' => true,
            'message' => 'Folder deleted successfully. Linked videos moved to root.'
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
