<?php
require_once __DIR__ . '/cors.php';
/**
 * ZIP Downloader API for UQlearn
 * Bundles user assets into a ZIP file for download
 */

date_default_timezone_set('Africa/Nairobi');



try {
    require_once __DIR__ . '/db.php';

    $user_id = $_GET['user_id'] ?? ($_GET['userId'] ?? null);

    if (!$user_id) {
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(["success" => false, "message" => "User ID is required"]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if (!class_exists('ZipArchive')) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(["success" => false, "message" => "PHP ZipArchive extension is not enabled on this server."]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // Fetch user's assets
    $stmt = $conn->prepare("SELECT original_name, file_path FROM uploaded_assets WHERE user_id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $assets = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $assets[] = $row;
        }
    }
    $stmt->close();
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

    if (empty($assets)) {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(["success" => false, "message" => "No assets found for this user"]);
        exit();
    }

    // Create ZIP file
    $zip = new ZipArchive();
    $zip_name = "uqlearn_assets_" . time() . ".zip";
    $zip_path = sys_get_temp_dir() . "/" . $zip_name;

    if ($zip->open($zip_path, ZipArchive::CREATE) !== TRUE) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(["success" => false, "message" => "Could not create ZIP file"]);
        exit();
    }

    $addedFiles = 0;
    foreach ($assets as $asset) {
        if (!empty($asset['file_path']) && file_exists($asset['file_path'])) {
            $zip->addFile($asset['file_path'], $asset['original_name']);
            $addedFiles++;
        }
    }

    $zip->close();

    // Send the file to the browser
    if (file_exists($zip_path) && $addedFiles > 0) {
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zip_name . '"');
        header('Content-Length: ' . filesize($zip_path));
        header('Pragma: no-cache');
        header('Expires: 0');
        readfile($zip_path);
        
        // Cleanup temporary zip file
        @unlink($zip_path);
        exit();
    } else {
        if (file_exists($zip_path)) @unlink($zip_path);
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(["success" => false, "message" => "Asset files could not be located on the server filesystem."]);
    }
} catch (\Throwable $err) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => false,
        "message" => "ZIP Downloader error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
