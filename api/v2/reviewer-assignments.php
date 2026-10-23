<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API to Fetch Reviewer Course Assignments
 * Path: /api/v2/reviewer-assignments.php
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    $reviewer_id = trim($_GET['reviewer_id'] ?? $_GET['reviewerId'] ?? '');

    if (empty($reviewer_id)) {
        echo json_encode(["success" => true, "assignments" => [], "courses" => [], "message" => "No reviewer ID provided"]);
        exit;
    }

    // Prepare self-healing lookup
    $query = "SELECT ra.*, c.title, c.subtitle, c.thumbnail, c.image, c.category, c.price, c.level, c.instructor, c.status AS course_status
              FROM reviewer_assignments ra
              LEFT JOIN courses c ON ra.course_id = c.id
              WHERE ra.reviewer_id = ? OR LOWER(ra.reviewer_email) = LOWER(?)";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        // Table may not exist yet if no assignments have been made
        echo json_encode(["success" => true, "assignments" => [], "courses" => []]);
        exit;
    }

    $stmt->bind_param("ss", $reviewer_id, $reviewer_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $assignments = [];
    $courses = [];

    while ($row = $res->fetch_assoc()) {
        $assignments[] = [
            "id" => $row['id'],
            "course_id" => $row['course_id'],
            "courseId" => $row['course_id'],
            "reviewer_id" => $row['reviewer_id'],
            "reviewerId" => $row['reviewer_id'],
            "reviewer_name" => $row['reviewer_name'],
            "reviewerName" => $row['reviewer_name'],
            "reviewer_email" => $row['reviewer_email'],
            "reviewerEmail" => $row['reviewer_email'],
            "assigned_at" => $row['assigned_at']
        ];

        if (!empty($row['course_id']) && !empty($row['title'])) {
            $courses[] = [
                "id" => $row['course_id'],
                "title" => $row['title'],
                "subtitle" => $row['subtitle'] ?? '',
                "thumbnail" => $row['thumbnail'] ?? $row['image'] ?? '',
                "image" => $row['image'] ?? $row['thumbnail'] ?? '',
                "category" => $row['category'] ?? '',
                "price" => floatval($row['price'] ?? 0),
                "level" => $row['level'] ?? 'All Levels',
                "instructor" => $row['instructor'] ?? '',
                "status" => $row['course_status'] ?? 'pending'
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        "success" => true,
        "assignments" => $assignments,
        "courses" => $courses
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
