<?php
require_once __DIR__ . '/cors.php';
/**
 * User Videos Management API for UQlearn
 * Stores and retrieves records of chunked and media uploads per user.
 * Compatible with PHP 7.4+ on Shared Hosting
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");


require_once __DIR__ . '/db.php';

$jsonStoreFile = __DIR__ . '/../../uploads/user_videos.json';

// Helper to load fallback JSON store
function getJsonStore($filePath) {
    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
        if (is_array($data)) return $data;
    }
    return [];
}

// Helper to save fallback JSON store
function saveJsonStore($filePath, $data) {
    $dir = dirname($filePath);
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents($filePath, json_encode(array_values($data), JSON_PRETTY_PRINT));
}

// Ensure database table exists
if (isset($conn) && $conn instanceof mysqli) {
    try {
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

        // Migration for older tables missing folder_id
        $checkCol = $conn->query("SHOW COLUMNS FROM `uploaded_videos` LIKE 'folder_id'");
        if ($checkCol && $checkCol->num_rows == 0) {
            @$conn->query("ALTER TABLE `uploaded_videos` ADD COLUMN `folder_id` VARCHAR(64) DEFAULT NULL AFTER `folder`;");
        }
    } catch (Exception $e) {}
}


// Security Check: Verify user identity (Stub)
// In production, validate JWT or Session cookie here to ensure HTTP_X_USER_ID is authentic
function enforceAuthentication() {
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? $_POST['user_id'] ?? $_GET['userId'] ?? $_POST['userId'] ?? '';
    return !empty($userId) ? $userId : 'instructor_user';
}

// Human-readable size formatting function matching shared host specification
function formatSize($bytes) {
    $bytes = floatval($bytes);
    if ($bytes >= 1073741824) {
        return round($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return round($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return round($bytes / 1024, 2) . ' KB';
    } else {
        return round($bytes) . ' bytes';
    }
}

// Robust video file size resolver: checks local server paths first with basename, then remote URL headers
function resolveServerVideoFileSize($videoPathOrUrl) {
    if (empty($videoPathOrUrl)) return 0;
    
    // 1. Direct path check on server filesystem
    $candidates = [];
    $parsedPath = parse_url($videoPathOrUrl, PHP_URL_PATH);
    if (!empty($parsedPath)) {
        $candidates[] = __DIR__ . '/../../' . ltrim($parsedPath, '/');
        $candidates[] = __DIR__ . '/../..' . $parsedPath;
    }
    $cleanBaseName = basename($parsedPath ?: $videoPathOrUrl);
    if (!empty($cleanBaseName)) {
        $candidates[] = __DIR__ . '/../../uploads/videos/' . $cleanBaseName;
        $candidates[] = __DIR__ . '/../../uploads/film-edit-studio/' . $cleanBaseName;
        $candidates[] = __DIR__ . '/../../uploads/courses/' . $cleanBaseName;
        $candidates[] = __DIR__ . '/../../uploads/' . $cleanBaseName;
        $candidates[] = __DIR__ . '/../../' . $cleanBaseName;
        $candidates[] = 'videos/' . $cleanBaseName;
    }
    
    foreach ($candidates as $filePath) {
        if (!empty($filePath) && file_exists($filePath) && is_file($filePath)) {
            $fs = @filesize($filePath);
            if ($fs && $fs > 0) {
                return $fs;
            }
            // 32-bit PHP or large file (>2GB) fallback via stat
            if (function_exists('shell_exec')) {
                $stat = @shell_exec('stat -c %s ' . escapeshellarg($filePath));
                if ($stat && intval(trim($stat)) > 0) {
                    return intval(trim($stat));
                }
            }
        }
    }
    
    // 2. Remote URL fallback via curl or get_headers
    if (filter_var($videoPathOrUrl, FILTER_VALIDATE_URL)) {
        if (function_exists('curl_init')) {
            $ch = curl_init($videoPathOrUrl);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_exec($ch);
            $curlSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
            curl_close($ch);
            if ($curlSize && $curlSize > 0) {
                return intval($curlSize);
            }
        }
        $headers = @get_headers($videoPathOrUrl, 1);
        if ($headers && isset($headers['Content-Length'])) {
            $cl = is_array($headers['Content-Length']) ? end($headers['Content-Length']) : $headers['Content-Length'];
            if (intval($cl) > 0) {
                return intval($cl);
            }
        }
    }
    
    return 0;
}

// Probe size action for checking exact video size on server
if (($_GET['action'] ?? '') === 'probe_size' || ($_POST['action'] ?? '') === 'probe_size') {
    $url = $_GET['url'] ?? $_POST['url'] ?? '';
    if (empty($url)) {
        echo json_encode(['success' => false, 'error' => 'Missing url parameter']);
        exit();
    }
    $size = resolveServerVideoFileSize($url);
    echo json_encode([
        'success' => true,
        'file_size' => $size,
        'size' => $size,
        'formatted_size' => $size > 0 ? formatSize($size) : null,
        'fileSize' => $size > 0 ? formatSize($size) : null
    ]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['user_id'] ?? $_GET['userId'] ?? $_SERVER['HTTP_X_USER_ID'] ?? '';
    $folder = $_GET['folder'] ?? '';
    $limit = intval($_GET['limit'] ?? 100);
    if ($limit <= 0) $limit = 100;
    if ($limit > 500) $limit = 500;

    $videos = [];

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $query = "SELECT * FROM `uploaded_videos` WHERE 1=1";
            $params = [];
            $types = "";
            if (!empty($userId)) {
                $query .= " AND (`user_id` = ? OR `user_id` = 'instructor_user' OR `user_id` = 'anonymous')";
                $params[] = $userId;
                $types .= "s";
            }
            if (!empty($folder)) {
                $query .= " AND `folder` = ?";
                $params[] = $folder;
                $types .= "s";
            }
            $query .= " ORDER BY `created_at` DESC LIMIT ?";
            $params[] = $limit;
            $types .= "i";
            
            $stmt = $conn->prepare($query);
            if ($stmt) {
                if (!empty($params)) {
                    $stmt->bind_param($types, ...$params);
                }
                $stmt->execute();
                $result = $stmt->get_result();
                $videos = $result->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
            }
        } catch (Exception $e) {}
    }

    // Merge with JSON store to ensure absolute persistence
    $jsonVideos = getJsonStore($jsonStoreFile);
    $mergedMap = [];
    foreach ($videos as $v) {
        $vidKey = $v['upload_id'] ?? $v['id'] ?? '';
        if ($vidKey) $mergedMap[$vidKey] = $v;
    }
    foreach ($jsonVideos as $v) {
        $vidKey = $v['id'] ?? $v['upload_id'] ?? '';
        if ($vidKey && !isset($mergedMap[$vidKey])) {
            if (empty($folder) || strcasecmp($v['folder'] ?? '', $folder) === 0) {
                $mergedMap[$vidKey] = [
                    'upload_id' => $v['id'] ?? '',
                    'user_id' => $v['user_id'] ?? 'instructor_user',
                    'user_email' => $v['user_email'] ?? '',
                    'file_name' => $v['filename'] ?? 'video.mp4',
                    'file_path' => $v['file_path'] ?? $v['url'] ?? '',
                    'file_url' => $v['url'] ?? '',
                    'file_size' => $v['file_size'] ?? 0,
                    'folder' => $v['folder'] ?? 'film-edit-studio',
                    'folder_id' => $v['folder_id'] ?? null,
                    'source' => $v['source'] ?? 'film_and_edit',
                    'created_at' => $v['created_at'] ?? date('Y-m-d H:i:s')
                ];
            }
        }
    }

    $allVideos = array_values($mergedMap);
    usort($allVideos, function($a, $b) {
        return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
    });
    $videos = array_slice($allVideos, 0, $limit);

    // Format output with real disk file size resolution
    $formatted = array_map(function($v) {
        $size = intval($v['file_size'] ?? 0);
        if ($size <= 0) {
            $size = resolveServerVideoFileSize($v['file_url'] ?? $v['file_path'] ?? '');
        }

        $formattedStr = $size > 0 ? formatSize($size) : null;

        return [
            'id' => $v['upload_id'] ?? $v['id'] ?? ('vid_' . uniqid()),
            'user_id' => $v['user_id'] ?? 'anonymous',
            'user_email' => $v['user_email'] ?? '',
            'uploadedBy' => $v['user_email'] ?: ($v['user_id'] ?? 'anonymous'),
            'filename' => $v['file_name'] ?? 'video.mp4',
            'name' => $v['file_name'] ?? 'video.mp4',
            'url' => $v['file_url'] ?? '',
            'file_path' => $v['file_path'] ?? ($v['file_url'] ?? ''),
            'folder' => $v['folder'] ?? 'videos',
            'folder_id' => $v['folder_id'] ?? null,
            'source' => $v['source'] ?? 'film_and_edit',
            'file_size' => $size,
            'fileSize' => $formattedStr,
            'formatted_size' => $formattedStr,
            'title' => $v['title'] ?? ($v['file_name'] ?? 'Untitled Video'),
            'created_at' => $v['created_at'] ?? date('Y-m-d H:i:s')
        ];
    }, $videos);

    echo json_encode([
        'success' => true,
        'count' => count($formatted),
        'videos' => $formatted
    ]);
    exit();
}

if ($method === 'POST') {
    enforceAuthentication();
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    // Support quick move action
    if (($input['action'] ?? '') === 'move') {
        $videoId = $input['videoId'] ?? $input['id'] ?? '';
        $targetFolder = $input['folder'] ?? 'film-edit-studio';
        $targetFolderId = $input['folder_id'] ?? $input['folderId'] ?? null;

        if (empty($videoId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing video ID.']);
            exit();
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

        $store = getJsonStore($jsonStoreFile);
        foreach ($store as &$item) {
            if (($item['id'] ?? '') === $videoId) {
                $item['folder'] = $targetFolder;
                $item['folder_id'] = $targetFolderId;
                break;
            }
        }
        saveJsonStore($jsonStoreFile, $store);

        echo json_encode([
            'success' => true,
            'message' => 'Video moved successfully.',
            'videoId' => $videoId,
            'folder' => $targetFolder,
            'folder_id' => $targetFolderId
        ]);
        exit();
    }

    // Support delete action via POST (vital for shared hosting compatibility where DELETE method is restricted)
    if (($input['action'] ?? '') === 'delete') {
        $videoId = $input['id'] ?? $input['upload_id'] ?? $input['videoId'] ?? $_GET['id'] ?? '';
        $videoUrl = $input['url'] ?? $input['file_url'] ?? $input['file_path'] ?? $_GET['url'] ?? '';

        if (empty($videoId) && empty($videoUrl)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing video identifier.']);
            exit();
        }

        if (isset($conn) && $conn instanceof mysqli) {
            try {
                if (!empty($videoId) && !empty($videoUrl)) {
                    $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE `upload_id` = ? OR `id` = ? OR `file_url` = ? OR `file_path` = ?");
                    if ($stmt) {
                        $stmt->bind_param("ssss", $videoId, $videoId, $videoUrl, $videoUrl);
                        $stmt->execute();
                        $stmt->close();
                    }
                } else if (!empty($videoId)) {
                    $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE `upload_id` = ? OR `id` = ?");
                    if ($stmt) {
                        $stmt->bind_param("ss", $videoId, $videoId);
                        $stmt->execute();
                        $stmt->close();
                    }
                } else {
                    $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE `file_url` = ? OR `file_path` = ?");
                    if ($stmt) {
                        $stmt->bind_param("ss", $videoUrl, $videoUrl);
                        $stmt->execute();
                        $stmt->close();
                    }
                }
            } catch (Exception $e) {}
        }

        $store = getJsonStore($jsonStoreFile);
        $filtered = array_filter($store, function($v) use ($videoId, $videoUrl) {
            $matchesId = !empty($videoId) && (($v['id'] ?? '') === $videoId || ($v['upload_id'] ?? '') === $videoId);
            $matchesUrl = !empty($videoUrl) && (($v['url'] ?? '') === $videoUrl || ($v['file_url'] ?? '') === $videoUrl || ($v['file_path'] ?? '') === $videoUrl);
            return !$matchesId && !$matchesUrl;
        });
        saveJsonStore($jsonStoreFile, $filtered);

        echo json_encode(['success' => true, 'message' => 'Video record deleted successfully.']);
        exit();
    }

    $userId = $input['user_id'] ?? $input['userId'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 'instructor_user';
    $userEmail = $input['user_email'] ?? $input['userEmail'] ?? '';
    $filename = $input['filename'] ?? $input['name'] ?? ('video_' . time() . '.mp4');
    $url = $input['url'] ?? $input['file_path'] ?? '';
    $filePath = $input['file_path'] ?? $url;
    $folder = $input['folder'] ?? 'film-edit-studio';
    $folderId = $input['folder_id'] ?? $input['folderId'] ?? null;
    $source = $input['source'] ?? 'film_and_edit';
    $title = $input['title'] ?? $filename;
    $fileSize = intval($input['file_size'] ?? $input['size'] ?? 0);
    if ($fileSize <= 0) {
        $fileSize = resolveServerVideoFileSize($url ?: $filePath);
    }
    $id = $input['id'] ?? ('vid_' . time() . '_' . bin2hex(random_bytes(4)));
    $createdAt = date('Y-m-d H:i:s');

    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing video URL or file_path parameter.']);
        exit();
    }

    $record = [
        'id' => $id,
        'user_id' => $userId,
        'user_email' => $userEmail,
        'filename' => $filename,
        'url' => $url,
        'file_path' => $filePath,
        'folder' => $folder,
        'folder_id' => $folderId,
        'source' => $source,
        'file_size' => $fileSize,
        'title' => $title,
        'created_at' => $createdAt
    ];

    $savedDb = false;
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $stmt = $conn->prepare("INSERT INTO `uploaded_videos` (`upload_id`, `user_id`, `user_email`, `file_name`, `file_url`, `file_path`, `folder`, `folder_id`, `source`, `file_size`, `created_at`)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sssssssssis", $id, $userId, $userEmail, $filename, $url, $filePath, $folder, $folderId, $source, $fileSize, $createdAt);
                $stmt->execute();
                $stmt->close();
                $savedDb = true;
            }
        } catch (Exception $e) {
            // Fallback without folder_id if column not present yet
            try {
                $stmt = $conn->prepare("INSERT INTO `uploaded_videos` (`upload_id`, `user_id`, `user_email`, `file_name`, `file_url`, `file_path`, `folder`, `source`, `file_size`, `created_at`)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                if ($stmt) {
                    $stmt->bind_param("ssssssssis", $id, $userId, $userEmail, $filename, $url, $filePath, $folder, $source, $fileSize, $createdAt);
                    $stmt->execute();
                    $stmt->close();
                    $savedDb = true;
                }
            } catch (Exception $e2) {
                $savedDb = false;
            }
        }
    }

    // Always save to JSON store as well to guarantee robust persistence across page refreshes
    $store = getJsonStore($jsonStoreFile);
    $store = array_filter($store, function($item) use ($id) {
        return ($item['id'] ?? '') !== $id;
    });
    $store[] = $record;
    saveJsonStore($jsonStoreFile, $store);

    echo json_encode([
        'success' => true,
        'message' => 'Video record saved successfully.',
        'video' => $record
    ]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? $_POST['id'] ?? '';
    $url = $_GET['url'] ?? $_POST['url'] ?? '';
    if (empty($id) && empty($url)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing video ID or URL.']);
        exit();
    }

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            if (!empty($id) && !empty($url)) {
                $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE (`upload_id` = ? OR `id` = ? OR `file_url` = ? OR `file_path` = ?)");
                if ($stmt) {
                    $stmt->bind_param("ssss", $id, $id, $url, $url);
                    $stmt->execute();
                    $stmt->close();
                }
            } else if (!empty($id)) {
                $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE (`upload_id` = ? OR `id` = ?)");
                if ($stmt) {
                    $stmt->bind_param("ss", $id, $id);
                    $stmt->execute();
                    $stmt->close();
                }
            } else {
                $stmt = $conn->prepare("DELETE FROM `uploaded_videos` WHERE (`file_url` = ? OR `file_path` = ?)");
                if ($stmt) {
                    $stmt->bind_param("ss", $url, $url);
                    $stmt->execute();
                    $stmt->close();
                }
            }
        } catch (Exception $e) {}
    }

    $store = getJsonStore($jsonStoreFile);
    $filtered = array_filter($store, function($v) use ($id, $url) {
        $matchesId = !empty($id) && (($v['id'] ?? '') === $id || ($v['upload_id'] ?? '') === $id);
        $matchesUrl = !empty($url) && (($v['url'] ?? '') === $url || ($v['file_url'] ?? '') === $url || ($v['file_path'] ?? '') === $url);
        return !$matchesId && !$matchesUrl;
    });
    saveJsonStore($jsonStoreFile, $filtered);

    echo json_encode(['success' => true, 'message' => 'Video record deleted successfully.']);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
