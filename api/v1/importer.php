<?php
require_once __DIR__ . '/cors.php';
/**
 * Clean & Secure Bulk Content Importer API (Matching media-upload.php behavior)
 * Compatible with Shared Hosting (PHP 7.4+)
 * Handles individual file uploads with database logging for robust ZIP syncing.
 *
 * Endpoint: /api/v1/importer.php
 * Expects: POST multipart/form-data
 * Fields: 
 *   - fileData (or files[]): The file blob
 *   - user_id: The instructor's user ID
 */

// Enable full error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

// Increase PHP limits for large multipart uploads
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('max_execution_time', '300');
@ini_set('max_input_time', '300');
@ini_set('memory_limit', '512M');

// 1. CORS Headers
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
        ['success' => $success, 'message' => $message],
        $data
    ));
    exit;
}

try {
    require_once __DIR__ . '/db.php';

    // Auto-create database table if not exists
    $createTableSql = "CREATE TABLE IF NOT EXISTS `uploaded_assets` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_id` varchar(128) DEFAULT NULL,
        `folder_id` int(11) DEFAULT NULL,
        `filename` varchar(255) NOT NULL,
        `original_name` varchar(255) NOT NULL,
        `file_path` varchar(512) NOT NULL,
        `file_url` varchar(512) NOT NULL,
        `file_type` varchar(100) NOT NULL,
        `category` enum('lecture', 'resource', 'image') NOT NULL,
        `file_size` bigint(20) NOT NULL,
        `mime_type` varchar(100) NOT NULL,
        `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (`id`),
        INDEX `idx_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($createTableSql);

    // Handle GET Request to return server limits
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        sendJsonResponse(200, true, "Limits retrieved successfully.", [
            "limits" => [
                "upload_max_filesize" => ini_get('upload_max_filesize'),
                "post_max_size" => ini_get('post_max_size'),
                "memory_limit" => ini_get('memory_limit'),
                "max_execution_time" => ini_get('max_execution_time')
            ]
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(405, false, "Method not allowed. POST required.");
    }

    // Check for Content-Length vs POST data mismatch (exceeds post_max_size)
    $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
    if (empty($_POST) && empty($_FILES) && $contentLength > 0) {
        $postMaxSize = ini_get('post_max_size');
        sendJsonResponse(413, false, 
            "The uploaded file exceeds the server's post_max_size limit ({$postMaxSize}). " .
            "Please upload a smaller file or increase post_max_size in cPanel.",
            ['content_length' => $contentLength, 'post_max_size' => $postMaxSize]
        );
    }

    // Determine uploader user ID
    $userId = $_POST['user_id'] ?? ($_POST['userId'] ?? 'admin');

    // 2. Identify uploaded file parameter key (supports files[], fileData, or file)
    $fileKey = null;
    if (isset($_FILES['fileData'])) $fileKey = 'fileData';
    else if (isset($_FILES['file'])) $fileKey = 'file';
    else if (isset($_FILES['files']) && !empty($_FILES['files']['name'])) $fileKey = 'files';
    else {
        // Fallback scan of any parameter in $_FILES
        foreach ($_FILES as $key => $val) {
            if (!empty($val['name'])) {
                $fileKey = $key;
                break;
            }
        }
    }

    if ($fileKey === null) {
        sendJsonResponse(400, false, "No files were detected in the multipart/form-data request.", [
            "received_keys" => array_keys($_FILES)
        ]);
    }

    $filesData = $_FILES[$fileKey];

    // Handle potential array uploads gracefully (take the first file if an array is passed)
    $error_code = is_array($filesData['error']) ? $filesData['error'][0] : $filesData['error'];
    $original_name = is_array($filesData['name']) ? basename($filesData['name'][0]) : basename($filesData['name']);
    $tmp_name = is_array($filesData['tmp_name']) ? $filesData['tmp_name'][0] : $filesData['tmp_name'];
    $size = is_array($filesData['size']) ? $filesData['size'][0] : $filesData['size'];
    $type = is_array($filesData['type']) ? $filesData['type'][0] : $filesData['type'];

    // Detailed PHP upload error diagnostics
    if ($error_code !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => "File exceeds upload_max_filesize (" . ini_get('upload_max_filesize') . ")",
            UPLOAD_ERR_FORM_SIZE  => "File exceeds MAX_FILE_SIZE in HTML form",
            UPLOAD_ERR_PARTIAL    => "File was only partially uploaded",
            UPLOAD_ERR_NO_FILE    => "No file was uploaded",
            UPLOAD_ERR_NO_TMP_DIR => "Missing a temporary folder on server",
            UPLOAD_ERR_CANT_WRITE => "Failed to write uploaded file to disk (permission/disk space issue)",
            UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload"
        ];
        $errMsg = $errors[$error_code] ?? "Unknown upload error (Code: " . $error_code . ")";
        sendJsonResponse(400, false, $errMsg, ['errorCode' => $error_code]);
    }

    // 3. Security Checks & Base Directory Setup
    $baseUploadDir = "../../uploads/";
    if (!is_dir($baseUploadDir)) {
        $baseUploadDir = "../../upload/"; // Fallback
    }
    if (!is_dir($baseUploadDir)) {
        if (!mkdir($baseUploadDir, 0755, true)) {
            sendJsonResponse(500, false, "Failed to create base upload directory.");
        }
    }
    @chmod($baseUploadDir, 0777);

    // Determine extension and block dangerous scripts
    $fileExt = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    $blockedExts = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phar', 
        'js', 'jsx', 'ts', 'tsx', 
        'exe', 'bat', 'sh', 'cgi', 'pl', 'py', 'asp', 'aspx', 'jsp',
        'htaccess', 'htpasswd', 'config', 'env'
    ];
    if (in_array($fileExt, $blockedExts)) {
        sendJsonResponse(403, false, "Security Risk: File type '.{$fileExt}' is strictly forbidden.");
    }

    // Determine category based on extension
    $category = 'resource';
    if (in_array($fileExt, ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'])) {
        $category = 'lecture';
    } else if (in_array($fileExt, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])) {
        $category = 'image';
    }

    // Set subdirectory target folder
    $targetFolder = $category . "s"; // "lectures", "resources", or "images"
    $targetDir = $baseUploadDir . $targetFolder . "/";

    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            sendJsonResponse(500, false, "Failed to create category directory: " . $targetFolder);
        }
    }
    @chmod($targetDir, 0777);

    // Ensure directory is writable
    if (!is_writable($targetDir)) {
        sendJsonResponse(500, false, "Target directory is not writable: " . $targetFolder);
    }

    // 4. Generate Random Unique Name
    $random32 = bin2hex(random_bytes(16)); // 32 hex chars
    $timestamp = time();
    $finalFileName = $timestamp . '_' . $random32 . '.' . $fileExt;
    $targetFilePath = $targetDir . $finalFileName;

    // 5. Move File and Persist Record in MySQL
    if (move_uploaded_file($tmp_name, $targetFilePath)) {
        // Construct public URL
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                    (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') 
                    ? 'https' : 'http';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
        
        $urlPrefix = (strpos($baseUploadDir, 'api/v1') !== false) ? '/api/v1/uploads/' : '/uploads/';
        $storedPath = $urlPrefix . $targetFolder . "/" . $finalFileName;
        $publicUrl = $protocol . "://" . $host . $storedPath;

        // Extract precise MIME Type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = finfo_file($finfo, $targetFilePath);
        finfo_close($finfo);
        if (!$detectedMime) {
            $detectedMime = $type ?? 'application/octet-stream';
        }

        // Save Record to MySQL database
        $stmt = $conn->prepare("INSERT INTO uploaded_assets (user_id, filename, original_name, file_path, file_url, file_type, category, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("sssssssis", $userId, $finalFileName, $original_name, $targetFilePath, $publicUrl, $fileExt, $category, $size, $detectedMime);
            if ($stmt->execute()) {
                $insertedId = $conn->insert_id;
                
                // Return success exactly aligned with media-upload.php format
                sendJsonResponse(200, true, "File uploaded successfully.", [
                    "url" => $publicUrl,
                    "path" => $storedPath,
                    "stored_path" => $storedPath,
                    "filename" => $finalFileName,
                    "original_name" => $original_name,
                    "folder" => $targetFolder,
                    "size" => $size,
                    "data" => [[
                        "id" => $insertedId,
                        "name" => $original_name,
                        "filename" => $finalFileName,
                        "url" => $publicUrl,
                        "path" => $storedPath,
                        "type" => $fileExt,
                        "category" => $category,
                        "size" => $size
                    ]]
                ]);
            } else {
                sendJsonResponse(500, false, "Failed to write asset record to database.", [
                    "db_error" => $stmt->error
                ]);
            }
        } else {
            sendJsonResponse(500, false, "Database statement preparation failed.", [
                "db_error" => $conn->error
            ]);
        }
    } else {
        $lastErr = error_get_last();
        sendJsonResponse(500, false, "Failed to save uploaded file to disk.", [
            "error_detail" => $lastErr ? $lastErr['message'] : 'Unknown write failure'
        ]);
    }

} catch (Exception $e) {
    sendJsonResponse(500, false, "An unexpected server error occurred: " . $e->getMessage());
}
