<?php
require_once __DIR__ . '/cors.php';
/**
 * Course Deletion & Soft-Delete Endpoint
 * LMS Platform - API v1
 * 
 * Path: /api/v1/delete-course.php (or /api/v1/delete-course via .htaccess)
 * 
 * Supports:
 * - Soft Delete (default): sets is_deleted = 1, deleted_at = NOW()
 * - Restore: sets is_deleted = 0, deleted_at = NULL
 * - Permanent Delete: DELETE FROM courses WHERE id = ? (if permanent=true)
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure soft-delete columns exist in courses table
    $delColCheck = $conn->query("SHOW COLUMNS FROM courses LIKE 'deleted_at'");
    if ($delColCheck && $delColCheck->num_rows === 0) {
        @$conn->query("ALTER TABLE courses ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at");
        @$conn->query("ALTER TABLE courses ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER deleted_at");
        @$conn->query("ALTER TABLE courses ADD INDEX idx_is_deleted (is_deleted)");
    }

    // Parse request payload from JSON or Query Parameters
    $method = $_SERVER['REQUEST_METHOD'];
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];

    $courseId = $_GET['id'] ?? ($_GET['course_id'] ?? ($input['id'] ?? ($input['course_id'] ?? '')));
    $action = strtolower(trim($_GET['action'] ?? ($input['action'] ?? 'soft_delete')));
    $isPermanent = (isset($_GET['permanent']) && in_array(strtolower($_GET['permanent']), ['1', 'true', 'yes'])) ||
                   (!empty($input['permanent']) && ($input['permanent'] === true || $input['permanent'] === 'true' || $input['permanent'] === 1));

    // If action is explicitly set to permanent_delete or force_delete
    if (in_array($action, ['permanent_delete', 'force_delete', 'hard_delete', 'destroy'])) {
        $isPermanent = true;
    }

    if (empty($courseId)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Course ID is required. Pass 'id' or 'course_id' in URL query or JSON body.",
            "usage" => [
                "soft_delete" => "POST /api/v1/delete-course with {\"id\": \"course-123\"} or DELETE /api/v1/courses?id=course-123",
                "restore" => "POST /api/v1/delete-course with {\"id\": \"course-123\", \"action\": \"restore\"}",
                "permanent_delete" => "POST /api/v1/delete-course with {\"id\": \"course-123\", \"permanent\": true}"
            ]
        ], JSON_PRETTY_PRINT);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    $escapedId = $conn->real_escape_string(trim($courseId));

    // Check if course exists in MySQL
    $checkSql = "SELECT id, title, instructor, is_deleted, deleted_at FROM courses WHERE id = '$escapedId'";
    $checkRes = $conn->query($checkSql);

    if (!$checkRes || $checkRes->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Course with ID '$courseId' was not found in database.",
            "courseId" => $courseId
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    $course = $checkRes->fetch_assoc();

    // ============================================================================
    // 1. ACTION: RESTORE
    // ============================================================================
    if ($action === 'restore' || $action === 'undelete' || $action === 'unarchive') {
        $restoreSql = "UPDATE courses SET is_deleted = 0, deleted_at = NULL WHERE id = '$escapedId'";
        $restoreRes = $conn->query($restoreSql);

        if ($restoreRes) {
            echo json_encode([
                "success" => true,
                "message" => "Course '{$course['title']}' was successfully restored from trash.",
                "courseId" => $courseId,
                "title" => $course['title'],
                "action" => "restore",
                "isDeleted" => false,
                "deletedAt" => null,
                "timestamp" => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to restore course: " . $conn->error
            ]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // ============================================================================
    // 2. ACTION: PERMANENT HARD DELETE
    // ============================================================================
    if ($isPermanent) {
        // Delete cascading modules, lessons and outcomes
        @$conn->query("DELETE FROM learning_outcomes WHERE course_id = '$escapedId'");
        $modRes = $conn->query("SELECT id FROM modules WHERE course_id = '$escapedId'");
        if ($modRes) {
            while ($m = $modRes->fetch_assoc()) {
                $mId = $m['id'];
                $conn->query("DELETE FROM lessons WHERE module_id = '$mId'");
            }
            $conn->query("DELETE FROM modules WHERE course_id = '$escapedId'");
        }

        $delSql = "DELETE FROM courses WHERE id = '$escapedId'";
        $delRes = $conn->query($delSql);

        if ($delRes) {
            echo json_encode([
                "success" => true,
                "message" => "Course '{$course['title']}' permanently removed from database.",
                "courseId" => $courseId,
                "title" => $course['title'],
                "action" => "permanent_delete",
                "timestamp" => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to permanently delete course: " . $conn->error
            ]);
        }
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    // ============================================================================
    // 3. ACTION: SOFT DELETE (DEFAULT)
    // ============================================================================
    $softSql = "UPDATE courses SET is_deleted = 1, deleted_at = NOW() WHERE id = '$escapedId'";
    $softRes = $conn->query($softSql);

    if ($softRes) {
        echo json_encode([
            "success" => true,
            "message" => "Course '{$course['title']}' was soft-deleted successfully.",
            "courseId" => $courseId,
            "title" => $course['title'],
            "action" => "soft_delete",
            "isDeleted" => true,
            "deletedAt" => date('Y-m-d H:i:s'),
            "recoveryHint" => "To restore this course, call /api/v1/delete-course with action='restore' or PUT /api/v1/courses with action='restore'."
        ], JSON_PRETTY_PRINT);
    } else {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to soft-delete course: " . $conn->error
        ]);
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error in delete-course: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
