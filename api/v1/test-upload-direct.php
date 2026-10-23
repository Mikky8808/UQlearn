<?php
require_once __DIR__ . '/cors.php';
/**
 * Secure Media & Document Uploader for Shared Hosting
 * Handles large uploads (up to 256MB) with comprehensive error handling
 * 
 * Endpoint: /api/v1/media-upload.php
 * Expects: POST multipart/form-data
 * Fields: 
 *   - fileData: The file blob
 *   - folder: Destination folder ('assets', 'videos', 'resources', 'lessons', 'courses', 'avatars', 'compliance')
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

// Increase PHP limits for large multipart uploads
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('max_execution_time', '300');
@ini_set('max_input_time', '300');
@ini_set('memory_limit', '512M');

// 1. CORS Headers - Allow requests
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function for JSON responses
function sendJsonResponse($code, $success, $message, $data = []) {
    http_response_code($code);
    echo json_encode(array_merge(
        ['success' => $success, 'error' => $message],
        $data
    ));
    exit;
}

// 2. Validate Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(405, false, "Invalid request method. POST required.");
}

// 3. Check for Content-Length vs POST data mismatch (exceeds post_max_size)
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if (empty($_POST) && empty($_FILES) && $contentLength > 0) {
    $postMaxSize = ini_get('post_max_size');
    sendJsonResponse(413, false, 
        "The uploaded file exceeds the server's post_max_size limit ({$postMaxSize}). " .
        "Please upload a smaller file or increase post_max_size in cPanel.",
        ['content_length' => $contentLength, 'post_max_size' => $postMaxSize]
    );
}

// 4. Configuration & Paths
$baseUploadDir = "../../uploads/";
if (!is_dir($baseUploadDir)) {
    $baseUploadDir = "../../upload/"; // Fallback
}
if (!is_dir($baseUploadDir)) {
    if (!mkdir($baseUploadDir, 0755, true)) {
        sendJsonResponse(500, false, "Failed to create base upload directory. Please check permissions.");
    }
}

// Validate and sanitize folder parameter
$allowedFolders = ['assets', 'videos', 'resources', 'lessons', 'courses', 'avatars', 'compliance'];
$folder = isset($_POST['folder']) ? trim($_POST['folder']) : 'assets';
$folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $folder); // Sanitize

if (!in_array($folder, $allowedFolders)) {
    sendJsonResponse(400, false, "Invalid folder specified. Allowed: " . implode(', ', $allowedFolders));
}

$targetDir = $baseUploadDir . $folder . "/";

// 5. Check for Upload Errors
if (!isset($_FILES['fileData'])) {
    sendJsonResponse(400, false, "No fileData provided in multipart form-data request.");
}

$file = $_FILES['fileData'];

// Detailed upload error handling
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => "File exceeds upload_max_filesize (" . ini_get('upload_max_filesize') . ")",
        UPLOAD_ERR_FORM_SIZE  => "File exceeds MAX_FILE_SIZE in HTML form",
        UPLOAD_ERR_PARTIAL    => "File was only partially uploaded",
        UPLOAD_ERR_NO_FILE    => "No file was uploaded",
        UPLOAD_ERR_NO_TMP_DIR => "Missing a temporary folder on server",
        UPLOAD_ERR_CANT_WRITE => "Failed to write uploaded file to disk (permission/disk space issue)",
        UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload"
    ];
    $errMsg = $errors[$file['error']] ?? "Unknown upload error (Code: " . $file['error'] . ")";
    sendJsonResponse(400, false, $errMsg, ['errorCode' => $file['error']]);
}

// 6. Security Validation - File Size
$maxFileSize = 256 * 1024 * 1024; // 256MB in bytes
if ($file['size'] > $maxFileSize) {
    sendJsonResponse(413, false, 
        "File size exceeds maximum allowed (256MB). Your file is " . 
        round($file['size'] / (1024 * 1024), 2) . "MB"
    );
}

// 7. Security Validation - MIME Type & Extension (Whitelist)
$fileName = basename($file["name"]);
$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

// Whitelist approach (safer than blacklist)
$allowedExts = [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt',
    // Media
    'mp4', 'webm', 'ogg', 'mp3', 'wav', 'aac', 'flac', 'm4a',
    // Archives
    'zip', 'rar', '7z', 'tar', 'gz',
    // Other safe types
    'csv', 'json', 'xml', 'css', 'less', 'scss'
];

if (!in_array($fileExt, $allowedExts)) {
    sendJsonResponse(403, false, "File type '.{$fileExt}' is not allowed. Allowed: " . implode(', ', $allowedExts));
}

// Validate MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/rtf',
    // Media
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac',
    // Archives
    'application/zip', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
    // Other
    'text/csv', 'application/json', 'text/xml', 'text/css'
];

if (!in_array($mimeType, $allowedMimeTypes)) {
    sendJsonResponse(403, false, "Invalid file content type: {$mimeType}");
}

// 8. Directory Setup & Permissions
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        sendJsonResponse(500, false, "Failed to create directory: " . $targetDir);
    }
}

// Ensure directory is writable
if (!is_writable($targetDir)) {
    @chmod($targetDir, 0777);
    if (!is_writable($targetDir)) {
        sendJsonResponse(500, false, "Directory is not writable: " . $targetDir);
    }
}

// 9. Generate Unique Filename
$random32 = bin2hex(random_bytes(16)); // 32 hex characters
$timestamp = time();
$finalFileName = $timestamp . '_' . $random32 . '.' . $fileExt;
$targetFilePath = $targetDir . $finalFileName;

// 10. Move File & Return Response
if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
    // Construct the public URL
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') 
                ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    
    $publicPath = "uploads/" . $folder . "/" . $finalFileName;
    $storedPath = "/" . $publicPath;
    $publicUrl = $protocol . "://" . $host . $storedPath;

    echo json_encode([
        "success" => true,
        "message" => "File uploaded successfully.",
        "url" => $publicUrl,
        "path" => $storedPath,
        "stored_path" => $storedPath,
        "filename" => $finalFileName,
        "original_name" => $fileName,
        "folder" => $folder,
        "size" => $file['size'],
        "mime_type" => $mimeType
    ]);
} else {
    $uploadErrorDetail = error_get_last();
    $detailMsg = $uploadErrorDetail ? $uploadErrorDetail['message'] : 'Unknown move error';
    
    // Log the error for debugging
    error_log("Upload failed to move file: " . $detailMsg);
    
    sendJsonResponse(500, false, 
        "Failed to move uploaded file. Check directory permissions or disk space.",
        ['detail' => $detailMsg]
    );
}
?>