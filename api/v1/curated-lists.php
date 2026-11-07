<?php
require_once __DIR__ . '/cors.php';
/**
 * Curated Lists API for UQLearn
 * Stores and retrieves learner custom playlists and curated lists.
 */

error_reporting(0);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

function ensureCuratedListsTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return false;
    try {
        $sql = "CREATE TABLE IF NOT EXISTS `user_curated_lists` (
            `id` VARCHAR(128) NOT NULL,
            `user_id` VARCHAR(128) NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `description` TEXT,
            `course_ids` TEXT,
            `created_at` VARCHAR(64) DEFAULT 'Just now',
            PRIMARY KEY (`id`),
            INDEX `idx_curated_lists_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureCuratedListsTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_GET['user_id'] ?? '';

$jsonStoreFile = __DIR__ . '/../../uploads/curated_lists.json';
function getListsStore() {
    global $jsonStoreFile;
    if (file_exists($jsonStoreFile)) {
        $data = json_decode(file_get_contents($jsonStoreFile), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveListsStore($data) {
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

    $lists = [];
    if (isset($conn) && $conn instanceof mysqli) {
        $stmt = $conn->prepare("SELECT id, user_id, name, description, course_ids, created_at FROM user_curated_lists WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($row = $res->fetch_assoc()) {
                $row['courseIds'] = $row['course_ids'] ? json_decode($row['course_ids'], true) : [];
                unset($row['course_ids']);
                $lists[] = $row;
            }
            $stmt->close();
        }
    } else {
        $store = getListsStore();
        $lists = $store[$user_id] ?? [];
    }

    echo json_encode(['success' => true, 'lists' => $lists]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $user_id = $input['user_id'] ?? ($input['userId'] ?? '');

    if (!$user_id) {
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit;
    }

    if ($action === 'delete') {
        $list_id = $input['list_id'] ?? ($input['listId'] ?? '');
        if (isset($conn) && $conn instanceof mysqli) {
            $stmt = $conn->prepare("DELETE FROM user_curated_lists WHERE id = ? AND user_id = ?");
            if ($stmt) {
                $stmt->bind_param("ss", $list_id, $user_id);
                $stmt->execute();
                $stmt->close();
            }
        }
        $store = getListsStore();
        if (isset($store[$user_id])) {
            $store[$user_id] = array_values(array_filter($store[$user_id], function($l) use ($list_id) {
                return $l['id'] !== $list_id;
            }));
            saveListsStore($store);
        }
        echo json_encode(['success' => true, 'message' => 'List deleted successfully']);
        exit;
    }

    $list_id = $input['id'] ?? ('list-' . time());
    $name = $input['name'] ?? 'Untitled List';
    $description = $input['description'] ?? '';
    $course_ids = $input['courseIds'] ?? ($input['course_ids'] ?? []);
    $created_at = $input['createdAt'] ?? 'Just now';

    $course_ids_json = json_encode($course_ids);

    if (isset($conn) && $conn instanceof mysqli) {
        $stmt = $conn->prepare("INSERT INTO user_curated_lists (id, user_id, name, description, course_ids, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), course_ids=VALUES(course_ids)");
        if ($stmt) {
            $stmt->bind_param("ssssss", $list_id, $user_id, $name, $description, $course_ids_json, $created_at);
            $stmt->execute();
            $stmt->close();
        }
    }

    $store = getListsStore();
    if (!isset($store[$user_id])) {
        $store[$user_id] = [];
    }
    $listObj = [
        'id' => $list_id,
        'name' => $name,
        `description` => $description,
        'courseIds' => $course_ids,
        'createdAt' => $created_at
    ];
    $found = false;
    foreach ($store[$user_id] as &$l) {
        if ($l['id'] === $list_id) {
            $l = $listObj;
            $found = true;
            break;
        }
    }
    unset($l);
    if (!$found) {
        array_unshift($store[$user_id], $listObj);
    }
    saveListsStore($store);

    echo json_encode(['success' => true, 'list' => $listObj]);
    exit;
}
