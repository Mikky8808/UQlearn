<?php
require_once __DIR__ . '/cors.php';
/**
 * Recently Viewed Courses API for UQLearn
 * Stores and retrieves courses recently viewed by users/guests to support cross-selling and quick resumption.
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

function ensureRecentlyViewedTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return false;
    try {
        $sql = "CREATE TABLE IF NOT EXISTS `user_recently_viewed` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` VARCHAR(128) NOT NULL,
            `course_id` VARCHAR(128) NOT NULL,
            `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_user_course` (`user_id`, `course_id`),
            INDEX `idx_user_viewed` (`user_id`, `viewed_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureRecentlyViewedTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = trim($_GET['user_id'] ?? ($_GET['userId'] ?? ''));
if (empty($user_id)) {
    $user_id = 'guest';
}

$jsonStoreFile = __DIR__ . '/../../uploads/recently_viewed.json';

function getRecentlyViewedStore() {
    global $jsonStoreFile;
    if (file_exists($jsonStoreFile)) {
        $data = json_decode(@file_get_contents($jsonStoreFile), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveRecentlyViewedStore($data) {
    global $jsonStoreFile;
    $dir = dirname($jsonStoreFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    @file_put_contents($jsonStoreFile, json_encode($data, JSON_PRETTY_PRINT));
}

if ($method === 'GET') {
    $items = [];
    $dataList = [];

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $stmt = $conn->prepare("SELECT course_id, viewed_at FROM user_recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 20");
            if ($stmt) {
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $items[] = $row['course_id'];
                    $dataList[] = [
                        'course_id' => $row['course_id'],
                        'viewed_at' => $row['viewed_at']
                    ];
                }
                $stmt->close();
            }
        } catch (Exception $e) {
            // DB query fallback to json
        }
    }

    if (empty($items)) {
        $store = getRecentlyViewedStore();
        $userItems = $store[$user_id] ?? [];
        if (is_array($userItems)) {
            foreach ($userItems as $entry) {
                if (is_string($entry)) {
                    $items[] = $entry;
                    $dataList[] = ['course_id' => $entry, 'viewed_at' => date('Y-m-d H:i:s')];
                } elseif (is_array($entry) && !empty($entry['course_id'])) {
                    $items[] = $entry['course_id'];
                    $dataList[] = $entry;
                }
            }
        }
    }

    echo json_encode([
        'success' => true,
        'user_id' => $user_id,
        'items' => array_values(array_unique($items)),
        'data' => $dataList
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'record';
    $post_user_id = trim($input['user_id'] ?? ($input['userId'] ?? ''));
    if (empty($post_user_id)) {
        $post_user_id = 'guest';
    }
    $course_id = trim($input['course_id'] ?? ($input['courseId'] ?? ''));

    if ($action === 'clear') {
        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $stmt = $conn->prepare("DELETE FROM user_recently_viewed WHERE user_id = ?");
                if ($stmt) {
                    $stmt->bind_param("s", $post_user_id);
                    $stmt->execute();
                    $stmt->close();
                }
            } catch (Exception $e) {}
        }
        $store = getRecentlyViewedStore();
        unset($store[$post_user_id]);
        saveRecentlyViewedStore($store);

        echo json_encode(['success' => true, 'message' => 'Recently viewed list cleared']);
        exit;
    }

    if ($action === 'remove') {
        if (empty($course_id)) {
            echo json_encode(['success' => false, 'message' => 'course_id is required']);
            exit;
        }

        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $stmt = $conn->prepare("DELETE FROM user_recently_viewed WHERE user_id = ? AND course_id = ?");
                if ($stmt) {
                    $stmt->bind_param("ss", $post_user_id, $course_id);
                    $stmt->execute();
                    $stmt->close();
                }
            } catch (Exception $e) {}
        }
        $store = getRecentlyViewedStore();
        if (isset($store[$post_user_id]) && is_array($store[$post_user_id])) {
            $filtered = [];
            foreach ($store[$post_user_id] as $entry) {
                $cid = is_string($entry) ? $entry : ($entry['course_id'] ?? '');
                if ($cid !== $course_id) {
                    $filtered[] = $entry;
                }
            }
            $store[$post_user_id] = $filtered;
            saveRecentlyViewedStore($store);
        }

        echo json_encode(['success' => true, 'message' => 'Removed from recently viewed']);
        exit;
    }

    // Default: record recently viewed
    if (empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'course_id is required']);
        exit;
    }

    if (isset($conn) && $conn instanceof mysqli) {
        try {
            $stmt = $conn->prepare("INSERT INTO user_recently_viewed (user_id, course_id, viewed_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP) 
                ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP");
            if ($stmt) {
                $stmt->bind_param("ss", $post_user_id, $course_id);
                $stmt->execute();
                $stmt->close();
            }
        } catch (Exception $e) {}
    }

    // Update JSON file fallback
    $store = getRecentlyViewedStore();
    $list = $store[$post_user_id] ?? [];
    if (!is_array($list)) $list = [];

    // Filter out the course_id if already present so we can move it to front
    $newList = [
        [
            'course_id' => $course_id,
            'viewed_at' => date('Y-m-d H:i:s')
        ]
    ];
    foreach ($list as $entry) {
        $cid = is_string($entry) ? $entry : ($entry['course_id'] ?? '');
        if ($cid && $cid !== $course_id) {
            $newList[] = is_string($entry) ? ['course_id' => $cid, 'viewed_at' => date('Y-m-d H:i:s')] : $entry;
        }
    }
    // Cap to 20 items
    $store[$post_user_id] = array_slice($newList, 0, 20);
    saveRecentlyViewedStore($store);

    echo json_encode([
        'success' => true,
        'message' => 'Recorded successfully',
        'course_id' => $course_id,
        'user_id' => $post_user_id
    ]);
    exit;
}

if ($method === 'DELETE') {
    $cid = $_GET['course_id'] ?? ($_GET['courseId'] ?? '');
    if ($cid) {
        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $stmt = $conn->prepare("DELETE FROM user_recently_viewed WHERE user_id = ? AND course_id = ?");
                if ($stmt) {
                    $stmt->bind_param("ss", $user_id, $cid);
                    $stmt->execute();
                    $stmt->close();
                }
            } catch (Exception $e) {}
        }
        $store = getRecentlyViewedStore();
        if (isset($store[$user_id]) && is_array($store[$user_id])) {
            $store[$user_id] = array_values(array_filter($store[$user_id], function($entry) use ($cid) {
                $id = is_string($entry) ? $entry : ($entry['course_id'] ?? '');
                return $id !== $cid;
            }));
            saveRecentlyViewedStore($store);
        }
    }
    echo json_encode(['success' => true, 'message' => 'Deleted']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
