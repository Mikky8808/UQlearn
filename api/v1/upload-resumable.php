<?php
require_once __DIR__ . '/cors.php';
/**
 * Resumable Chunked File Upload API for UQlearn (YouTube-style Protocol)
 * Compatible with PHP 7.4+ on Shared Hosting
 *
 * Supports:
 * - Content-Range: bytes {start}-{end}/{total}
 * - 308 Resume Incomplete status header with Range: bytes=0-{last_byte}
 * - GET status check for network recovery
 * - Atomic file assembly upon completion
 */

error_reporting(0);
ini_set('display_errors', '0');

// @ini_set('upload_max_filesize', '500M');
// @ini_set('post_max_size', '500M');
// @ini_set('max_execution_time', '600');
// @ini_set('memory_limit', '512M');

// IMPORTANT: Shared hosting limits like post_max_size and upload_max_filesize cannot be overridden 
// via ini_set at runtime. You must set them in .htaccess or .user.ini.

// Security Check: Verify user identity (Stub)
function enforceAuthentication() {
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? '';
    if (empty($userId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
}

// Garbage Collection for Orphan Parts (older than 24 hours)
function cleanupOrphanParts($tempDir) {
    if (rand(1, 100) > 5) return; // 5% chance to run GC
    $now = time();
    foreach (glob($tempDir . '*.part') as $f) {
        if ($now - filemtime($f) > 86400) @unlink($f);
    }
    foreach (glob($tempDir . '*.json') as $f) {
        if ($now - filemtime($f) > 86400) @unlink($f);
    }
}

// 1. CORS Headers


$baseUploadDir = "../../uploads/";
$tempUploadDir = "../../uploads/temp/";

if (!file_exists($baseUploadDir)) {
    @mkdir($baseUploadDir, 0755, true);
}
if (!file_exists($tempUploadDir)) {
    @mkdir($tempUploadDir, 0755, true);
}

cleanupOrphanParts($tempUploadDir);

// Helper: Sanitize folder name
function sanitizeFolderName($folder) {
    if (empty($folder)) return 'videos';
    return preg_replace('/[^a-zA-Z0-9_-]/', '', $folder);
}

// Human-readable size formatting function
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

// ----------------------------------------------------------------------
// ACTION 1: GET - Inquiry status of ongoing upload (Resume recovery)
// ----------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header("Content-Type: application/json; charset=UTF-8");
    $uploadId = $_GET['upload_id'] ?? $_SERVER['HTTP_X_UPLOAD_ID'] ?? '';

    if (empty($uploadId)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing upload_id parameter."]);
        exit();
    }

    $uploadIdClean = preg_replace('/[^a-zA-Z0-9_-]/', '', $uploadId);
    $partFilePath = $tempUploadDir . $uploadIdClean . ".part";
    $metaFilePath = $tempUploadDir . $uploadIdClean . ".json";

    if (!file_exists($partFilePath)) {
        // Return 200 instead of 404 to prevent red console errors in the browser.
        // It just means the upload hasn't started yet, so start at byte 0.
        http_response_code(200);
        echo json_encode(["success" => true, "status" => "not_started", "bytes_uploaded" => 0]);
        exit();
    }

    $uploadedBytes = filesize($partFilePath);
    $totalBytes = 0;
    if (file_exists($metaFilePath)) {
        $meta = json_decode(file_get_contents($metaFilePath), true);
        if ($meta && isset($meta['total_bytes'])) {
            $totalBytes = (int)$meta['total_bytes'];
        }
    }

    if ($totalBytes > 0 && $uploadedBytes >= $totalBytes) {
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "status" => "completed",
            "bytes_uploaded" => $uploadedBytes,
            "total_bytes" => $totalBytes
        ]);
        exit();
    }

    // 308 Resume Incomplete
    http_response_code(308);
    $lastByte = max(0, $uploadedBytes - 1);
    header("Range: bytes=0-" . $lastByte);
    echo json_encode([
        "success" => true,
        "status" => "incomplete",
        "bytes_uploaded" => $uploadedBytes,
        "total_bytes" => $totalBytes,
        "range" => "bytes=0-" . $lastByte
    ]);
    exit();
}

// ----------------------------------------------------------------------
// ACTION 2: POST / PUT - Receive Chunk
// ----------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    enforceAuthentication();
    header("Content-Type: application/json; charset=UTF-8");

    // Read upload metadata from headers or query/post params
    $uploadId = $_SERVER['HTTP_X_UPLOAD_ID'] ?? $_POST['upload_id'] ?? $_GET['upload_id'] ?? '';
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? $_POST['user_id'] ?? $_GET['user_id'] ?? 'anonymous';
    $userEmail = $_SERVER['HTTP_X_USER_EMAIL'] ?? $_POST['user_email'] ?? $_GET['user_email'] ?? '';
    $fileName = $_SERVER['HTTP_X_FILE_NAME'] ?? $_POST['file_name'] ?? $_GET['file_name'] ?? 'video_' . time() . '.mp4';
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $allowedExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
    if (!in_array($extension, $allowedExts, true)) {
        http_response_code(415);
        echo json_encode(["success" => false, "error" => "File type not allowed."]);
        exit();
    }
    $folder = sanitizeFolderName($_SERVER['HTTP_X_FOLDER'] ?? $_POST['folder'] ?? $_GET['folder'] ?? 'videos');
    $contentRange = $_SERVER['HTTP_CONTENT_RANGE'] ?? $_SERVER['CONTENT_RANGE'] ?? '';

    // If uploadId is not provided, generate a unique session ID
    if (empty($uploadId)) {
        $uploadId = 'up_' . time() . '_' . bin2hex(random_bytes(8));
    }

    $uploadIdClean = preg_replace('/[^a-zA-Z0-9_-]/', '', $uploadId);
    $partFilePath = $tempUploadDir . $uploadIdClean . ".part";
    $metaFilePath = $tempUploadDir . $uploadIdClean . ".json";

    // Parse Content-Range header: e.g. "bytes 0-524287/10485760"
    $rangeStart = 0;
    $rangeEnd = 0;
    $totalBytes = 0;

    if (!empty($contentRange) && preg_match('/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i', $contentRange, $matches)) {
        $rangeStart = (int)$matches[1];
        $rangeEnd = (int)$matches[2];
        if ($matches[3] !== '*') {
            $totalBytes = (int)$matches[3];
        }
    } else {
        // Fallback if missing Content-Range
        $rangeStart = isset($_POST['range_start']) ? (int)$_POST['range_start'] : 0;
        $totalBytes = isset($_POST['total_bytes']) ? (int)$_POST['total_bytes'] : 0;
    }

    // Max File Size Cap (2GB)
    $MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
    if ($totalBytes > $MAX_UPLOAD_BYTES) {
        http_response_code(413);
        echo json_encode(["success" => false, "error" => "File too large. Max 2GB allowed."]);
        exit();
    }

    // Save metadata if provided
    if ($totalBytes > 0 || !file_exists($metaFilePath)) {
        $metaData = [
            "upload_id" => $uploadIdClean,
            "file_name" => $fileName,
            "folder" => $folder,
            "total_bytes" => $totalBytes,
            "created_at" => time()
        ];
        file_put_contents($metaFilePath, json_encode($metaData));
    } else if (file_exists($metaFilePath)) {
        $meta = json_decode(file_get_contents($metaFilePath), true);
        if ($meta && isset($meta['total_bytes'])) {
            $totalBytes = (int)$meta['total_bytes'];
        }
    }

    // Read input binary data or uploaded chunk file
    $chunkData = '';
    if (isset($_FILES['chunk']) && $_FILES['chunk']['error'] === UPLOAD_ERR_OK) {
        $chunkData = file_get_contents($_FILES['chunk']['tmp_name']);
    } else {
        // Read raw php://input stream
        $chunkData = file_get_contents('php://input');
    }

    $chunkSize = strlen($chunkData);

    if ($chunkSize === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No binary chunk data received in request."]);
        exit();
    }

    // Open file in append mode or seek to position
    $fileHandle = fopen($partFilePath, 'c+b');
    if (!$fileHandle) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to write temporary upload file."]);
        exit();
    }

    // Seek to rangeStart to write byte range safely
    flock($fileHandle, LOCK_EX); // Prevent concurrent chunk corruption
    fseek($fileHandle, $rangeStart, SEEK_SET);
    fwrite($fileHandle, $chunkData);
    fflush($fileHandle);
    flock($fileHandle, LOCK_UN);
    fclose($fileHandle);

    clearstatcache();
    $currentBytesStored = filesize($partFilePath);

    // Check if upload is complete
    if ($totalBytes > 0 && $currentBytesStored >= $totalBytes) {
        $lockFile = $tempUploadDir . $uploadIdClean . ".lock";
        $lock = fopen($lockFile, 'c');
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            // Another process is finalizing
            http_response_code(308);
            echo json_encode(["success" => true, "status" => "incomplete", "bytes_uploaded" => $currentBytesStored, "total_bytes" => $totalBytes]);
            exit();
        }
        // Final destination directory
        $targetFolderDir = $baseUploadDir . $folder . "/";
        if (!file_exists($targetFolderDir)) {
            @mkdir($targetFolderDir, 0755, true);
        }

        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        if (empty($extension)) $extension = 'mp4';

        $cleanRandomName = time() . '_' . bin2hex(random_bytes(12)) . '.' . strtolower($extension);
        $finalPath = $targetFolderDir . $cleanRandomName;

        // Move assembled temporary file to destination
        rename($partFilePath, $finalPath);
        @unlink($metaFilePath);

        // Generate final accessible URL
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];
        $allowedHosts = ['uqlearn.org', 'www.uqlearn.org', 'localhost'];
        if (!in_array($host, $allowedHosts, true)) {
            $host = 'uqlearn.org';
        }
        // Assume upload path relative to domain root
        $publicUrl = $protocol . $host . "/uploads/" . $folder . "/" . $cleanRandomName;
        $finalRelPath = "/uploads/" . $folder . "/" . $cleanRandomName;

        // SERVER-SIDE REMUXING FOR MKV FILES
        if (strtolower($extension) === 'mkv') {
            $mp4CleanName = pathinfo($cleanRandomName, PATHINFO_FILENAME) . '.mp4';
            $mp4Path = $targetFolderDir . $mp4CleanName;
            $mp4Url = $protocol . $host . "/uploads/" . $folder . "/" . $mp4CleanName;
            $mp4RelPath = "/uploads/" . $folder . "/" . $mp4CleanName;

            // Run ffmpeg -i input.mkv -c copy output.mp4
            @exec("ffmpeg -y -i " . escapeshellarg($finalPath) . " -c copy " . escapeshellarg($mp4Path) . " > /dev/null 2>&1");

            if (file_exists($mp4Path) && filesize($mp4Path) > 0) {
                $publicUrl = $mp4Url;
                $finalRelPath = $mp4RelPath;
            }
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "status" => "completed",
            "message" => "File upload completed and assembled successfully.",
            "id" => $uploadIdClean,
            "url" => $publicUrl,
            "file_path" => $finalRelPath,
            "user_id" => $userId,
            "user_email" => $userEmail,
            "bytes_uploaded" => $currentBytesStored,
            "total_bytes" => $totalBytes,
            "file_size" => $currentBytesStored,
            "formatted_size" => formatSize($currentBytesStored),
            "fileSize" => formatSize($currentBytesStored)
        ]);
        exit();
    }

    // Otherwise, upload is incomplete: Return 308 Resume Incomplete
    $lastByteStored = max(0, $currentBytesStored - 1);
    http_response_code(308);
    header("Range: bytes=0-" . $lastByteStored);
    header("X-Upload-Id: " . $uploadIdClean);

    echo json_encode([
        "success" => true,
        "status" => "incomplete",
        "upload_id" => $uploadIdClean,
        "bytes_uploaded" => $currentBytesStored,
        "total_bytes" => $totalBytes,
        "range" => "bytes=0-" . $lastByteStored,
        "next_offset" => $currentBytesStored
    ]);
    exit();
}
