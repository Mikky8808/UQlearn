<?php
require_once __DIR__ . '/cors.php';
/**
 * Instructor Transactions API Endpoint
 * LMS Platform - Instructor Specific PayHero & M-Pesa Revenue & Transactions
 * 
 * Path: /api/v1/instructor_transactions.php
 * Endpoint: GET /api/v1/instructor_transactions.php?instructor_id=xxx&instructor_email=xxx
 */

// 1. Timezone & CORS Headers
date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


require_once __DIR__ . '/db.php';

// Disable fatal exception throwing for non-critical query checks
mysqli_report(MYSQLI_REPORT_OFF);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use GET to fetch instructor transactions."
    ]);
    exit();
}

// 2. Query Parameters
$instructorId = trim($_GET['instructor_id'] ?? $_GET['user_id'] ?? $_GET['created_by'] ?? '');
$instructorEmail = trim($_GET['instructor_email'] ?? $_GET['email'] ?? '');
$instructorName = trim($_GET['instructor_name'] ?? $_GET['instructor'] ?? '');
$courseIdParam = trim($_GET['course_id'] ?? '');
$courseIdsParam = trim($_GET['course_ids'] ?? '');
$search = trim($_GET['search'] ?? '');
$limit = intval($_GET['limit'] ?? 100);
if ($limit <= 0 || $limit > 500) $limit = 100;
$offset = intval($_GET['offset'] ?? 0);
if ($offset < 0) $offset = 0;
$statusParam = strtolower(trim($_GET['status'] ?? 'successful'));

try {
    // 3. Find all course IDs that belong to this instructor
    $instructorCourseIds = [];

    // If explicit course_ids were passed as comma-separated
    if (!empty($courseIdsParam)) {
        $exploded = explode(',', $courseIdsParam);
        foreach ($exploded as $cid) {
            $cid = trim($cid);
            if (!empty($cid)) {
                $instructorCourseIds[] = $cid;
            }
        }
    }

    if (!empty($courseIdParam)) {
        $instructorCourseIds[] = $courseIdParam;
    }

    // Query courses table to discover all courses created by or assigned to this instructor
    $coursesTblRes = $conn->query("SHOW TABLES LIKE 'courses'");
    if ($coursesTblRes && $coursesTblRes->num_rows > 0) {
        $whereCourse = [];
        $courseParams = [];
        $courseTypes = "";

        if (!empty($instructorId)) {
            $whereCourse[] = "created_by = ?";
            $courseParams[] = $instructorId;
            $courseTypes .= "s";
        }
        if (!empty($instructorEmail)) {
            $whereCourse[] = "(created_by = ? OR description LIKE ?)";
            $courseParams[] = $instructorEmail;
            $courseParams[] = "%" . $instructorEmail . "%";
            $courseTypes .= "ss";
        }
        if (!empty($instructorName)) {
            $whereCourse[] = "LOWER(instructor) = LOWER(?)";
            $courseParams[] = $instructorName;
            $courseTypes .= "s";
        }

        if (!empty($whereCourse)) {
            $cSql = "SELECT id, title, price, instructor, created_by FROM courses WHERE " . implode(" OR ", $whereCourse);
            $stmtC = $conn->prepare($cSql);
            if ($stmtC) {
                $stmtC->bind_param($courseTypes, ...$courseParams);
                $stmtC->execute();
                $cRes = $stmtC->get_result();
                if ($cRes) {
                    while ($cRow = $cRes->fetch_assoc()) {
                        $instructorCourseIds[] = $cRow['id'];
                    }
                }
                $stmtC->close();
            }
        }
    }

    $instructorCourseIds = array_unique(array_filter($instructorCourseIds));

    // 4. Ensure tables exist
    $tablesRes = $conn->query("SHOW TABLES LIKE 'subscriptions'");
    $hasSubscriptions = ($tablesRes && $tablesRes->num_rows > 0);

    $tablesPayRes = $conn->query("SHOW TABLES LIKE 'payments'");
    $hasPayments = ($tablesPayRes && $tablesPayRes->num_rows > 0);

    $transactions = [];
    $seenIds = [];

    // 5. Query Subscriptions Table for matching courses
    if ($hasSubscriptions) {
        $whereClauses = ["s.status = 'active'"];
        $params = [];
        $types = "";

        // Filter by instructor course IDs if available
        if (!empty($instructorCourseIds)) {
            $inPlaceholders = implode(',', array_fill(0, count($instructorCourseIds), '?'));
            $whereClauses[] = "s.course_id IN ({$inPlaceholders})";
            foreach ($instructorCourseIds as $cid) {
                $params[] = $cid;
                $types .= "s";
            }
        } elseif (!empty($instructorName)) {
            // If courses table was empty or not indexed, try matching instructor name in courses join
            $whereClauses[] = "(s.activated_by LIKE ? OR s.notes LIKE ?)";
            $params[] = "%" . $instructorName . "%";
            $params[] = "%" . $instructorName . "%";
            $types .= "ss";
        }

        if (!empty($search)) {
            $whereClauses[] = "(s.student_name LIKE ? OR s.student_email LIKE ? OR s.course_title LIKE ? OR s.transaction_code LIKE ?)";
            $searchTerm = "%" . $search . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $types .= "ssss";
        }

        $whereSql = implode(" AND ", $whereClauses);

        $sql = "SELECT 
                    s.id,
                    s.student_id,
                    s.student_name,
                    s.student_email,
                    s.course_id,
                    COALESCE(NULLIF(NULLIF(s.course_title, ''), '0'), c.title, s.course_id, 'Course Enrollment') AS course_title,
                    s.course_price,
                    s.payment_method,
                    s.transaction_code,
                    s.status,
                    s.enrolled_at,
                    s.activated_at,
                    s.activated_by,
                    s.notes,
                    s.created_at
                FROM subscriptions s
                LEFT JOIN courses c ON c.id = s.course_id
                WHERE {$whereSql}
                ORDER BY COALESCE(s.activated_at, s.enrolled_at, s.created_at) DESC
                LIMIT ? OFFSET ?";

        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $params[] = $limit;
            $params[] = $offset;
            $types .= "ii";

            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $id = $row['id'];
                    $seenIds[$id] = true;

                    // Subscription price is already in USD
                    $usdAmount = floatval($row['course_price'] ?? 0);

                    $transactions[] = [
                        'id' => $row['id'],
                        'studentId' => $row['student_id'] ?? '',
                        'studentName' => $row['student_name'] ?? 'Learner',
                        'studentEmail' => $row['student_email'] ?? '',
                        'courseId' => $row['course_id'] ?? '',
                        'courseTitle' => $row['course_title'] ?? 'Course Enrollment',
                        'coursePrice' => $usdAmount,
                        'amount' => $usdAmount,
                        'currency' => 'USD',
                        'formatted_amount' => 'USD ' . number_format($usdAmount, 2),
                        'paymentMethod' => $row['payment_method'] ?? 'payhero_stk',
                        'phoneNumber' => '', // Not in subscriptions
                        'transactionCode' => $row['transaction_code'] ?? 'N/A',
                        'mpesaReceipt' => $row['transaction_code'] ?? 'N/A',
                        'externalReference' => $row['transaction_code'] ?? '',
                        'status' => 'active',
                        'enrolledAt' => $row['enrolled_at'] ?? $row['created_at'] ?? date('Y-m-d H:i:s'),
                        'activatedAt' => $row['activated_at'] ?? $row['enrolled_at'] ?? date('Y-m-d H:i:s'),
                        'activatedBy' => $row['activated_by'] ?? 'System',
                        'notes' => $row['notes'] ?? '',
                        'provider' => 'm-pesa'
                    ];
                }
            }
            $stmt->close();
        }
    }

    // Sort all transactions by date descending
    usort($transactions, function ($a, $b) {
        $tA = strtotime($a['activatedAt'] ?? $a['enrolledAt'] ?? 'now');
        $tB = strtotime($b['activatedAt'] ?? $b['enrolledAt'] ?? 'now');
        return $tB - $tA;
    });

    // Calculate summary statistics
    $totalCount = count($transactions);
    $totalRevenue = 0;
    foreach ($transactions as $t) {
        $totalRevenue += ($t['coursePrice'] ?: $t['amount'] ?: 0);
    }

    echo json_encode([
        "success" => true,
        "count" => $totalCount,
        "currency" => "KES",
        "total_revenue" => $totalRevenue,
        "formatted_total_revenue" => "KES " . number_format($totalRevenue, 2),
        "instructor_courses_count" => count($instructorCourseIds),
        "matched_course_ids" => $instructorCourseIds,
        "data" => $transactions,
        "filter" => "instructor_successful_only",
        "timestamp" => date('Y-m-d H:i:s')
    ]);
    exit();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to fetch instructor transactions: " . $e->getMessage(),
        "data" => []
    ]);
    exit();
}
