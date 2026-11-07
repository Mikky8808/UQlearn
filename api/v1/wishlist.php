<?php
require_once __DIR__ . '/cors.php';
/**
 * Wishlist API for UQLearn
 * Stores and retrieves user wishlist items.
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

function ensureWishlistTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return false;
    try {
        $sql = "CREATE TABLE IF NOT EXISTS `user_wishlists` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` VARCHAR(128) NOT NULL,
            `course_id` VARCHAR(128) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_user_course` (`user_id`, `course_id`),
            INDEX `idx_wishlist_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureWishlistTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_GET['user_id'] ?? '';

$jsonStoreFile = __DIR__ . '/../../uploads/wishlists.json';
function getWishlistStore() {
    global $jsonStoreFile;
    if (file_exists($jsonStoreFile)) {
        $data = json_decode(file_get_contents($jsonStoreFile), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveWishlistStore($data) {
    global $jsonStoreFile;
    $dir = dirname($jsonStoreFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    file_put_contents($jsonStoreFile, json_encode($data, JSON_PRETTY_PRINT));
}

if ($method === 'GET') {
    if (!$user_id) {
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit;
    }

    $wishlist = [];
    if (isset($conn) && $conn instanceof mysqli) {
        $stmt = $conn->prepare("SELECT course_id FROM user_wishlists WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($row = $res->fetch_assoc()) {
                $wishlist[] = $row['course_id'];
            }
            $stmt->close();
        }
    } else {
        $store = getWishlistStore();
        $wishlist = $store[$user_id] ?? [];
    }

    echo json_encode(['success' => true, 'wishlist' => $wishlist]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $user_id = $input['user_id'] ?? ($input['userId'] ?? '');
    $course_id = $input['course_id'] ?? ($input['courseId'] ?? '');

    if (!$user_id || !$course_id) {
        echo json_encode(['success' => false, 'message' => 'user_id and course_id are required']);
        exit;
    }

    if ($action === 'remove') {
        if (isset($conn) && $conn instanceof mysqli) {
            $stmt = $conn->prepare("DELETE FROM user_wishlists WHERE user_id = ? AND course_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $user_id, $course_id);
                $stmt->execute();
                $stmt->close();
            }
        }
        $store = getWishlistStore();
        if (isset($store[$user_id])) {
            $store[$user_id] = array_values(array_diff($store[$user_id], [$course_id]));
            saveWishlistStore($store);
        }
        echo json_encode(['success' => true, 'message' => 'Removed from wishlist']);
        exit;
    } else {
        if (isset($conn) && $conn instanceof mysqli) {
            $stmt = $conn->prepare("INSERT IGNORE INTO user_wishlists (user_id, course_id) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("ss", $user_id, $course_id);
                $stmt->execute();
                $stmt->close();
            }
        }
        $store = getWishlistStore();
        if (!isset($store[$user_id])) {
            $store[$user_id] = [];
        }
        if (!in_array($course_id, $store[$user_id])) {
            $store[$user_id][] = $course_id;
            saveWishlistStore($store);
        }
        echo json_encode(['success' => true, 'message' => 'Added to wishlist']);
        exit;
    }
}
