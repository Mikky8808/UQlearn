<?php
require_once __DIR__ . '/cors.php';
/**
 * Review Appeals & $0.55 Administrative Fee API
 * Path: /api/v1/review-appeals.php
 * Handles instructor review appeals, $0.55 fee tracking, and independent reviewer decisions.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
header("Content-Type: application/json; charset=UTF-8");

try {
    require_once __DIR__ . '/db.php';

    // Auto-create review_appeals table if not exists
    $conn->query("CREATE TABLE IF NOT EXISTS `review_appeals` (
        `id` VARCHAR(100) NOT NULL PRIMARY KEY,
        `review_id` VARCHAR(100) NOT NULL,
        `course_id` VARCHAR(100) DEFAULT 'general_course',
        `course_title` VARCHAR(255) DEFAULT 'Enrolled Course',
        `instructor_name` VARCHAR(255) DEFAULT 'Course Instructor',
        `student_name` VARCHAR(255) DEFAULT 'Learner',
        `rating` INT DEFAULT 1,
        `feedback` TEXT DEFAULT NULL,
        `clause` TEXT NOT NULL,
        `evidence` TEXT DEFAULT NULL,
        `fee_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.55,
        `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
        `fee_status` VARCHAR(50) NOT NULL DEFAULT 'CHARGED_NON_REFUNDABLE',
        `review_status` VARCHAR(50) NOT NULL DEFAULT 'under_appeal',
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (`review_id`),
        INDEX (`course_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $review_id = $_GET['review_id'] ?? null;
        $course_id = $_GET['course_id'] ?? null;

        if ($review_id) {
            $stmt = $conn->prepare("SELECT * FROM review_appeals WHERE review_id = ? ORDER BY created_at DESC");
            $stmt->bind_param("s", $review_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $appeals = [];
            while ($row = $res->fetch_assoc()) {
                $appeals[] = $row;
            }
            $stmt->close();
            echo json_encode(["success" => true, "data" => $appeals]);
            exit();
        }

        if ($course_id) {
            $stmt = $conn->prepare("SELECT * FROM review_appeals WHERE course_id = ? ORDER BY created_at DESC");
            $stmt->bind_param("s", $course_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $appeals = [];
            while ($row = $res->fetch_assoc()) {
                $appeals[] = $row;
            }
            $stmt->close();
            echo json_encode(["success" => true, "data" => $appeals]);
            exit();
        }

        // Fetch all appeals ordered by latest first
        $res = $conn->query("SELECT * FROM review_appeals ORDER BY created_at DESC");
        $appeals = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $appeals[] = $row;
            }
        }

        echo json_encode(["success" => true, "data" => $appeals]);
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents('php://input');
        $data = json_decode($raw_input, true) ?? [];

        $action = $data['action'] ?? 'submit_appeal';

        if ($action === 'update_decision' || $action === 'update_appeal_status') {
            $appeal_id = $data['appeal_id'] ?? ($data['transaction_id'] ?? '');
            $review_id = $data['review_id'] ?? '';
            $decision = $data['decision'] ?? ($data['status'] ?? 'upheld');

            if (!$appeal_id && !$review_id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "appeal_id or review_id required"]);
                exit();
            }

            if ($appeal_id) {
                $stmt = $conn->prepare("UPDATE review_appeals SET review_status = ?, updated_at = NOW() WHERE id = ?");
                $stmt->bind_param("ss", $decision, $appeal_id);
                $stmt->execute();
                $stmt->close();
            } else if ($review_id) {
                $stmt = $conn->prepare("UPDATE review_appeals SET review_status = ?, updated_at = NOW() WHERE review_id = ?");
                $stmt->bind_param("ss", $decision, $review_id);
                $stmt->execute();
                $stmt->close();
            }

            // If decision is removed, delete from course_ratings table
            if ($decision === 'removed' && $review_id) {
                $stmt_del = $conn->prepare("DELETE FROM course_ratings WHERE id = ?");
                if ($stmt_del) {
                    $stmt_del->bind_param("s", $review_id);
                    $stmt_del->execute();
                    $stmt_del->close();
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Appeal decision updated successfully to {$decision}",
                "decision" => $decision
            ]);
            exit();
        }

        // Default Action: Submit Appeal
        $transaction_id = $data['transaction_id'] ?? ($data['id'] ?? ('APL-0.55-' . rand(10000, 99999)));
        $review_id = $data['review_id'] ?? ($data['reviewId'] ?? '');
        $course_id = $data['course_id'] ?? 'general_course';
        $course_title = $data['course_title'] ?? 'Enrolled Course';
        $instructor_name = $data['instructor_name'] ?? 'Course Instructor';
        $student_name = $data['student_name'] ?? 'Learner';
        $rating = intval($data['rating'] ?? 1);
        $feedback = $data['feedback'] ?? '';
        $clause = $data['clause'] ?? 'Section 3 Violation';
        $evidence = $data['evidence'] ?? '';
        $fee_amount = floatval($data['fee_amount'] ?? 0.55);
        $currency = $data['currency'] ?? 'USD';
        $fee_status = 'CHARGED_NON_REFUNDABLE';
        $review_status = 'under_appeal';

        if (!$review_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "review_id is required"]);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO review_appeals (id, review_id, course_id, course_title, instructor_name, student_name, rating, feedback, clause, evidence, fee_amount, currency, fee_status, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE review_status = VALUES(review_status), clause = VALUES(clause), evidence = VALUES(evidence), updated_at = NOW()");
        
        if ($stmt) {
            $stmt->bind_param("ssssssisssdsss", $transaction_id, $review_id, $course_id, $course_title, $instructor_name, $student_name, $rating, $feedback, $clause, $evidence, $fee_amount, $currency, $fee_status, $review_status);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Review appeal submitted successfully with $0.55 fee charged",
            "transaction_id" => $transaction_id,
            "status" => "under_appeal"
        ]);
        exit();
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $conn->prepare("DELETE FROM review_appeals WHERE id = ? OR review_id = ?");
            $stmt->bind_param("ss", $id, $id);
            $stmt->execute();
            $stmt->close();
        }
        echo json_encode(["success" => true, "message" => "Appeal record deleted"]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
