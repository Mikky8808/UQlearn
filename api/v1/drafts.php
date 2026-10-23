<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Drafts API Endpoint - API v1
 * Path: /api/v1/drafts.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $userId = isset($_GET['user_id']) ? trim($_GET['user_id']) : (isset($_GET['userId']) ? trim($_GET['userId']) : '');
        $whereSql = "WHERE (is_published = 0 OR is_published IS NULL) AND (is_deleted IS NULL OR is_deleted = 0) AND deleted_at IS NULL";
        
        if (!empty($userId)) {
            $userSafe = $conn->real_escape_string($userId);
            $whereSql .= " AND (created_by = '$userSafe' OR instructor = '$userSafe')";
        }

        $query = "SELECT c.*, 
                  (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as modules_count,
                  (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as lessons_count
                  FROM courses c 
                  $whereSql 
                  ORDER BY updated_at DESC";

        $result = $conn->query($query);
        
        $drafts = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                // Calculate realistic completion %
                $completion = 10;
                if (!empty($row['title']) && $row['title'] !== 'Untitled Course') $completion += 20;
                if (!empty($row['description'])) $completion += 20;
                if (!empty($row['image'])) $completion += 20;
                if ((int)($row['modules_count'] ?? 0) > 0) $completion += 15;
                if ((int)($row['lessons_count'] ?? 0) > 0) $completion += 15;

                $drafts[] = [
                    'id' => $row['id'],
                    'title' => $row['title'] ?? 'Untitled Draft',
                    'subtitle' => $row['subtitle'] ?? '',
                    'category' => $row['category'] ?? 'Development',
                    'level' => $row['level'] ?? 'Beginner',
                    'price' => (float)($row['price'] ?? 0),
                    'image' => $row['image'] ?? '',
                    'last_edited' => $row['updated_at'] ?? $row['created_at'],
                    'lastEdited' => $row['updated_at'] ?? $row['created_at'],
                    'modules_count' => (int)($row['modules_count'] ?? 0),
                    'modulesCount' => (int)($row['modules_count'] ?? 0),
                    'lessons_count' => (int)($row['lessons_count'] ?? 0),
                    'lessonsCount' => (int)($row['lessons_count'] ?? 0),
                    'completion' => min(100, $completion)
                ];
            }
        }
        echo json_encode(["success" => true, "data" => $drafts]);
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Drafts API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
