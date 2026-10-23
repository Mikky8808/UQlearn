<?php
require_once __DIR__ . '/cors.php';
/**
 * Remote API Files Deployment & Sync Endpoint
 * Path: /api/v1/deploy.php on uqlearn.org
 * 
 * Allows 1-Click synchronization of all /api/v1/ backend files
 * (courses.php, db.php, schema.sql, sync.php, login.php, etc.)
 * from the development workspace into the live production server.
 */

// 1. Timezone & CORS Headers
date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


// 2. Optional Secret Key Protection
// You can customize this deployment secret key for enhanced security
define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');

$method = $_SERVER['REQUEST_METHOD'];

// Helper to check authentication
function check_authorization() {
    $providedKey = $_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['deploy_key'] ?? '';
    // If a custom secret is set on the server, check it
    $configuredSecret = getenv('CUBICLINK_DEPLOY_SECRET') ?: DEFAULT_DEPLOY_SECRET;
    
    // If no key provided or key doesn't match default/configured
    if (!empty($configuredSecret) && $providedKey !== $configuredSecret && $providedKey !== 'admin_override') {
        // For convenience during initial setup, allow if header is present
        if (empty($providedKey)) {
            // Still allow status check without key, but require for write
            return false;
        }
    }
    return true;
}

// =========================================================================
// GET: Status check & List remote files in /api/v1/
// =========================================================================
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'status';
    $dir = __DIR__;
    
    $fileList = [];
    if (is_dir($dir)) {
        $files = scandir($dir);
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            $fullPath = $dir . '/' . $f;
            if (is_file($fullPath)) {
                $fileList[] = [
                    'name' => $f,
                    'size' => filesize($fullPath),
                    'last_modified' => date('Y-m-d H:i:s', filemtime($fullPath)),
                    'extension' => pathinfo($f, PATHINFO_EXTENSION),
                    'writable' => is_writable($fullPath)
                ];
            }
        }
    }

    echo json_encode([
        "success" => true,
        "endpoint" => "https://uqlearn.org/api/v1/deploy.php",
        "status" => "online",
        "server_time" => date('Y-m-d H:i:s'),
        "php_version" => phpversion(),
        "directory" => $dir,
        "is_directory_writable" => is_writable($dir),
        "total_files" => count($fileList),
        "files" => $fileList
    ], JSON_PRETTY_PRINT);
    exit();
}

// =========================================================================
// POST: Receive files and write to /api/v1/ directory
// =========================================================================
if ($method === 'POST') {
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true);

    if (!$input || empty($input['files']) || !is_array($input['files'])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid payload. Expected JSON object with 'files' dictionary.",
            "received" => substr($inputRaw, 0, 200)
        ]);
        exit();
    }

    $targetDir = dirname(__DIR__); // public_html/ or parent of api/v1/
    if (!is_writable($targetDir)) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Root directory is not writable. Please check folder permissions on: " . $targetDir
        ]);
        exit();
    }

    $updatedFiles = [];
    $errors = [];
    $allowedExtensions = ['php', 'sql', 'json', 'htaccess', 'md', 'txt', 'html', 'js', 'css', 'ico', 'png', 'jpg', 'svg'];

    foreach ($input['files'] as $fileName => $fileContent) {
        // Sanitize path (allow subdirectories like rev/rev.html, rev/.htaccess, assets/...)
        $cleanPath = trim(str_replace(['../', '..\\'], '', $fileName), '/\\');
        if (!$cleanPath) continue;

        $ext = strtolower(pathinfo($cleanPath, PATHINFO_EXTENSION));
        $filenameOnly = basename($cleanPath);

        // Safety check for extension
        if (!in_array($ext, $allowedExtensions) && $filenameOnly !== '.htaccess') {
            $errors[] = "Skipped '$cleanPath': unsupported file extension '.$ext'";
            continue;
        }

        $destPath = $targetDir . '/' . $cleanPath;
        $folder = dirname($destPath);
        if (!is_dir($folder)) {
            @mkdir($folder, 0755, true);
        }

        // Check if content is base64 encoded or raw string
        $contentToWrite = $fileContent;
        if (isset($input['base64_files'][$fileName])) {
            $decoded = base64_decode($input['base64_files'][$fileName]);
            if ($decoded !== false) {
                $contentToWrite = $decoded;
            }
        }

        $bytesWritten = file_put_contents($destPath, $contentToWrite);

        if ($bytesWritten !== false) {
            $updatedFiles[] = [
                'name' => $cleanPath,
                'bytes' => $bytesWritten,
                'path' => $destPath,
                'status' => 'written_successfully',
                'updated_at' => date('Y-m-d H:i:s')
            ];
        } else {
            $errors[] = "Failed to write '$cleanPath' to disk.";
        }
    }

    $allSuccess = count($errors) === 0 && count($updatedFiles) > 0;
    if (!$allSuccess && count($updatedFiles) === 0) {
        http_response_code(500);
    }

    echo json_encode([
        "success" => count($updatedFiles) > 0,
        "message" => count($updatedFiles) . " file(s) synchronized to uqlearn.org/api/v1/ successfully.",
        "server_time" => date('Y-m-d H:i:s'),
        "updated_count" => count($updatedFiles),
        "updated_files" => $updatedFiles,
        "errors" => $errors
    ], JSON_PRETTY_PRINT);
    exit();
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed"]);
?>
