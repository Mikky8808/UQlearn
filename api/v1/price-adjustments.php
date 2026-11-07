<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Price Adjustment Notices & Overpriced Course Audits
 * Compatible with Shared Hosting (PHP 7.4+)
 * Path: /api/v1/price-adjustments.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    // Centralized database connection
    require_once __DIR__ . '/db.php';

    // Auto-create price_adjustments table if it doesn't exist
    $table_check_sql = "CREATE TABLE IF NOT EXISTS `price_adjustments` (
      `id` VARCHAR(64) PRIMARY KEY,
      `course_id` VARCHAR(64) NOT NULL,
      `course_title` VARCHAR(255) NOT NULL,
      `course_thumbnail` TEXT DEFAULT NULL,
      `instructor_name` VARCHAR(150) NOT NULL,
      `instructor_email` VARCHAR(191) DEFAULT NULL,
      `category` VARCHAR(100) DEFAULT 'Development',
      `type` VARCHAR(50) DEFAULT 'price_adjustment',
      `title` VARCHAR(255) NOT NULL,
      `message` LONGTEXT NOT NULL,
      `current_price` DECIMAL(10,2) NOT NULL,
      `suggested_price` DECIMAL(10,2) NOT NULL,
      `flag_reason` TEXT DEFAULT NULL,
      `status` ENUM('pending', 'accepted', 'declined', 'dismissed') DEFAULT 'pending',
      `is_read` TINYINT(1) DEFAULT 0,
      `reminder_sent_at` DATETIME DEFAULT NULL,
      `resolved_at` DATETIME DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY `idx_price_adj_course` (`course_id`),
      KEY `idx_price_adj_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($table_check_sql);

    // Clean up old mock data
    @$conn->query("DELETE FROM price_adjustments WHERE course_id LIKE 'c-%'");

    // Seed mock data using REAL courses if table is empty
    $count_res = @$conn->query("SELECT COUNT(*) as count FROM price_adjustments");
    $count_row = $count_res ? $count_res->fetch_assoc() : null;
    if ($count_row && $count_row['count'] == 0) {
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
                $id = 'notif-price-' . $c['id'];
                $course_id = $c['id'];
                $course_title = $c['title'] ?? 'Course Title';
                $course_thumbnail = $c['thumbnail'] ?? '';
                $instructor_name = $c['created_by_name'] ?? 'Instructor';
                $instructor_email = $c['created_by_email'] ?? 'instructor@uqlearn.org';
                $category = $c['category'] ?? 'General';
                $type = 'price_adjustment';
                $title = 'Price Adjustment Notice: ' . $course_title;
                $message = "Hello $instructor_name,\n\nWe recommend adjusting the price of this course to optimize learner enrollment conversion and qualify for platform showcase placement.";
                $current_price = (float)($c['price'] ?? 100);
                $suggested_price = round($current_price * 0.7, 2);
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

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    $id = $_GET['id'] ?? $data['id'] ?? null;
    $status = $_GET['status'] ?? null;
    $course_id = $_GET['course_id'] ?? null;

    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM price_adjustments WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $res = $stmt->get_result();
                $item = $res->fetch_assoc();
                $stmt->close();
                if ($item) {
                    echo json_encode(["success" => true, "data" => formatRow($item)]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Notice not found"]);
                }
            } else {
                $where = [];
                $params = [];
                $types = "";

                if ($status && in_array($status, ['pending', 'accepted', 'declined', 'dismissed'])) {
                    $where[] = "status = ?";
                    $params[] = $status;
                    $types .= "s";
                }

                if ($course_id) {
                    $where[] = "course_id = ?";
                    $params[] = $course_id;
                    $types .= "s";
                }

                $query = "SELECT * FROM price_adjustments";
                if (!empty($where)) {
                    $query .= " WHERE " . implode(" AND ", $where);
                }
                $query .= " ORDER BY created_at DESC";

                if (!empty($params)) {
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $result = $stmt->get_result();
                } else {
                    $result = $conn->query($query);
                }

                $list = [];
                if ($result) {
                    while ($row = $result->fetch_assoc()) {
                        $list[] = formatRow($row);
                    }
                }
                echo json_encode(["success" => true, "data" => $list, "count" => count($list)]);
            }
            break;

        case 'POST':
            $notice_id = $data['id'] ?? 'notif-price-' . time() . '-' . rand(100, 999);
            $c_id = $data['courseId'] ?? $data['course_id'] ?? '';
            $c_title = $data['courseTitle'] ?? $data['course_title'] ?? 'Untitled Course';
            $c_thumb = $data['courseThumbnail'] ?? $data['course_thumbnail'] ?? '';
            $inst_name = $data['instructorName'] ?? $data['instructor_name'] ?? 'Course Instructor';
            $inst_email = $data['instructorEmail'] ?? $data['instructor_email'] ?? '';
            $cat = $data['category'] ?? 'Development';
            $type = $data['type'] ?? 'price_adjustment';
            $title = $data['title'] ?? ('Price Adjustment Notice: ' . $c_title);
            $msg = $data['message'] ?? '';
            $curr_price = floatval($data['currentPrice'] ?? $data['current_price'] ?? 0);
            $sugg_price = floatval($data['suggestedPrice'] ?? $data['suggested_price'] ?? 0);
            $reason = $data['flagReason'] ?? $data['flag_reason'] ?? '';
            $stat = $data['status'] ?? 'pending';
            $is_read = !empty($data['read']) || !empty($data['is_read']) ? 1 : 0;

            if (empty($c_id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Course ID is required"]);
                exit();
            }

            $stmt = $conn->prepare("REPLACE INTO price_adjustments 
                (id, course_id, course_title, course_thumbnail, instructor_name, instructor_email, category, type, title, message, current_price, suggested_price, flag_reason, status, is_read) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->bind_param("ssssssssssddssi", 
                $notice_id, $c_id, $c_title, $c_thumb, $inst_name, $inst_email, $cat, $type, $title, $msg, 
                $curr_price, $sugg_price, $reason, $stat, $is_read
            );

            if ($stmt->execute()) {
                $stmt->close();
                echo json_encode([
                    "success" => true, 
                    "message" => "Price adjustment notice created successfully",
                    "id" => $notice_id,
                    "data" => [
                        "id" => $notice_id,
                        "courseId" => $c_id,
                        "courseTitle" => $c_title,
                        "courseThumbnail" => $c_thumb,
                        "instructorName" => $inst_name,
                        "instructorEmail" => $inst_email,
                        "category" => $cat,
                        "type" => $type,
                        "title" => $title,
                        "message" => $msg,
                        "currentPrice" => $curr_price,
                        "suggestedPrice" => $sugg_price,
                        "flagReason" => $reason,
                        "status" => $stat,
                        "read" => (bool)$is_read,
                        "createdAt" => date('c')
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Failed to save notice: " . $stmt->error]);
            }
            break;

        case 'PUT':
        case 'PATCH':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Notice ID is required"]);
                exit();
            }

            $action = $data['action'] ?? null;
            $new_status = $data['status'] ?? null;
            $is_read = isset($data['read']) ? ($data['read'] ? 1 : 0) : (isset($data['is_read']) ? ($data['is_read'] ? 1 : 0) : null);

            // Handle actions: accept, decline, dismiss, resend
            if ($action === 'accept') {
                $new_status = 'accepted';
                $resolved_at = date('Y-m-d H:i:s');
                
                // Fetch notice to get course_id and suggested_price
                $fetch_stmt = $conn->prepare("SELECT course_id, suggested_price FROM price_adjustments WHERE id = ?");
                $fetch_stmt->bind_param("s", $id);
                $fetch_stmt->execute();
                $n_res = $fetch_stmt->get_result()->fetch_assoc();
                $fetch_stmt->close();

                if ($n_res && !empty($n_res['course_id']) && floatval($n_res['suggested_price']) > 0) {
                    $new_p = floatval($n_res['suggested_price']);
                    $cid = $n_res['course_id'];
                    // Update course in courses table
                    @$conn->query("UPDATE courses SET price = $new_p WHERE id = '$cid'");
                }

                $stmt = $conn->prepare("UPDATE price_adjustments SET status = 'accepted', resolved_at = NOW(), is_read = 1 WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();

                echo json_encode(["success" => true, "message" => "Price adjustment accepted and course price updated", "status" => "accepted"]);
                exit();
            } elseif ($action === 'decline') {
                $stmt = $conn->prepare("UPDATE price_adjustments SET status = 'declined', resolved_at = NOW() WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Price adjustment marked as declined", "status" => "declined"]);
                exit();
            } elseif ($action === 'dismiss') {
                $stmt = $conn->prepare("UPDATE price_adjustments SET status = 'dismissed', resolved_at = NOW() WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Price adjustment dismissed", "status" => "dismissed"]);
                exit();
            } elseif ($action === 'resend') {
                $stmt = $conn->prepare("UPDATE price_adjustments SET reminder_sent_at = NOW(), status = 'pending', is_read = 0 WHERE id = ?");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $stmt->close();
                echo json_encode(["success" => true, "message" => "Reminder notice dispatched to instructor"]);
                exit();
            }

            // General update
            $updates = [];
            $params = [];
            $types = "";

            if ($new_status) {
                $updates[] = "status = ?";
                $params[] = $new_status;
                $types .= "s";
            }
            if ($is_read !== null) {
                $updates[] = "is_read = ?";
                $params[] = $is_read;
                $types .= "i";
            }
            if (isset($data['suggestedPrice'])) {
                $updates[] = "suggested_price = ?";
                $params[] = floatval($data['suggestedPrice']);
                $types .= "d";
            }

            if (!empty($updates)) {
                $params[] = $id;
                $types .= "s";
                $stmt = $conn->prepare("UPDATE price_adjustments SET " . implode(", ", $updates) . " WHERE id = ?");
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $stmt->close();
            }

            echo json_encode(["success" => true, "message" => "Notice updated successfully"]);
            break;

        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Notice ID is required"]);
                exit();
            }
            $stmt = $conn->prepare("DELETE FROM price_adjustments WHERE id = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["success" => true, "message" => "Notice removed successfully"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Method not allowed"]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}

function formatRow($row) {
    return [
        'id' => $row['id'],
        'courseId' => $row['course_id'],
        'course_id' => $row['course_id'],
        'courseTitle' => $row['course_title'],
        'course_title' => $row['course_title'],
        'courseThumbnail' => $row['course_thumbnail'],
        'course_thumbnail' => $row['course_thumbnail'],
        'instructorName' => $row['instructor_name'],
        'instructor_name' => $row['instructor_name'],
        'instructorEmail' => $row['instructor_email'],
        'instructor_email' => $row['instructor_email'],
        'category' => $row['category'],
        'type' => $row['type'],
        'title' => $row['title'],
        'message' => $row['message'],
        'currentPrice' => floatval($row['current_price']),
        'current_price' => floatval($row['current_price']),
        'suggestedPrice' => floatval($row['suggested_price']),
        'suggested_price' => floatval($row['suggested_price']),
        'flagReason' => $row['flag_reason'],
        'flag_reason' => $row['flag_reason'],
        'status' => $row['status'],
        'read' => (bool)$row['is_read'],
        'is_read' => (int)$row['is_read'],
        'reminderSentAt' => $row['reminder_sent_at'],
        'reminder_sent_at' => $row['reminder_sent_at'],
        'resolvedAt' => $row['resolved_at'],
        'resolved_at' => $row['resolved_at'],
        'createdAt' => $row['created_at'],
        'created_at' => $row['created_at']
    ];
}
