<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
/**
 * Secure Media & Document Uploader for Shared Hosting
 * Handles large uploads (up to 500MB) and performs extension filtering.
 * 
 * Endpoint: /api/v1/media-upload.php
 * Expects: POST multipart/form-data
 * Fields: 
 *   - fileData: The file blob
 *   - folder: Destination folder ('assets', 'videos', 'resources', 'lessons', 'courses', 'avatars', etc.)
 */

error_reporting(0);
ini_set('display_errors', '0');

// Increase PHP limits for large multipart uploads
@ini_set('upload_max_filesize', '500M');
@ini_set('post_max_size', '500M');
@ini_set('max_execution_time', '300');
@ini_set('memory_limit', '512M');

header("Content-Type: application/json; charset=UTF-8");

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

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Validate Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Invalid request method. POST required."]);
    exit;
}

// Check if POST request has content-length but empty $_POST and $_FILES
// This happens when the upload exceeds post_max_size
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if (empty($_POST) && empty($_FILES) && $contentLength > 0) {
    $postMaxSize = ini_get('post_max_size');
    http_response_code(413); // Payload Too Large
    echo json_encode([
        "success" => false,
        "error" => "The uploaded file size exceeds the server's post_max_size limit ($postMaxSize). Please upload a smaller file or increase post_max_size in cPanel.",
        "content_length" => $contentLength,
        "post_max_size" => $postMaxSize
    ]);
    exit;
}

// 3. Configuration & Paths
// Point to uploads/ in shared hosting root structure
$baseUploadDir = "../../uploads/";
if (!is_dir($baseUploadDir)) {
    $baseUploadDir = "../../upload/"; // Fallback
}
if (!is_dir($baseUploadDir)) {
    @mkdir($baseUploadDir, 0755, true);
}

$folder = isset($_POST['folder']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['folder']) : 'assets';
if (empty($folder)) {
    $folder = 'assets';
}

$targetDir = $baseUploadDir . $folder . "/";

// 4. Check for Upload Errors
if (!isset($_FILES['fileData']) && !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No fileData or file provided in multipart form-data request."]);
    exit;
}

$file = isset($_FILES['fileData']) ? $_FILES['fileData'] : $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => "File exceeds upload_max_filesize (" . ini_get('upload_max_filesize') . ") in php.ini",
        UPLOAD_ERR_FORM_SIZE  => "File exceeds MAX_FILE_SIZE in HTML form",
        UPLOAD_ERR_PARTIAL    => "File was only partially uploaded",
        UPLOAD_ERR_NO_FILE    => "No file was uploaded",
        UPLOAD_ERR_NO_TMP_DIR => "Missing a temporary folder on server",
        UPLOAD_ERR_CANT_WRITE => "Failed to write uploaded file to disk (permission issue)",
        UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload"
    ];
    $errMsg = $errors[$file['error']] ?? "Unknown upload error (Code: " . $file['error'] . ")";
    http_response_code(400);
    echo json_encode(["success" => false, "error" => $errMsg, "errorCode" => $file['error']]);
    exit;
}

// 5. Security Validation - Extension Filtering
$fileName = basename($file["name"]);
$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

$blockedExts = [
    'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'phar', 
    'js', 'jsx', 'ts', 'tsx', 
    'exe', 'bat', 'sh', 'cgi', 'pl', 'py', 'asp', 'aspx', 'jsp',
    'htaccess', 'htpasswd', 'config', 'env'
];

if (in_array($fileExt, $blockedExts)) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Security Risk: File type '.{$fileExt}' is strictly forbidden."]);
    exit;
}

// 6. Directory Setup & Permissions
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to create directory structure: " . $targetDir]);
        exit;
    }
}

// Ensure directory is writable
@chmod($targetDir, 0777);
if (!is_writable($targetDir)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Directory is not writable: " . $targetDir]);
    exit;
}

// 7. Final File Name Construction (Random 32 characters with timestamp - no original filename)
$random32 = bin2hex(random_bytes(16)); // 16 bytes = 32 hexadecimal characters
$timestamp = time();
$finalFileName = $timestamp . '_' . $random32 . '.' . $fileExt;
$targetFilePath = $targetDir . $finalFileName;

// 8. Move File & Return Response
if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
    // Construct the public URL first
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $publicPath = "uploads/" . $folder . "/" . $finalFileName;
    $storedPath = "/" . $publicPath;
    $publicUrl = $protocol . "://" . $host . $storedPath;

    // SERVER-SIDE REMUXING FOR MKV FILES
    if (strtolower($fileExt) === 'mkv') {
        $mp4CleanName = pathinfo($finalFileName, PATHINFO_FILENAME) . '.mp4';
        $mp4Path = $targetDir . $mp4CleanName;
        $mp4StoredPath = "/uploads/" . $folder . "/" . $mp4CleanName;
        $mp4PublicUrl = $protocol . "://" . $host . $mp4StoredPath;

        @exec("ffmpeg -y -i " . escapeshellarg($targetFilePath) . " -c copy " . escapeshellarg($mp4Path) . " > /dev/null 2>&1");

        if (file_exists($mp4Path) && filesize($mp4Path) > 0) {
            $publicUrl = $mp4PublicUrl;
            $storedPath = $mp4StoredPath;
            $finalFileName = $mp4CleanName;
        }
    }

    // Insert into MySQL uploaded_videos table if connected
    if (isset($conn) && $conn instanceof mysqli) {
        @$conn->query("CREATE TABLE IF NOT EXISTS `uploaded_videos` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `upload_id` varchar(100) NOT NULL,
            `user_id` varchar(100) DEFAULT NULL,
            `user_email` varchar(255) DEFAULT NULL,
            `file_name` varchar(255) NOT NULL,
            `file_path` varchar(255) NOT NULL,
            `file_url` varchar(500) NOT NULL,
            `file_size` bigint(20) NOT NULL,
            `folder` varchar(100) DEFAULT 'videos',
            `status` varchar(50) DEFAULT 'completed',
            `created_at` datetime DEFAULT current_timestamp(),
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

        $uploadId = $_POST['upload_id'] ?? ('dir_' . time() . '_' . bin2hex(random_bytes(4)));
        $userId = $_POST['user_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 'user_anon';
        $userEmail = $_POST['user_email'] ?? $_SERVER['HTTP_X_USER_EMAIL'] ?? '';
        $origName = $file['name'];
        $createdAt = date('Y-m-d H:i:s');
        $fileSize = $file['size'];

        $stmt = $conn->prepare("INSERT INTO `uploaded_videos` (`upload_id`, `user_id`, `user_email`, `file_name`, `file_path`, `file_url`, `file_size`, `folder`, `status`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)");
        if ($stmt) {
            $stmt->bind_param("ssssssiss", $uploadId, $userId, $userEmail, $origName, $storedPath, $publicUrl, $fileSize, $folder, $createdAt);
            @$stmt->execute();
            @$stmt->close();
        }

        // Ensure user_resources table exists with lesson_id column
        @$conn->query("CREATE TABLE IF NOT EXISTS `user_resources` (
            `id` VARCHAR(128) NOT NULL,
            `user_id` VARCHAR(128) NOT NULL,
            `lesson_id` VARCHAR(128) DEFAULT NULL,
            `filename` VARCHAR(255) NOT NULL,
            `url` TEXT NOT NULL,
            `file_path` TEXT,
            `file_type` VARCHAR(64) DEFAULT 'pdf',
            `file_size` INT DEFAULT 0,
            `created_at` DATETIME NOT NULL,
            PRIMARY KEY (`id`),
            INDEX `idx_user_resources_user_id` (`user_id`),
            INDEX `idx_user_resources_lesson_id` (`lesson_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $checkCol = @$conn->query("SHOW COLUMNS FROM `user_resources` LIKE 'lesson_id'");
        if ($checkCol && $checkCol->num_rows === 0) {
            @$conn->query("ALTER TABLE `user_resources` ADD COLUMN `lesson_id` VARCHAR(128) DEFAULT NULL");
            @$conn->query("ALTER TABLE `user_resources` ADD INDEX `idx_user_resources_lesson_id` (`lesson_id`)");
        }

        $lessonId = $_POST['lesson_id'] ?? $_GET['lesson_id'] ?? $_POST['lessonId'] ?? null;
        if (empty($lessonId)) $lessonId = null;

        // Register in user_resources for all resources / documents or lesson uploads
        if ($folder === 'resources' || !empty($lessonId) || in_array($fileExt, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'zip', 'rar', 'txt'])) {
            $resId = 'res_' . time() . '_' . bin2hex(random_bytes(4));
            $rStmt = $conn->prepare("INSERT INTO `user_resources` (`id`, `user_id`, `lesson_id`, `filename`, `url`, `file_path`, `file_type`, `file_size`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if ($rStmt) {
                $now = date('Y-m-d H:i:s');
                $rStmt->bind_param("sssssssis", $resId, $userId, $lessonId, $origName, $publicUrl, $storedPath, $fileExt, $fileSize, $now);
                @$rStmt->execute();
                @$rStmt->close();
            }
        }
    }
    // Construct the public URL
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
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
        "folder" => $folder,
        "size" => $file['size'],
        "file_size" => $file['size'],
        "fileSize" => formatSize($file['size']),
        "formatted_size" => formatSize($file['size'])
    ]);
} else {
    $uploadErrorDetail = error_get_last();
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Failed to move uploaded file. Check directory permissions or disk space.",
        "detail" => $uploadErrorDetail ? $uploadErrorDetail['message'] : 'Unknown move error'
    ]);
}
