<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: text/plain');

$files = [
    'Root Directory .htaccess' => '../../.htaccess',
    'API v1 Directory .htaccess' => './.htaccess'
];

foreach ($files as $label => $path) {
    echo "--- $label ($path) ---\n";
    if (file_exists($path)) {
        echo file_get_contents($path);
    } else {
        // Fallback for different cPanel deployment hierarchies
        $fallbackPath = ($label === 'Root Directory .htaccess') ? '../.htaccess' : './.htaccess';
        if (file_exists($fallbackPath)) {
            echo "--- (Found at fallback: $fallbackPath) ---\n";
            echo file_get_contents($fallbackPath);
        } else {
            echo "File not found.";
        }
    }
    echo "\n\n";
}
