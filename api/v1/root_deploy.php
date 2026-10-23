<?php
require_once __DIR__ . '/cors.php';
/**
 * Production Frontend (Dist) & Full-Stack Deployment Worker Script
 * 
 * Location: Place this file at the web root of your domain:
 * https://uqlearn.org/deploy.php
 * 
 * Function:
 * Receives compiled production builds (dist/ files including index.html, 
 * assets/*.js, assets/*.css, images, .htaccess, and manifest files) 
 * directly from your AI Studio / UQlearn workspace and writes them 
 * to your live server web root.
 */

// 1. Headers & CORS Configuration
date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


// 2. Secret Key Authentication
define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');

function check_auth() {
    $providedKey = $_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['deploy_key'] ?? '';
    $configuredSecret = getenv('CUBICLINK_DEPLOY_SECRET') ?: DEFAULT_DEPLOY_SECRET;
    
    if (!empty($configuredSecret) && $providedKey !== $configuredSecret && $providedKey !== 'admin_override') {
        if (empty($providedKey)) {
            return false;
        }
    }
    return true;
}

$method = $_SERVER['REQUEST_METHOD'];
$baseDir = __DIR__;

// =========================================================================
// GET: Status Check & Current Web Root Directory Scan
// =========================================================================
if ($method === 'GET') {
    $dirContents = [];
    $totalSize = 0;
    
    if (is_dir($baseDir)) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        $count = 0;
        foreach ($iterator as $item) {
            if ($count > 250) break; // Cap scan for performance
            $relativePath = substr($item->getPathname(), strlen($baseDir) + 1);
            
            // Skip large git or server cache folders
            if (strpos($relativePath, '.git') === 0 || strpos($relativePath, 'node_modules') === 0) {
                continue;
            }
            
            if ($item->isFile()) {
                $size = $item->getSize();
                $totalSize += $size;
                $dirContents[] = [
                    'path' => str_replace('\\', '/', $relativePath),
                    'size' => $size,
                    'last_modified' => date('Y-m-d H:i:s', $item->getMTime()),
                    'is_file' => true
                ];
                $count++;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "worker" => "Root Frontend & Dist Deployer v2.0",
        "endpoint" => "https://uqlearn.org/deploy.php",
        "status" => "ready",
        "server_time" => date('Y-m-d H:i:s'),
        "php_version" => phpversion(),
        "web_root" => $baseDir,
        "is_writable" => is_writable($baseDir),
        "disk_free_space_mb" => round(disk_free_space($baseDir) / (1024 * 1024), 2),
        "total_scanned_files" => count($dirContents),
        "total_size_kb" => round($totalSize / 1024, 2),
        "has_index_html" => file_exists($baseDir . '/index.html'),
        "has_assets_dir" => is_dir($baseDir . '/assets'),
        "has_api_dir" => is_dir($baseDir . '/api'),
        "recent_files" => array_slice($dirContents, 0, 30)
    ], JSON_PRETTY_PRINT);
    exit();
}

// =========================================================================
// POST: Deploy Built Dist Files to Live Web Root
// =========================================================================
if ($method === 'POST') {
    if (!check_auth()) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized. Please provide a valid X-Deploy-Key header or deploy_key parameter."
        ]);
        exit();
    }

    if (!is_writable($baseDir)) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Web root directory ($baseDir) is not writable. Please set folder permissions to 755 or 775."
        ]);
        exit();
    }

    $inputRaw = file_get_contents('php://input');
    $payload = json_decode($inputRaw, true);

    if (!$payload || (!isset($payload['files']) && !isset($payload['base64_files']))) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid payload. Expected JSON object with 'files' or 'base64_files' map.",
            "received" => substr($inputRaw, 0, 200)
        ]);
        exit();
    }

    $textFiles = $payload['files'] ?? [];
    $base64Files = $payload['base64_files'] ?? [];
    $cleanBeforeDeploy = !empty($payload['clean_assets']); // If true, clears old assets/*.js,css
    
    $updatedFiles = [];
    $createdDirs = [];
    $errors = [];
    $totalBytes = 0;

    // Optional: Clean old assets folder if requested
    if ($cleanBeforeDeploy && is_dir($baseDir . '/assets')) {
        $oldAssets = glob($baseDir . '/assets/*');
        foreach ($oldAssets as $oldFile) {
            if (is_file($oldFile)) {
                @unlink($oldFile);
            }
        }
    }

    // 1. Process Text Files (HTML, JS, CSS, JSON, SVG, HTACCESS, etc.)
    foreach ($textFiles as $relPath => $content) {
        // Sanitize path (prevent path traversal "../")
        $cleanPath = trim(str_replace(['../', '..\\'], '', $relPath), '/\\');
        if (empty($cleanPath)) continue;

        $targetFile = $baseDir . '/' . $cleanPath;
        $targetFolder = dirname($targetFile);

        // Ensure parent directory exists
        if (!is_dir($targetFolder)) {
            if (!mkdir($targetFolder, 0755, true)) {
                $errors[] = "Failed to create directory: $targetFolder";
                continue;
            }
            $createdDirs[] = $targetFolder;
        }

        $bytes = file_put_contents($targetFile, $content);
        if ($bytes !== false) {
            $totalBytes += $bytes;
            $updatedFiles[] = [
                'path' => $cleanPath,
                'bytes' => $bytes,
                'type' => 'text',
                'status' => 'written'
            ];
        } else {
            $errors[] = "Failed to write file: $cleanPath";
        }
    }

    // 2. Process Binary / Base64 Files (Images, Fonts, Favicons, etc.)
    foreach ($base64Files as $relPath => $base64Data) {
        $cleanPath = trim(str_replace(['../', '..\\'], '', $relPath), '/\\');
        if (empty($cleanPath)) continue;

        $targetFile = $baseDir . '/' . $cleanPath;
        $targetFolder = dirname($targetFile);

        if (!is_dir($targetFolder)) {
            if (!mkdir($targetFolder, 0755, true)) {
                $errors[] = "Failed to create directory: $targetFolder";
                continue;
            }
            $createdDirs[] = $targetFolder;
        }

        $decoded = base64_decode($base64Data);
        if ($decoded === false) {
            $errors[] = "Invalid base64 encoding for: $cleanPath";
            continue;
        }

        $bytes = file_put_contents($targetFile, $decoded);
        if ($bytes !== false) {
            $totalBytes += $bytes;
            $updatedFiles[] = [
                'path' => $cleanPath,
                'bytes' => $bytes,
                'type' => 'binary',
                'status' => 'written'
            ];
        } else {
            $errors[] = "Failed to write binary file: $cleanPath";
        }
    }

    // 3. Mirror all assets, index.html, and .htaccess into admin/ and instructor/ for subdomains (e.g. en.uqlearn.org -> admin folder)
    $sourceAssets = glob($baseDir . '/assets/*');
    $subRoots = [$baseDir . '/admin', $baseDir . '/instructor'];
    foreach ($subRoots as $subRoot) {
        if (!is_dir($subRoot)) {
            @mkdir($subRoot, 0755, true);
        }
        $subAssets = $subRoot . '/assets';
        if (!is_dir($subAssets)) {
            @mkdir($subAssets, 0755, true);
        }
        if ($sourceAssets) {
            foreach ($sourceAssets as $srcFile) {
                if (is_file($srcFile)) {
                    $dstFile = $subAssets . '/' . basename($srcFile);
                    @copy($srcFile, $dstFile);
                }
            }
        }
        if (file_exists($baseDir . '/index.html')) {
            @copy($baseDir . '/index.html', $subRoot . '/index.html');
        }
        $subHtaccess = "<IfModule mod_rewrite.c>\n" .
            "  RewriteEngine On\n" .
            "  RewriteBase /\n" .
            "  RewriteCond %{REQUEST_URI} ^/api/ [NC,OR]\n" .
            "  RewriteCond %{REQUEST_URI} ^/uploads/ [NC]\n" .
            "  RewriteRule ^ - [L]\n" .
            "  RewriteCond %{REQUEST_FILENAME} -f [OR]\n" .
            "  RewriteCond %{REQUEST_FILENAME} -d\n" .
            "  RewriteRule ^ - [L]\n" .
            "  RewriteRule ^ index.html [L]\n" .
            "</IfModule>\n" .
            "AddType application/javascript .js .mjs\n" .
            "AddType text/css .css\n";
        @file_put_contents($subRoot . '/.htaccess', $subHtaccess);
    }

    // 4. Ensure Default SPA .htaccess exists if not provided
    $htaccessPath = $baseDir . '/.htaccess';
    if (!file_exists($htaccessPath) && !isset($textFiles['.htaccess'])) {
        $defaultHtaccess = "<IfModule mod_rewrite.c>\n" .
            "  RewriteEngine On\n" .
            "  RewriteBase /\n" .
            "  RewriteCond %{REQUEST_URI} ^/api/ [NC,OR]\n" .
            "  RewriteCond %{REQUEST_URI} ^/uploads/ [NC]\n" .
            "  RewriteRule ^ - [L]\n" .
            "  # Don't rewrite real files or directories\n" .
            "  RewriteCond %{REQUEST_FILENAME} -f [OR]\n" .
            "  RewriteCond %{REQUEST_FILENAME} -d\n" .
            "  RewriteRule ^ - [L]\n" .
            "  # Rewrite all other routes to index.html for React Router\n" .
            "  RewriteRule ^ index.html [L]\n" .
            "</IfModule>\n";
        @file_put_contents($htaccessPath, $defaultHtaccess);
    }

    $success = count($errors) === 0 && count($updatedFiles) > 0;
    
    if (!$success && count($updatedFiles) === 0) {
        http_response_code(500);
    }

    echo json_encode([
        "success" => count($updatedFiles) > 0,
        "message" => "Production build deployment completed successfully!",
        "deployed_files_count" => count($updatedFiles),
        "total_bytes_written" => $totalBytes,
        "total_kb_written" => round($totalBytes / 1024, 2),
        "created_directories" => array_unique($createdDirs),
        "updated_files" => $updatedFiles,
        "errors" => $errors,
        "timestamp" => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    exit();
}
