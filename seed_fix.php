<?php
require_once __DIR__ . '/db.php';
// Delete old mock price adjustments
@$conn->query("DELETE FROM price_adjustments WHERE course_id LIKE 'c-%'");

// Check if table is empty
$count_res = @$conn->query("SELECT COUNT(*) as count FROM price_adjustments");
$count_row = $count_res ? $count_res->fetch_assoc() : null;

if ($count_row && $count_row['count'] == 0) {
    // Fetch some real courses
    $courses_res = @$conn->query("SELECT * FROM courses LIMIT 3");
    $courses = [];
    if ($courses_res) {
        while ($row = $courses_res->fetch_assoc()) {
            $courses[] = $row;
        }
    }
    
    if (count($courses) > 0) {
        $stmt = $conn->prepare("INSERT IGNORE INTO price_adjustments (id, course_id, course_title, course_thumbnail, instructor_name, instructor_email, category, type, title, message, current_price, suggested_price, flag_reason, status, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $i = 1;
        foreach ($courses as $c) {
            $id = 'notif-price-' . $i;
            $course_id = $c['id'];
            $course_title = $c['title'] ?? 'Course Title';
            $course_thumbnail = $c['thumbnail'] ?? '';
            $instructor_name = $c['created_by_name'] ?? 'Instructor';
            $instructor_email = $c['created_by_email'] ?? 'instructor@uqlearn.org';
            $category = $c['category'] ?? 'General';
            $type = 'price_adjustment';
            $title = 'Price Adjustment Notice: ' . $course_title;
            $message = "Hello $instructor_name,\n\nWe recommend adjusting the price of this course.";
            $current_price = (float)($c['price'] ?? 100);
            $suggested_price = $current_price * 0.7; // 30% off
            $flag_reason = 'Price exceeds category benchmark median.';
            $status = 'pending';
            $is_read = 0;
            
            $stmt->bind_param("ssssssssssddssi", $id, $course_id, $course_title, $course_thumbnail, $instructor_name, $instructor_email, $category, $type, $title, $message, $current_price, $suggested_price, $flag_reason, $status, $is_read);
            $stmt->execute();
            $i++;
        }
        if ($stmt) $stmt->close();
    }
}
