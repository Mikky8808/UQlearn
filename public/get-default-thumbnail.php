<?php
/**
 * UQlearn eLearning Platform - Default Course Thumbnail Endpoint
 * File Location: /api/v1/get-default-thumbnail.php
 */

// Enable CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Storage Configuration
$storageFile = __DIR__ . '/default_thumbnail.json';
$defaultThumbnailUrl = 'https://uqlearn.org/uploads/courses/1793397934_bb01db00c53c0a65497165cd5958a36e.png';

/**
 * Helper to read current saved thumbnail URL
 */
function getSavedThumbnail($file, $defaultUrl) {
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $json = json_decode($content, true);
            if (!empty($json['thumbnailUrl'])) {
                return $json['thumbnailUrl'];
            }
            if (!empty($json['url'])) {
                return $json['url'];
            }
        }
    }
    return $defaultUrl;
}

$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod === 'GET') {
    $currentUrl = getSavedThumbnail($storageFile, $defaultThumbnailUrl);
    echo json_encode([
        'success' => true,
        'thumbnailUrl' => $currentUrl,
        'url' => $currentUrl,
        'message' => 'Default course thumbnail fetched successfully.'
    ]);
    exit();
}

if ($requestMethod === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    $newUrl = '';
    if (!empty($data['thumbnail_url'])) {
        $newUrl = trim($data['thumbnail_url']);
    } elseif (!empty($data['url'])) {
        $newUrl = trim($data['url']);
    } elseif (!empty($_POST['thumbnail_url'])) {
        $newUrl = trim($_POST['thumbnail_url']);
    } elseif (!empty($_POST['url'])) {
        $newUrl = trim($_POST['url']);
    }

    if (empty($newUrl)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing thumbnail URL parameter (url or thumbnail_url).'
        ]);
        exit();
    }

    // Save updated thumbnail URL
    $payload = [
        'thumbnailUrl' => $newUrl,
        'url' => $newUrl,
        'updatedAt' => date('Y-m-d H:i:s')
    ];

    $saved = @file_put_contents($storageFile, json_encode($payload, JSON_PRETTY_PRINT));

    if ($saved !== false) {
        echo json_encode([
            'success' => true,
            'message' => 'Default course thumbnail updated successfully.',
            'thumbnailUrl' => $newUrl,
            'url' => $newUrl
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to write to default_thumbnail.json. Please check file permissions on shared host.'
        ]);
    }
    exit();
}

// Method Not Allowed Fallback
http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Method Not Allowed. Use GET or POST.'
]);
?>
