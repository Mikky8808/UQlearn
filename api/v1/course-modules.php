<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Modules & Lessons API Endpoint (PHP Backend for MySQL)
 * LMS Platform
 * 
 * Path: /api/v1/course-modules.php
 */

header('Content-Type: application/json; charset=utf-8');


require_once __DIR__ . '/db.php';

// Helper to ensure database table and columns exist
function ensureLessonSchemaAndResourcesTable($conn) {
    if (!$conn || !($conn instanceof mysqli)) return;
    try {
        // Ensure user_resources table exists with lesson_id
        $sql = "CREATE TABLE IF NOT EXISTS `user_resources` (
            `id` VARCHAR(128) NOT NULL,
            `user_id` VARCHAR(128) NOT NULL,
            `lesson_id` VARCHAR(128) DEFAULT NULL,
            `filename` VARCHAR(255) NOT NULL,
            `url` TEXT NOT NULL,
            `file_path` TEXT,
            `file_type` VARCHAR(64) DEFAULT 'pdf',
            `file_size` INT DEFAULT 0,
            `created_at` DATETIME NOT NULL,
            PRIMARY KEY (`id`),
            INDEX `idx_user_resources_user_id` (`user_id`),
            INDEX `idx_user_resources_lesson_id` (`lesson_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $conn->query($sql);

        $resCol = $conn->query("SHOW COLUMNS FROM `user_resources` LIKE 'lesson_id'");
        if ($resCol && $resCol->num_rows === 0) {
            $conn->query("ALTER TABLE `user_resources` ADD COLUMN `lesson_id` VARCHAR(128) DEFAULT NULL");
            $conn->query("ALTER TABLE `user_resources` ADD INDEX `idx_user_resources_lesson_id` (`lesson_id`)");
        }

        // Ensure optional lesson columns exist
        $res = $conn->query("SHOW COLUMNS FROM `lessons`");
        if ($res) {
            $existingColumns = [];
            while ($row = $res->fetch_assoc()) {
                $existingColumns[] = strtolower($row['Field']);
            }
            $columnsToEnsure = [
                'video_path' => "VARCHAR(255) DEFAULT ''",
                'resources' => "LONGTEXT DEFAULT NULL",
                'description' => "TEXT DEFAULT NULL",
                'lab_url' => "TEXT DEFAULT NULL",
                'lab_title' => "VARCHAR(255) DEFAULT ''"
            ];
            foreach ($columnsToEnsure as $col => $definition) {
                if (!in_array(strtolower($col), $existingColumns)) {
                    $conn->query("ALTER TABLE `lessons` ADD COLUMN `$col` $definition");
                }
            }
        }

        // Ensure modules columns exist (updated_at, is_deleted)
        $modRes = $conn->query("SHOW COLUMNS FROM `modules`");
        if ($modRes) {
            $existingModColumns = [];
            while ($mRow = $modRes->fetch_assoc()) {
                $existingModColumns[] = strtolower($mRow['Field']);
            }
            $modColumnsToEnsure = [
                'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                'is_deleted' => "TINYINT(1) DEFAULT 0",
                'description' => "TEXT DEFAULT NULL",
                'order_index' => "INT DEFAULT 0"
            ];
            foreach ($modColumnsToEnsure as $col => $definition) {
                if (!in_array(strtolower($col), $existingModColumns)) {
                    $conn->query("ALTER TABLE `modules` ADD COLUMN `$col` $definition");
                }
            }
        }
    } catch (Exception $e) {
        // Silent catch for resilience
    }
}

// Helper to sync resources into the user_resources table using lesson_id
function syncLessonResourcesTable($conn, $lessonId, $resources) {
    if (!$conn || !($conn instanceof mysqli) || empty($lessonId)) return;
    try {
        $rawArray = [];
        if (is_array($resources)) {
            $rawArray = $resources;
        } else if (is_string($resources) && !empty($resources)) {
            $rawArray = json_decode($resources, true) ?? [];
        }

        if (!is_array($rawArray)) return;

        $escapedLessonId = $conn->real_escape_string($lessonId);

        foreach ($rawArray as $res) {
            if (empty($res)) continue;
            $resId = $conn->real_escape_string(!empty($res['id']) ? $res['id'] : 'res-' . round(microtime(true) * 1000) . '-' . rand(10, 99));
            $resName = $conn->real_escape_string($res['name'] ?? ($res['filename'] ?? 'Resource File'));
            $resUrl = $conn->real_escape_string($res['url'] ?? '');
            $resPath = $conn->real_escape_string($res['file_path'] ?? $resUrl);
            $resFileType = $conn->real_escape_string($res['fileType'] ?? ($res['file_type'] ?? ($res['type'] ?? 'pdf')));
            $resSize = intval($res['file_size'] ?? ($res['fileSize'] ?? 0));
            $now = date('Y-m-d H:i:s');

            if (!empty($resUrl)) {
                // Link this resource to the lesson in user_resources
                $conn->query("UPDATE `user_resources` SET `lesson_id` = '$escapedLessonId', `filename` = '$resName' WHERE `id` = '$resId' OR `url` = '$resUrl'");
                if ($conn->affected_rows === 0) {
                    $conn->query("INSERT INTO `user_resources` (`id`, `user_id`, `lesson_id`, `filename`, `url`, `file_path`, `file_type`, `file_size`, `created_at`) 
                                  VALUES ('$resId', 'instructor_user', '$escapedLessonId', '$resName', '$resUrl', '$resPath', '$resFileType', $resSize, '$now')");
                }
            }
        }
    } catch (Exception $e) {
        // Silent catch
    }
}

if (isset($conn) && $conn instanceof mysqli) {
    ensureLessonSchemaAndResourcesTable($conn);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? ($_GET['action'] ?? '');

// ==========================================
// GET: Fetch modules & lessons for a course
// ==========================================
if ($method === 'GET') {
    if (empty($_GET['course_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Course ID is required"]);
        exit();
    }

    $courseId = $conn->real_escape_string($_GET['course_id']);
    
    // Fetch Modules
    $modulesRes = $conn->query("SELECT * FROM modules WHERE course_id = '$courseId' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY order_index ASC");
    $modules = [];
    
    if ($modulesRes && $modulesRes->num_rows > 0) {
        while ($mod = $modulesRes->fetch_assoc()) {
            $modId = $mod['id'];
            $mod['lessons'] = [];
            
            // Fetch Lessons for this module
            $lessonsRes = $conn->query("SELECT * FROM lessons WHERE module_id = '$modId' ORDER BY order_index ASC");
            if ($lessonsRes && $lessonsRes->num_rows > 0) {
                while ($les = $lessonsRes->fetch_assoc()) {
                    $lesId = $les['id'];
                    // Convert types
                    $les['isPreview'] = (bool)$les['is_preview'];
                    $les['videoUrl'] = $les['video_url'];
                    $les['videoPath'] = $les['video_path'] ?? '';
                    $les['labUrl'] = $les['lab_url'] ?? '';
                    $les['labTitle'] = $les['lab_title'] ?? '';
                    $les['description'] = $les['description'] ?? '';

                    // Fetch associated resources from user_resources table first
                    $rRes = $conn->query("SELECT * FROM user_resources WHERE lesson_id = '$lesId' ORDER BY created_at ASC");
                    $relResources = [];
                    if ($rRes && $rRes->num_rows > 0) {
                        while ($rRow = $rRes->fetch_assoc()) {
                            $fSize = !empty($rRow['file_size']) ? (round($rRow['file_size'] / (1024 * 1024), 2) . ' MB') : 'Attached';
                            $relResources[] = [
                                'id' => $rRow['id'],
                                'name' => $rRow['filename'],
                                'filename' => $rRow['filename'],
                                'type' => $rRow['file_type'],
                                'fileType' => $rRow['file_type'],
                                'url' => $rRow['url'],
                                'file_path' => $rRow['file_path'],
                                'fileSize' => $fSize
                            ];
                        }
                    }

                    if (!empty($relResources)) {
                        $les['resources'] = $relResources;
                    } else {
                        $les['resources'] = !empty($les['resources']) ? json_decode($les['resources'], true) : [];
                    }

                    unset($les['is_preview'], $les['video_url'], $les['video_path'], $les['lab_url'], $les['lab_title']);
                    $mod['lessons'][] = $les;
                }
            }
            $modules[] = $mod;
        }
    }

    echo json_encode(["success" => true, "data" => $modules]);
    exit();
}

// ==========================================
// POST / PUT: Actions
// ==========================================
if ($method === 'POST' || $method === 'PUT') {
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
        exit();
    }

    // 1. UPDATE TITLE ONLY (Specific Action)
    if ($action === 'update_title') {
        $id = $conn->real_escape_string($input['id'] ?? '');
        $title = $conn->real_escape_string(trim($input['title'] ?? ''));

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Module ID is required"]);
            exit();
        }

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Section title cannot be empty"]);
            exit();
        }

        $query = "UPDATE modules 
                  SET title = '$title', updated_at = NOW() 
                  WHERE id = '$id' AND (is_deleted = 0 OR is_deleted IS NULL)";
        
        if ($conn->query($query)) {
            echo json_encode([
                "success" => true,
                "message" => "Section title updated successfully",
                "data" => [
                    "id" => $id,
                    "title" => $title,
                    "updated_at" => date('Y-m-d H:i:s')
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
        }
        exit();
    }

    // 2. UPSERT / ADD MODULE
    if ($action === 'upsert_module' || $action === 'add_module') {
        $id = !empty($input['id']) ? $conn->real_escape_string($input['id']) : 'mod-' . round(microtime(true) * 1000) . '-' . rand(100, 999);
        $courseId = $conn->real_escape_string($input['course_id'] ?? ($input['courseId'] ?? ''));
        $title = $conn->real_escape_string(trim($input['title'] ?? 'New Section'));
        $description = $conn->real_escape_string($input['description'] ?? '');
        $orderIndex = intval($input['order_index'] ?? ($input['orderIndex'] ?? 0));

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "course_id is required"]);
            exit();
        }

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Section title cannot be empty"]);
            exit();
        }

        // Ensure course exists (create stub if missing to satisfy foreign key)
        $courseCheck = $conn->query("SELECT id FROM courses WHERE id = '$courseId'");
        if ($courseCheck && $courseCheck->num_rows === 0) {
            $conn->query("INSERT INTO courses (id, title, is_published) VALUES ('$courseId', 'Untitled Course', 0)");
        }

        $query = "INSERT INTO modules (id, course_id, title, description, order_index, created_at, updated_at, is_deleted) 
                  VALUES ('$id', '$courseId', '$title', '$description', $orderIndex, NOW(), NOW(), 0)
                  ON DUPLICATE KEY UPDATE 
                  title = '$title', 
                  description = '$description', 
                  order_index = $orderIndex, 
                  updated_at = NOW(),
                  is_deleted = 0";
        
        if ($conn->query($query)) {
            // Save associated lessons if provided
            if (!empty($input['lessons']) && is_array($input['lessons'])) {
                foreach ($input['lessons'] as $lIdx => $l) {
                    $lesId = !empty($l['id']) ? $conn->real_escape_string($l['id']) : 'les-' . round(microtime(true) * 1000) . '-' . $lIdx;
                    $lesTitle = $conn->real_escape_string($l['title'] ?? 'Lesson ' . ($lIdx + 1));
                    $lesDur = $conn->real_escape_string($l['duration'] ?? '10:00');
                    $lesType = $conn->real_escape_string($l['type'] ?? 'video');
                    $lesVid = $conn->real_escape_string($l['videoUrl'] ?? ($l['video_url'] ?? ''));
                    $lesVidPath = $conn->real_escape_string($l['videoPath'] ?? ($l['video_path'] ?? ''));
                    $lesContent = $conn->real_escape_string($l['content'] ?? '');
                    $lesPrev = !empty($l['isPreview']) ? 1 : 0;
                    $resRaw = $l['resources'] ?? null;
                    $lesResources = $conn->real_escape_string(is_array($resRaw) ? json_encode($resRaw) : (is_string($resRaw) ? $resRaw : '[]'));
                    
                    $lQuery = "INSERT INTO lessons (id, module_id, title, duration, type, video_url, video_path, content, is_preview, resources, order_index)
                                  VALUES ('$lesId', '$id', '$lesTitle', '$lesDur', '$lesType', '$lesVid', '$lesVidPath', '$lesContent', $lesPrev, '$lesResources', $lIdx)
                                  ON DUPLICATE KEY UPDATE 
                                  title = '$lesTitle', duration = '$lesDur', type = '$lesType', video_url = '$lesVid', video_path = '$lesVidPath', 
                                  content = '$lesContent', is_preview = $lesPrev, resources = '$lesResources', order_index = $lIdx";
                    if ($conn->query($lQuery)) {
                        syncLessonResourcesTable($conn, $lesId, $l['resources'] ?? []);
                    }
                }
            }
            echo json_encode([
                "success" => true, 
                "message" => "Section and curriculum saved successfully", 
                "data" => [
                    "id" => $id,
                    "course_id" => $courseId,
                    "title" => $title,
                    "description" => $description,
                    "order_index" => $orderIndex,
                    "updated_at" => date('Y-m-d H:i:s')
                ], 
                "moduleId" => $id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
        }
        exit();
    }

    // 2. UPSERT LESSON
    if ($action === 'upsert_lesson') {
        $id = !empty($input['id']) ? $conn->real_escape_string($input['id']) : 'les-' . round(microtime(true) * 1000) . '-' . rand(100, 999);
        $moduleId = $conn->real_escape_string($input['module_id'] ?? '');
        $title = $conn->real_escape_string($input['title'] ?? 'New Lesson');
        $duration = $conn->real_escape_string($input['duration'] ?? '10:00');
        $type = $conn->real_escape_string($input['type'] ?? 'video');
        $videoUrl = $conn->real_escape_string($input['videoUrl'] ?? '');
        $videoPath = $conn->real_escape_string($input['videoPath'] ?? '');
        $content = $conn->real_escape_string($input['content'] ?? '');
        $isPreview = !empty($input['isPreview']) ? 1 : 0;
        $resInputRaw = $input['resources'] ?? null;
        $resources = $conn->real_escape_string(is_array($resInputRaw) ? json_encode($resInputRaw) : (is_string($resInputRaw) ? $resInputRaw : '[]'));
        $orderIndex = intval($input['order_index'] ?? 0);

        if (empty($moduleId)) {
            echo json_encode(["success" => false, "message" => "module_id is required"]);
            exit();
        }

        $query = "INSERT INTO lessons (id, module_id, title, duration, type, video_url, video_path, content, is_preview, resources, order_index)
                  VALUES ('$id', '$moduleId', '$title', '$duration', '$type', '$videoUrl', '$videoPath', '$content', $isPreview, '$resources', $orderIndex)
                  ON DUPLICATE KEY UPDATE 
                  title = '$title', duration = '$duration', type = '$type', video_url = '$videoUrl', video_path = '$videoPath', 
                  content = '$content', is_preview = $isPreview, resources = '$resources', order_index = $orderIndex";
        
        if ($conn->query($query)) {
            syncLessonResourcesTable($conn, $id, $input['resources'] ?? []);
            echo json_encode(["success" => true, "message" => "Lesson saved", "data" => ["id" => $id], "lessonId" => $id]);
        } else {
            echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
        }
        exit();
    }

    // 3. REORDER MODULES OR LESSONS
    if ($action === 'reorder') {
        $items = $input['items'] ?? []; // Array of [id => '...', order_index => 0]
        $type = $input['type'] ?? 'module'; // 'module' or 'lesson'
        $table = ($type === 'lesson') ? 'lessons' : 'modules';

        if (!empty($items)) {
            $conn->begin_transaction();
            try {
                foreach ($items as $item) {
                    $id = $conn->real_escape_string($item['id']);
                    $order = intval($item['order_index']);
                    $conn->query("UPDATE $table SET order_index = $order WHERE id = '$id'");
                }
                $conn->commit();
                echo json_encode(["success" => true, "message" => "Reordered successfully"]);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(["success" => false, "message" => "Error during reordering"]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "No items provided"]);
        }
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown POST action"]);
    exit();
}

// ==========================================
// DELETE: Delete module or lesson
// ==========================================
if ($method === 'DELETE') {
    $action = $_GET['action'] ?? '';
    $id = $conn->real_escape_string($_GET['id'] ?? '');

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID is required for deletion"]);
        exit();
    }

    if ($action === 'delete_module') {
        $conn->query("UPDATE modules SET is_deleted = 1, deleted_at = NOW(), updated_at = NOW() WHERE id = '$id'");
        $conn->query("UPDATE lessons SET is_deleted = 1, deleted_at = NOW() WHERE module_id = '$id'");
        echo json_encode(["success" => true, "message" => "Section deleted successfully"]);
        exit();
    }

    if ($action === 'delete_lesson') {
        $conn->query("DELETE FROM lessons WHERE id = '$id'");
        echo json_encode(["success" => true, "message" => "Lesson deleted"]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown DELETE action"]);
    exit();
}

echo json_encode(["success" => false, "message" => "Method not allowed"]);
