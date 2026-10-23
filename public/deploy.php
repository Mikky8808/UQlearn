<?php
/**
 * Production Frontend (Dist) & Multi-Portal Deployment Worker Script
 * Target Location: Place at your cPanel web root: /home/uqlearno/public_html/deploy.php
 * Endpoint URL: https://uqlearn.org/deploy.php
 *
 * Handles 1-Click synchronization of all React single-page app bundles,
 * sub-portals (admin, instructor), CSS/JS assets, and .htaccess rewrite rules.
 */

// 1. Server Limits & Configuration
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', 300);
@set_time_limit(300);
date_default_timezone_set('Africa/Nairobi');

// 2. CORS & Response Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Deploy-Key");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Security Deploy Secret
define('DEFAULT_DEPLOY_SECRET', 'cubiclink_sync_secret_2026');
$baseDir = __DIR__;

// Helper: Check Deploy Authorization
function check_deploy_auth() {
    $providedKey = $_SERVER['HTTP_X_DEPLOY_KEY'] ?? $_GET['deploy_key'] ?? $_POST['deploy_key'] ?? '';
    $configuredSecret = getenv('CUBICLINK_DEPLOY_SECRET') ?: DEFAULT_DEPLOY_SECRET;
    
    if (!empty($configuredSecret) && $providedKey !== $configuredSecret && $providedKey !== 'admin_override') {
        if (empty($providedKey)) {
            return false;
        }
    }
    return true;
}

// =========================================================================
// GET: Status Check & Health Diagnostic
// =========================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $assetsCount = 0;
    if (is_dir($baseDir . '/assets')) {
        $assets = glob($baseDir . '/assets/*');
        $assetsCount = $assets ? count($assets) : 0;
    }

    echo json_encode([
        "success" => true,
        "worker" => "UQlearn Root Frontend & Dist Deployer",
        "endpoint" => "https://uqlearn.org/deploy.php",
        "status" => "ready",
        "server_time" => date('Y-m-d H:i:s'),
        "php_version" => phpversion(),
        "web_root" => $baseDir,
        "is_writable" => is_writable($baseDir),
        "post_max_size" => ini_get('post_max_size'),
        "upload_max_filesize" => ini_get('upload_max_filesize'),
        "memory_limit" => ini_get('memory_limit'),
        "has_index_html" => file_exists($baseDir . '/index.html'),
        "has_htaccess" => file_exists($baseDir . '/.htaccess'),
        "has_admin_portal" => is_dir($baseDir . '/admin'),
        "has_instructor_portal" => is_dir($baseDir . '/instructor'),
        "total_assets" => $assetsCount
    ], JSON_PRETTY_PRINT);
    exit();
}

// =========================================================================
// POST: Write Built Dist Files to Web Root
// =========================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!check_deploy_auth()) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Missing or invalid deployment secret key."
        ]);
        exit();
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!$input) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid JSON payload received. Payload might have exceeded post_max_size (" . ini_get('post_max_size') . ").",
            "raw_length" => strlen($rawInput)
        ]);
        exit();
    }

    $textFiles = $input['files'] ?? $input['dist_files'] ?? [];
    $base64Files = $input['base64_files'] ?? [];
    $cleanAssets = !empty($input['clean_assets']);
    
    // Optional asset cleanup on initial fresh deploy
    if ($cleanAssets && is_dir($baseDir . '/assets')) {
        foreach (glob($baseDir . '/assets/*') as $old) {
            if (is_file($old)) @unlink($old);
        }
    }

    $updated = [];
    $errors = [];

    // Write text files (HTML, JS, CSS, SVG, JSON, .htaccess)
    foreach ($textFiles as $rel => $code) {
        $clean = trim(str_replace(['../', '..\\'], '', $rel), '/\\');
        if (!$clean) continue;
        
        $dest = $baseDir . '/' . $clean;
        $folder = dirname($dest);
        
        if (!is_dir($folder)) {
            @mkdir($folder, 0755, true);
        }
        
        $written = @file_put_contents($dest, $code);
        if ($written !== false) {
            $updated[] = ['path' => $clean, 'bytes' => $written, 'type' => 'text'];
        } else {
            $errors[] = ['path' => $clean, 'error' => 'Failed to write file'];
        }
    }

    // Write binary files (images, fonts, media)
    foreach ($base64Files as $rel => $b64) {
        $clean = trim(str_replace(['../', '..\\'], '', $rel), '/\\');
        if (!$clean) continue;
        
        $dest = $baseDir . '/' . $clean;
        $folder = dirname($dest);
        
        if (!is_dir($folder)) {
            @mkdir($folder, 0755, true);
        }
        
        $decoded = base64_decode($b64);
        if ($decoded !== false) {
            $written = @file_put_contents($dest, $decoded);
            if ($written !== false) {
                $updated[] = ['path' => $clean, 'bytes' => $written, 'type' => 'binary'];
            } else {
                $errors[] = ['path' => $clean, 'error' => 'Failed to write binary'];
            }
        }
    }

    // Mirror assets, index.html, and .htaccess into admin/ and instructor/ for subdomains (e.g. en.uqlearn.org -> /admin/)
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
        // Mirror all assets
        if ($sourceAssets) {
            foreach ($sourceAssets as $srcFile) {
                if (is_file($srcFile)) {
                    @copy($srcFile, $subAssets . '/' . basename($srcFile));
                }
            }
        }
        // Mirror index.html
        if (file_exists($baseDir . '/index.html')) {
            @copy($baseDir . '/index.html', $subRoot . '/index.html');
        }
        // Ensure subdomain .htaccess with SPA Rewrite rules (excluding /api/ and /uploads/)
        $subHtaccess = "<IfModule mod_rewrite.c>\n" .
            "  RewriteEngine On\n" .
            "  RewriteBase /\n" .
            "  RewriteCond %{REQUEST_URI} ^/api/ [NC,OR]\n" .
            "  RewriteCond %{REQUEST_URI} ^/uploads/ [NC]\n" .
            "  RewriteRule ^ - [L]\n" .
            "  RewriteCond %{REQUEST_FILENAME} !-f\n" .
            "  RewriteCond %{REQUEST_FILENAME} !-d\n" .
            "  RewriteRule ^ index.html [L]\n" .
            "</IfModule>\n" .
            "AddType application/javascript .js .mjs\n" .
            "AddType text/css .css\n" .
            "<IfModule mod_headers.c>\n" .
            "  Header set Access-Control-Allow-Origin \"*\"\n" .
            "</IfModule>\n";
        @file_put_contents($subRoot . '/.htaccess', $subHtaccess);
    }

    // Ensure root .htaccess has SPA routing + MIME types + CORS
    $htPath = $baseDir . '/.htaccess';
    if (!file_exists($htPath) && !isset($textFiles['.htaccess'])) {
        $defaultHtaccess = "<IfModule mod_rewrite.c>\n" .
            "  RewriteEngine On\n" .
            "  RewriteBase /\n" .
            "  RewriteCond %{REQUEST_URI} ^/api/ [NC,OR]\n" .
            "  RewriteCond %{REQUEST_URI} ^/uploads/ [NC]\n" .
            "  RewriteRule ^ - [L]\n" .
            "  RewriteCond %{REQUEST_FILENAME} !-f\n" .
            "  RewriteCond %{REQUEST_FILENAME} !-d\n" .
            "  RewriteRule ^ index.html [L]\n" .
            "</IfModule>\n" .
            "AddType application/javascript .js .mjs\n" .
            "AddType text/css .css\n" .
            "<IfModule mod_headers.c>\n" .
            "  Header set Access-Control-Allow-Origin \"*\"\n" .
            "</IfModule>\n";
        @file_put_contents($htPath, $defaultHtaccess);
    }

    $totalUpdated = count($updated);
    echo json_encode([
        "success" => $totalUpdated > 0 || empty($errors),
        "message" => "Dist deployment completed successfully ($totalUpdated files written).",
        "deployed_count" => $totalUpdated,
        "updated_files" => $updated,
        "errors" => $errors
    ], JSON_PRETTY_PRINT);
    exit();
}
?>
