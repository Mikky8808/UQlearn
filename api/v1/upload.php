<?php
require_once __DIR__ . '/cors.php';
/**
 * Image & Course Thumbnail Upload API for UQlearn
 * Compatible with Shared Hosting (PHP 7.4+)
 * Generates unique random 32-character filename with timestamp and stores path.
 */

header("Content-Type: application/json; charset=UTF-8");


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed. POST required."]);
    exit();
}

// 1. Determine destination folder (default: 'courses')
$folder = 'courses';
if (isset($_POST['folder']) && !empty($_POST['folder'])) {
    $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['folder']);
}

// 2. Base upload directory
$baseUploadDir = "../../uploads/" . $folder . "/";
if (!file_exists($baseUploadDir)) {
    @mkdir($baseUploadDir, 0755, true);
}
@chmod($baseUploadDir, 0777);

// Helper function to generate 32 random characters + timestamp
function generateRandom32Name($extension) {
    $random32 = bin2hex(random_bytes(16)); // 16 bytes = 32 hexadecimal characters
    $timestamp = time();
    $cleanExt = strtolower(ltrim($extension, '.'));
    if ($cleanExt === 'jpeg') $cleanExt = 'jpg';
    return $timestamp . '_' . $random32 . '.' . $cleanExt;
}

// Allowed extensions
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

// 3. Handle Multipart Form-Data File Upload
$fileKey = null;
if (isset($_FILES['file'])) $fileKey = 'file';
else if (isset($_FILES['fileData'])) $fileKey = 'fileData';
else if (isset($_FILES['image'])) $fileKey = 'image';
else if (isset($_FILES['thumbnail'])) $fileKey = 'thumbnail';

if ($fileKey !== null) {
    $file = $_FILES[$fileKey];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Upload failed with error code: " . $file['error']]);
        exit();
    }

    // Size limit (15MB)
    if ($file['size'] > 15 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "File exceeds maximum size of 15MB"]);
        exit();
    }

    $rawExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($rawExt, $allowedExtensions)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid image extension. Only JPG, PNG, WEBP, GIF, SVG are supported."]);
        exit();
    }

    // Generate random 32 characters + timestamp filename (discards original filename)
    $finalFileName = generateRandom32Name($rawExt);
    $targetFile = $baseUploadDir . $finalFileName;

    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $storedPath = "/uploads/" . $folder . "/" . $finalFileName;
        $fullUrl = $protocol . "://" . $host . $storedPath;

        echo json_encode([
            "success" => true,
            "message" => "Image uploaded and stored successfully.",
            "path" => $storedPath,
            "stored_path" => $storedPath,
            "url" => $fullUrl,
            "filename" => $finalFileName,
            "folder" => $folder,
            "size" => $file['size']
        ]);
        exit();
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to save uploaded file to storage directory."]);
        exit();
    }
}

// 4. Handle JSON Base64 Upload
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

if ($jsonData && (isset($jsonData['fileData']) || isset($jsonData['image']) || isset($jsonData['thumbnail']))) {
    $rawFileData = $jsonData['fileData'] ?? ($jsonData['image'] ?? $jsonData['thumbnail']);
    if (isset($jsonData['folder']) && !empty($jsonData['folder'])) {
        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $jsonData['folder']);
        $baseUploadDir = "../../uploads/" . $folder . "/";
        if (!file_exists($baseUploadDir)) {
            @mkdir($baseUploadDir, 0755, true);
        }
        @chmod($baseUploadDir, 0777);
    }

    $extension = 'jpg';
    $base64Data = $rawFileData;

    // Detect data URL prefix and MIME type
    if (preg_match('/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/', $rawFileData, $matches)) {
        $mimeSub = strtolower($matches[1]);
        if ($mimeSub === 'png') $extension = 'png';
        else if ($mimeSub === 'webp') $extension = 'webp';
        else if ($mimeSub === 'gif') $extension = 'gif';
        else if ($mimeSub === 'svg+xml' || $mimeSub === 'svg') $extension = 'svg';
        else $extension = 'jpg';

        $base64Data = $matches[2];
    } else if (isset($jsonData['fileName'])) {
        $rawExt = strtolower(pathinfo($jsonData['fileName'], PATHINFO_EXTENSION));
        if (in_array($rawExt, $allowedExtensions)) {
            $extension = $rawExt;
        }
    }

    $binaryData = base64_decode($base64Data);
    if ($binaryData === false) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid base64 image data payload."]);
        exit();
    }

    // Generate random 32 characters + timestamp filename (discards original filename)
    $finalFileName = generateRandom32Name($extension);
    $targetFile = $baseUploadDir . $finalFileName;

    if (file_put_contents($targetFile, $binaryData) !== false) {
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $storedPath = "/uploads/" . $folder . "/" . $finalFileName;
        $fullUrl = $protocol . "://" . $host . $storedPath;

        echo json_encode([
            "success" => true,
            "message" => "Image uploaded and stored successfully.",
            "path" => $storedPath,
            "stored_path" => $storedPath,
            "url" => $fullUrl,
            "filename" => $finalFileName,
            "folder" => $folder,
            "size" => strlen($binaryData)
        ]);
        exit();
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to write image data to storage directory."]);
        exit();
    }
}

// If no file or payload matched
http_response_code(400);
echo json_encode(["success" => false, "message" => "No file or image data provided in request."]);
?>
