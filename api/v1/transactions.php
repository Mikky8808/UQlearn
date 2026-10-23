<?php
require_once __DIR__ . '/cors.php';
/**
 * Transactions API Endpoint (Successful Transactions Only)
 * LMS Platform - PayHero & M-Pesa Transactions
 * 
 * Path: /api/v1/transactions.php
 * Endpoint: GET /api/v1/transactions.php?status=successful
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
        "message" => "Method not allowed. Use GET to fetch transactions."
    ]);
    exit();
}

// 2. Query Parameters
$search = trim($_GET['search'] ?? '');
$limit = intval($_GET['limit'] ?? 100);
if ($limit <= 0 || $limit > 500) $limit = 100;
$offset = intval($_GET['offset'] ?? 0);
if ($offset < 0) $offset = 0;

// Filter: Status is always restricted to successful transactions only
$statusParam = strtolower(trim($_GET['status'] ?? 'successful'));

try {
    // 3. Ensure payments and subscriptions tables exist
    $tablesRes = $conn->query("SHOW TABLES LIKE 'subscriptions'");
    $hasSubscriptions = ($tablesRes && $tablesRes->num_rows > 0);

    $tablesPayRes = $conn->query("SHOW TABLES LIKE 'payments'");
    $hasPayments = ($tablesPayRes && $tablesPayRes->num_rows > 0);

    $transactions = [];
    $seenIds = [];

    // 4. Query from Subscriptions Table (where status is active/successful)
    if ($hasSubscriptions) {
        $whereClauses = ["s.status = 'active'"];
        $params = [];
        $types = "";

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

        if ($hasPayments) {
            $sql = "SELECT 
                        s.id,
                        s.student_id,
                        s.student_name,
                        s.student_email,
                        s.course_id,
                        s.course_title,
                        s.course_price,
                        s.payment_method,
                        s.transaction_code,
                        s.status,
                        s.enrolled_at,
                        s.activated_at,
                        s.activated_by,
                        s.notes,
                        s.created_at,
                        p.phone_number,
                        p.external_reference,
                        p.mpesa_receipt_number,
                        p.amount AS payment_amount,
                        p.provider
                    FROM subscriptions s
                    LEFT JOIN payments p ON (p.subscription_id = s.id OR p.external_reference = s.transaction_code OR (p.mpesa_receipt_number IS NOT NULL AND p.mpesa_receipt_number != '' AND p.mpesa_receipt_number = s.transaction_code))
                    WHERE {$whereSql}
                    ORDER BY COALESCE(s.activated_at, s.enrolled_at, s.created_at) DESC
                    LIMIT ? OFFSET ?";
        } else {
            $sql = "SELECT 
                        s.id,
                        s.student_id,
                        s.student_name,
                        s.student_email,
                        s.course_id,
                        s.course_title,
                        s.course_price,
                        s.payment_method,
                        s.transaction_code,
                        s.status,
                        s.enrolled_at,
                        s.activated_at,
                        s.activated_by,
                        s.notes,
                        s.created_at,
                        NULL AS phone_number,
                        NULL AS external_reference,
                        NULL AS mpesa_receipt_number,
                        s.course_price AS payment_amount,
                        'm-pesa' AS provider
                    FROM subscriptions s
                    WHERE {$whereSql}
                    ORDER BY COALESCE(s.activated_at, s.enrolled_at, s.created_at) DESC
                    LIMIT ? OFFSET ?";
        }

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

                    $receipt = !empty($row['mpesa_receipt_number']) 
                        ? $row['mpesa_receipt_number'] 
                        : (!empty($row['transaction_code']) ? $row['transaction_code'] : 'N/A');

                    $rawAmount = floatval($row['payment_amount'] ?? $row['course_price'] ?? 0);

                    $transactions[] = [
                        'id' => $row['id'],
                        'studentId' => $row['student_id'] ?? '',
                        'studentName' => $row['student_name'] ?? 'Learner',
                        'studentEmail' => $row['student_email'] ?? '',
                        'courseId' => $row['course_id'] ?? '',
                        'courseTitle' => $row['course_title'] ?? 'Course Enrollment',
                        'coursePrice' => $rawAmount,
                        'amount' => $rawAmount,
                        'currency' => 'KES',
                        'formatted_amount' => 'KES ' . number_format($rawAmount, 2),
                        'paymentMethod' => $row['payment_method'] ?? 'payhero_stk',
                        'phoneNumber' => $row['phone_number'] ?? '',
                        'transactionCode' => $receipt,
                        'mpesaReceipt' => $receipt,
                        'externalReference' => $row['external_reference'] ?? '',
                        'status' => 'active',
                        'enrolledAt' => $row['enrolled_at'] ?? $row['created_at'] ?? date('Y-m-d H:i:s'),
                        'activatedAt' => $row['activated_at'] ?? $row['enrolled_at'] ?? date('Y-m-d H:i:s'),
                        'activatedBy' => $row['activated_by'] ?? 'System',
                        'notes' => $row['notes'] ?? '',
                        'provider' => $row['provider'] ?? 'm-pesa'
                    ];
                }
            }
            $stmt->close();
        }
    }

    // 5. Query from standalone successful Payments table records (if not already listed in subscriptions)
    if ($hasPayments) {
        $payWhere = ["(status = 'SUCCESS' OR status = 'COMPLETED' OR status = 'SUCCESSFUL')"];
        $payParams = [];
        $payTypes = "";

        if (!empty($search)) {
            $payWhere[] = "(phone_number LIKE ? OR external_reference LIKE ? OR mpesa_receipt_number LIKE ?)";
            $searchTerm = "%" . $search . "%";
            $payParams[] = $searchTerm;
            $payParams[] = $searchTerm;
            $payParams[] = $searchTerm;
            $payTypes .= "sss";
        }

        $payWhereSql = implode(" AND ", $payWhere);
        $paySql = "SELECT * FROM payments WHERE {$payWhereSql} ORDER BY created_at DESC LIMIT 50";
        $stmtPay = $conn->prepare($paySql);
        if ($stmtPay) {
            if (!empty($payTypes)) {
                $stmtPay->bind_param($payTypes, ...$payParams);
            }
            $stmtPay->execute();
            $payResult = $stmtPay->get_result();

            if ($payResult) {
                while ($pRow = $payResult->fetch_assoc()) {
                    $subId = $pRow['subscription_id'] ?? '';
                    $txId = $pRow['transaction_id'] ?? $pRow['id'] ?? ('tx_' . ($pRow['external_reference'] ?? uniqid()));

                    if (($subId && isset($seenIds[$subId])) || isset($seenIds[$txId])) {
                        continue;
                    }
                    $seenIds[$txId] = true;

                    $receipt = !empty($pRow['mpesa_receipt_number']) 
                        ? $pRow['mpesa_receipt_number'] 
                        : (!empty($pRow['external_reference']) ? $pRow['external_reference'] : 'CONFIRMED');

                    $rawPayAmount = floatval($pRow['amount'] ?? 0);

                    $transactions[] = [
                        'id' => $txId,
                        'studentId' => $pRow['student_id'] ?? $pRow['user_id'] ?? '',
                        'studentName' => 'Verified Student',
                        'studentEmail' => '',
                        'courseId' => $pRow['course_id'] ?? '',
                        'courseTitle' => 'Course Purchase',
                        'coursePrice' => $rawPayAmount,
                        'amount' => $rawPayAmount,
                        'currency' => 'KES',
                        'formatted_amount' => 'KES ' . number_format($rawPayAmount, 2),
                        'paymentMethod' => $pRow['provider'] ?? 'payhero_stk',
                        'phoneNumber' => $pRow['phone_number'] ?? '',
                        'transactionCode' => $receipt,
                        'mpesaReceipt' => $receipt,
                        'externalReference' => $pRow['external_reference'] ?? '',
                        'status' => 'active',
                        'enrolledAt' => $pRow['created_at'] ?? date('Y-m-d H:i:s'),
                        'activatedAt' => $pRow['updated_at'] ?? $pRow['created_at'] ?? date('Y-m-d H:i:s'),
                        'activatedBy' => 'PayHero Webhook',
                        'notes' => 'Direct M-Pesa STK payment',
                        'provider' => $pRow['provider'] ?? 'm-pesa'
                    ];
                }
            }
            $stmtPay->close();
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
        "data" => $transactions,
        "filter" => "successful_only",
        "timestamp" => date('Y-m-d H:i:s')
    ]);
    exit();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to fetch transactions: " . $e->getMessage(),
        "data" => []
    ]);
    exit();
}
