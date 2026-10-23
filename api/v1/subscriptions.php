<?php
/**
 * UQlearn LMS - Subscriptions & Course Enrollments API Endpoint (mysqli optimized)
 * Database: uqlearno_lms
 * Table: subscriptions
 * Path: /api/v1/subscriptions.php
 */

require_once __DIR__ . '/cors.php';
// Enable Error Reporting for Debugging (Suppressed in JSON output)
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');

// Include Database Connection File (sets up $conn as a valid mysqli instance)
require_once __DIR__ . '/db.php';

if (!isset($conn) || !($conn instanceof mysqli)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection unavailable.'
    ]);
    exit();
}

// Ensure Table Exists
try {
    $conn->query("CREATE TABLE IF NOT EXISTS `subscriptions` (
      `id` varchar(64) NOT NULL,
      `student_id` varchar(64) NOT NULL,
      `student_name` varchar(150) NOT NULL,
      `student_email` varchar(191) NOT NULL,
      `course_id` varchar(64) NOT NULL,
      `course_title` varchar(255) NOT NULL,
      `course_price` decimal(10,2) NOT NULL DEFAULT 0.00,
      `original_amount` decimal(10,2) DEFAULT NULL,
      `original_currency` varchar(10) DEFAULT 'USD',
      `payment_method` varchar(30) NOT NULL DEFAULT 'manual',
      `transaction_code` varchar(100) NOT NULL,
      `status` enum('pending','active','rejected') NOT NULL DEFAULT 'pending',
      `enrolled_at` datetime DEFAULT current_timestamp(),
      `activated_at` datetime DEFAULT NULL,
      `activated_by` varchar(150) DEFAULT NULL,
      `notes` text DEFAULT NULL,
      `created_at` timestamp NULL DEFAULT current_timestamp(),
      `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `idx_sub_student` (`student_id`),
      KEY `idx_sub_course` (`course_id`),
      KEY `idx_sub_status` (`status`),
      KEY `idx_sub_txcode` (`transaction_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Fail-safe column addition if table already existed
    @$conn->query("ALTER TABLE `subscriptions` ADD COLUMN `original_amount` decimal(10,2) DEFAULT NULL");
    @$conn->query("ALTER TABLE `subscriptions` ADD COLUMN `original_currency` varchar(10) DEFAULT 'USD'");
} catch (Throwable $e) {
    // Table exists or creation error ignored
}

// Parse Request Body (JSON or Form POST)
$rawInput = file_get_contents('php://input');
$requestData = json_decode($rawInput, true);
if (!is_array($requestData)) {
    $requestData = $_POST;
}

$method = $_SERVER['REQUEST_METHOD'];

// Helper function to normalize DB row for frontend JSON output
function normalizeSubscriptionRow($row) {
    if (!$row) return null;
    $rawTitle = $row['course_title'] ?? '';
    $resolvedTitle = !empty($row['resolved_course_title']) && $row['resolved_course_title'] !== '0' 
        ? $row['resolved_course_title'] 
        : ((!empty($rawTitle) && $rawTitle !== '0') ? $rawTitle : ($row['course_id'] ?? 'Course Enrollment'));

    $normalizedPrice = (float)($row['course_price'] ?? 0);
    $origAmount = isset($row['original_amount']) && $row['original_amount'] !== null ? (float)$row['original_amount'] : null;
    $origCurrency = $row['original_currency'] ?? 'USD';

    return [
        'id' => (string)($row['id'] ?? ''),
        'studentId' => (string)($row['student_id'] ?? ''),
        'student_id' => (string)($row['student_id'] ?? ''),
        'studentName' => (string)($row['student_name'] ?? ''),
        'student_name' => (string)($row['student_name'] ?? ''),
        'studentEmail' => (string)($row['student_email'] ?? ''),
        'student_email' => (string)($row['student_email'] ?? ''),
        'courseId' => (string)($row['course_id'] ?? ''),
        'course_id' => (string)($row['course_id'] ?? ''),
        'courseTitle' => (string)$resolvedTitle,
        'course_title' => (string)$resolvedTitle,
        'coursePrice' => (float)$normalizedPrice,
        'course_price' => (float)$normalizedPrice,
        'originalAmount' => $origAmount,
        'original_amount' => $origAmount,
        'originalCurrency' => $origCurrency,
        'original_currency' => $origCurrency,
        'paymentMethod' => (string)($row['payment_method'] ?? 'manual'),
        'payment_method' => (string)($row['payment_method'] ?? 'manual'),
        'transactionCode' => (string)($row['transaction_code'] ?? ''),
        'transaction_code' => (string)($row['transaction_code'] ?? ''),
        'status' => (string)($row['status'] ?? 'pending'),
        'enrolledAt' => !empty($row['enrolled_at']) ? date('c', strtotime($row['enrolled_at'])) : date('c'),
        'enrolled_at' => $row['enrolled_at'] ?? date('Y-m-d H:i:s'),
        'activatedAt' => !empty($row['activated_at']) ? date('c', strtotime($row['activated_at'])) : null,
        'activated_at' => $row['activated_at'] ?? null,
        'activatedBy' => $row['activated_by'] ?? null,
        'activated_by' => $row['activated_by'] ?? null,
        'notes' => $row['notes'] ?? null,
        'createdAt' => $row['created_at'] ?? date('Y-m-d H:i:s'),
        'updatedAt' => $row['updated_at'] ?? date('Y-m-d H:i:s')
    ];
}

// -------------------------------------------------------------
// GET REQUEST HANDLER
// -------------------------------------------------------------
if ($method === 'GET') {
    $student_id = trim($_GET['student_id'] ?? $_GET['studentId'] ?? $_GET['user_id'] ?? $_GET['userId'] ?? '');
    $student_email = trim($_GET['student_email'] ?? $_GET['studentEmail'] ?? $_GET['email'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $id = trim($_GET['id'] ?? '');
    $course_id = trim($_GET['course_id'] ?? $_GET['courseId'] ?? '');

    $where = ["1=1"];
    $types = "";
    $params = [];

    if (!empty($id)) {
        $where[] = "s.`id` = ?";
        $types .= "s";
        $params[] = $id;
    }

    if (!empty($student_id) && !empty($student_email)) {
        $where[] = "(s.`student_id` = ? OR LOWER(s.`student_email`) = ?)";
        $types .= "ss";
        $params[] = $student_id;
        $params[] = strtolower($student_email);
    } elseif (!empty($student_id)) {
        $where[] = "(s.`student_id` = ? OR s.`student_email` = ?)";
        $types .= "ss";
        $params[] = $student_id;
        $params[] = $student_id;
    } elseif (!empty($student_email)) {
        $where[] = "LOWER(s.`student_email`) = ?";
        $types .= "s";
        $params[] = strtolower($student_email);
    }

    if (!empty($course_id)) {
        $where[] = "s.`course_id` = ?";
        $types .= "s";
        $params[] = $course_id;
    }

    if (!empty($status) && $status !== 'all') {
        $where[] = "s.`status` = ?";
        $types .= "s";
        $params[] = $status;
    }

    $sql = "SELECT s.*, COALESCE(NULLIF(NULLIF(s.course_title, ''), '0'), c.title, s.course_id, 'Course Enrollment') AS resolved_course_title 
            FROM `subscriptions` s 
            LEFT JOIN `courses` c ON c.id = s.course_id 
            WHERE " . implode(" AND ", $where) . " ORDER BY s.`enrolled_at` DESC, s.`id` DESC";

    try {
        $stmt = $conn->prepare($sql);
        if (count($params) > 0) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = normalizeSubscriptionRow($row);
        }

        echo json_encode([
            'success' => true,
            'count' => count($data),
            'data' => $data
        ]);
        exit();
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Query error: ' . $e->getMessage()
        ]);
        exit();
    }
}

// -------------------------------------------------------------
// POST REQUEST HANDLER
// -------------------------------------------------------------
if ($method === 'POST') {
    $action = $requestData['action'] ?? $_GET['action'] ?? 'create_subscription';

    // 1. Action: Activate Subscription
    if ($action === 'activate_subscription' || $action === 'activate') {
        $id = trim($requestData['subscriptionId'] ?? $requestData['id'] ?? '');
        $txCode = trim($requestData['verifiedTransactionCode'] ?? $requestData['transaction_code'] ?? $requestData['transactionCode'] ?? '');
        $activatedBy = trim($requestData['activatedByAdmin'] ?? $requestData['activated_by'] ?? 'System');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Subscription ID is required.']);
            exit();
        }

        try {
            if (!empty($txCode)) {
                $stmt = $conn->prepare("UPDATE `subscriptions` SET `status` = 'active', `activated_at` = NOW(), `activated_by` = ?, `transaction_code` = ? WHERE `id` = ?");
                $stmt->bind_param("sss", $activatedBy, $txCode, $id);
            } else {
                $stmt = $conn->prepare("UPDATE `subscriptions` SET `status` = 'active', `activated_at` = NOW(), `activated_by` = ? WHERE `id` = ?");
                $stmt->bind_param("ss", $activatedBy, $id);
            }
            $stmt->execute();

            // Fetch updated row
            $fetchStmt = $conn->prepare("SELECT * FROM `subscriptions` WHERE `id` = ? LIMIT 1");
            $fetchStmt->bind_param("s", $id);
            $fetchStmt->execute();
            $updated = $fetchStmt->get_result()->fetch_assoc();

            echo json_encode([
                'success' => true,
                'message' => 'Subscription activated successfully.',
                'data' => normalizeSubscriptionRow($updated)
            ]);
            exit();
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Activation error: ' . $e->getMessage()]);
            exit();
        }
    }

    // 2. Action: Reject Subscription
    if ($action === 'reject_subscription' || $action === 'reject') {
        $id = trim($requestData['subscriptionId'] ?? $requestData['id'] ?? '');
        $notes = trim($requestData['notes'] ?? 'Subscription rejected.');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Subscription ID is required.']);
            exit();
        }

        try {
            $stmt = $conn->prepare("UPDATE `subscriptions` SET `status` = 'rejected', `notes` = ? WHERE `id` = ?");
            $stmt->bind_param("ss", $notes, $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Subscription marked as rejected.'
            ]);
            exit();
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Rejection error: ' . $e->getMessage()]);
            exit();
        }
    }

    // 3. Action: Create / Insert Subscription Record
    $id = trim($requestData['id'] ?? '');
    if (empty($id)) {
        $id = 'sub_' . uniqid() . '_' . substr(md5(microtime()), 0, 5);
    }

    $studentId = trim($requestData['studentId'] ?? $requestData['student_id'] ?? '');
    $studentName = trim($requestData['studentName'] ?? $requestData['student_name'] ?? 'Learner');
    $studentEmail = strtolower(trim($requestData['studentEmail'] ?? $requestData['student_email'] ?? ''));
    $courseId = trim($requestData['courseId'] ?? $requestData['course_id'] ?? '');
    $courseTitle = trim($requestData['courseTitle'] ?? $requestData['course_title'] ?? 'Course Title');
    $coursePrice = floatval($requestData['coursePrice'] ?? $requestData['course_price'] ?? 0.00);
    $origAmount = isset($requestData['original_amount']) ? floatval($requestData['original_amount']) : (isset($requestData['raw_amount']) ? floatval($requestData['raw_amount']) : null);
    $origCurrency = strtoupper(trim($requestData['original_currency'] ?? $requestData['raw_currency'] ?? 'USD'));
    $paymentMethod = trim($requestData['paymentMethod'] ?? $requestData['payment_method'] ?? 'payhero_stk');
    $transactionCode = trim($requestData['transactionCode'] ?? $requestData['transaction_code'] ?? '');
    $status = trim($requestData['status'] ?? 'pending');
    $notes = trim($requestData['notes'] ?? '');

    if (empty($studentId) || empty($courseId)) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => 'student_id and course_id are required parameters.'
        ]);
        exit();
    }

    try {
        $sql = "INSERT INTO `subscriptions` 
                (`id`, `student_id`, `student_name`, `student_email`, `course_id`, `course_title`, `course_price`, `original_amount`, `original_currency`, `payment_method`, `transaction_code`, `status`, `enrolled_at`, `notes`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
                ON DUPLICATE KEY UPDATE 
                `student_name` = VALUES(`student_name`),
                `student_email` = VALUES(`student_email`),
                `course_title` = VALUES(`course_title`),
                `course_price` = VALUES(`course_price`),
                `original_amount` = VALUES(`original_amount`),
                `original_currency` = VALUES(`original_currency`),
                `payment_method` = VALUES(`payment_method`),
                `transaction_code` = VALUES(`transaction_code`),
                `status` = VALUES(`status`),
                `notes` = VALUES(`notes`);";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssssdddsssss", $id, $studentId, $studentName, $studentEmail, $courseId, $courseTitle, $coursePrice, $origAmount, $origCurrency, $paymentMethod, $transactionCode, $status, $notes);
        $stmt->execute();

        // If status is active, ensure activated_at is populated
        if ($status === 'active') {
            $actStmt = $conn->prepare("UPDATE `subscriptions` SET `activated_at` = NOW() WHERE `id` = ? AND `activated_at` IS NULL");
            $actStmt->bind_param("s", $id);
            $actStmt->execute();
        }

        $fetchStmt = $conn->prepare("SELECT * FROM `subscriptions` WHERE `id` = ? LIMIT 1");
        $fetchStmt->bind_param("s", $id);
        $fetchStmt->execute();
        $inserted = $fetchStmt->get_result()->fetch_assoc();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Subscription record created successfully.',
            'data' => normalizeSubscriptionRow($inserted)
        ]);
        exit();

    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Insert error: ' . $e->getMessage()
        ]);
        exit();
    }
}

// Method not allowed fallback
http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
]);
exit();
