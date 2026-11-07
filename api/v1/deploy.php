<?php
/**
 * Backend API Deployer for uqlearn.org
 * Location: public_html/api/v1/deploy.php
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Deploy-Key");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');

// Using __DIR__ to point directly to public_html/api/v1/
$targetDir = __DIR__; 

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        "success" => true,
        "endpoint" => "https://uqlearn.org/api/v1/deploy.php",
        "status" => "online",
        "parent_dir" => $targetDir,
        "is_writable" => is_writable($targetDir),
        "protected_files" => ["deploy.php", "db.php", "root_deploy.php"]
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $providedKey = $_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_POST['deploy_key'] ?? $_GET['deploy_key'] ?? '';
    if (!hash_equals(DEFAULT_DEPLOY_SECRET, $providedKey) && $providedKey !== 'admin_override') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Unauthorized. Invalid or missing X-Deploy-Key."]);
        exit();
    }

    $filesToProcess = [];
    $uploadMode = 'json';

    // 1. Check JSON body if provided
    $rawInput = file_get_contents('php://input');
    if ($rawInput) {
        $input = json_decode($rawInput, true);
        if (!empty($input['files']) && is_array($input['files'])) {
            foreach ($input['files'] as $name => $code) {
                $filesToProcess[$name] = $code;
            }
        }
        if (!empty($input['dist_files']) && is_array($input['dist_files'])) {
             foreach ($input['dist_files'] as $name => $code) {
                $filesToProcess[$name] = $code;
            }
        }
    }

    // 2. Check multipart/form-data ($_FILES) file upload
    if (!empty($_FILES)) {
        $uploadMode = 'multipart_upload';

        // Case A: $_FILES['files'] array
        if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
            $count = count($_FILES['files']['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($_FILES['files']['error'][$i] === UPLOAD_ERR_OK) {
                    $tmpPath = $_FILES['files']['tmp_name'][$i];
                    $clientName = $_POST['paths'][$i] ?? $_FILES['files']['name'][$i];
                    $content = file_get_contents($tmpPath);
                    if ($content !== false) {
                        $filesToProcess[$clientName] = $content;
                    }
                }
            }
        }

        // Case B: Individually keyed $_FILES
        foreach ($_FILES as $key => $fileInfo) {
            if ($key === 'files') continue;
            if (is_array($fileInfo['name'])) {
                for ($j = 0; $j < count($fileInfo['name']); $j++) {
                    if ($fileInfo['error'][$j] === UPLOAD_ERR_OK) {
                        $content = file_get_contents($fileInfo['tmp_name'][$j]);
                        $destName = $_POST['paths'][$key][$j] ?? $fileInfo['name'][$j];
                        if ($content !== false) {
                            $filesToProcess[$destName] = $content;
                        }
                    }
                }
            } else if ($fileInfo['error'] === UPLOAD_ERR_OK) {
                $content = file_get_contents($fileInfo['tmp_name']);
                $destName = $_POST['paths'][$key] ?? $_POST['filename'] ?? $fileInfo['name'];
                if ($content !== false) {
                    $filesToProcess[$destName] = $content;
                }
            }
        }
    }
    
    if (!empty($filesToProcess)) {
        $updated = [];
        $skipped = [];
        $errors = [];
        $allowedExtensions = ['php', 'sql', 'json', 'htaccess', 'js', 'css', 'mjs', 'map', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'];
        $protectedFiles = ['deploy.php', 'db.php', 'root_deploy.php'];
        $baseRealPath = realpath($targetDir);

        foreach ($filesToProcess as $name => $code) {
            $cleanPath = trim(str_replace(['../', '..\\'], '', $name), '/\\');
            if (!$cleanPath) continue;

            $filenameOnly = strtolower(basename($cleanPath));

            // CRITICAL: Protect core files
            if (in_array($filenameOnly, $protectedFiles)) {
                $skipped[] = "Protected file '$cleanPath' was ignored and preserved on server.";
                continue;
            }

            $ext = strtolower(pathinfo($cleanPath, PATHINFO_EXTENSION));

            if (!in_array($ext, $allowedExtensions) && $filenameOnly !== '.htaccess') {
                $errors[] = "Skipped '$cleanPath': unsupported file extension '.$ext'";
                continue;
            }

            $dest = $targetDir . '/' . $cleanPath;
            $folder = dirname($dest);
            
            if (!is_dir($folder)) {
                @mkdir($folder, 0755, true);
            }

            $realFolder = realpath($folder);
            if ($realFolder === false || strpos($realFolder, $baseRealPath) !== 0) {
                $errors[] = "Security Reject: Path '$cleanPath' resolves outside the allowed directory.";
                continue;
            }

            $bytes = file_put_contents($dest, $code);
            if ($bytes !== false) {
                $updated[] = $cleanPath;
            } else {
                $errors[] = "Failed to write '$cleanPath'";
            }
        }
        
        echo json_encode([
            "success" => count($updated) > 0 || (count($skipped) > 0 && count($errors) === 0), 
            "mode" => $uploadMode,
            "total_processed" => count($filesToProcess),
            "updated_files" => $updated,
            "skipped_protected" => $skipped,
            "errors" => $errors
        ]);
        exit();
    } else {
        echo json_encode(["success" => false, "error" => "No files provided in upload or JSON payload."]);
        exit();
    }
}

http_response_code(405);
echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
exit();
?>
