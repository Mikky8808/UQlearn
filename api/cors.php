<?php
/**
 * Centralized CORS & Security Wrapper
 * Path: /api/v1/cors.php
 */

// 1. Detect Request Origin dynamically
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';

// If Origin came from Referer, extract scheme://host(:port)
if ($origin) {
    $parsed = parse_url($origin);
    if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
        $origin = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
    }
}

// 2. Set CORS Headers if not already sent
if (!headers_sent()) {
    header_remove("Access-Control-Allow-Origin");

    if (!empty($origin)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Email, Accept, Origin, Content-Range, Range, X-Upload-Id, X-File-Name, X-File-Size, X-Folder, X-Sync-Key, X-Deploy-Key, Cache-Control, Pragma, If-Modified-Since, DNT, Keep-Alive, User-Agent");
    header("Access-Control-Expose-Headers: Content-Range, Range, Location, X-Upload-Id, Content-Length, X-User-Id, Content-Type");
    header("Access-Control-Max-Age: 86400");
}

// 3. Handle OPTIONS Preflight Requests Instantly
if (isset($_SERVER['REQUEST_METHOD']) && strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') {
    http_response_code(200);
    header("Content-Length: 0");
    header("Content-Type: text/plain; charset=UTF-8");
    exit(0);
}

