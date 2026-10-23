<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Daily & Total Visitor Tracking
 * Highly optimized for Shared Hosting (PHP 7.4+)
 * Path: /api/v1/visitor-count.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


function get_client_ip() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']) && $_SERVER['HTTP_CLIENT_IP'] !== '') {
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    } else if (isset($_SERVER['HTTP_X_FORWARDED_FOR']) && $_SERVER['HTTP_X_FORWARDED_FOR'] !== '') {
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else if (isset($_SERVER['HTTP_X_FORWARDED']) && $_SERVER['HTTP_X_FORWARDED'] !== '') {
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    } else if (isset($_SERVER['HTTP_FORWARDED_FOR']) && $_SERVER['HTTP_FORWARDED_FOR'] !== '') {
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    } else if (isset($_SERVER['HTTP_FORWARDED']) && $_SERVER['HTTP_FORWARDED'] !== '') {
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    } else if (isset($_SERVER['REMOTE_ADDR'])) {
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    } else {
        $ipaddress = '127.0.0.1';
    }
    
    if (strpos($ipaddress, ',') !== false) {
        $parts = explode(',', $ipaddress);
        $ipaddress = trim($parts[0]);
    }
    return filter_var($ipaddress, FILTER_VALIDATE_IP) ? $ipaddress : '127.0.0.1';
}

try {
    // Connect to the centralized database
    require_once __DIR__ . '/db.php';

    // Auto-create the daily_visitors table if it doesn't exist
    $table_check_sql = "CREATE TABLE IF NOT EXISTS `daily_visitors` (
      `visit_date` DATE NOT NULL,
      `hits` INT(11) DEFAULT 0,
      `uniques` INT(11) DEFAULT 0,
      PRIMARY KEY (`visit_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($table_check_sql);

    // Auto-create the visitor_logs table for storing visitor IPs
    $log_table_check_sql = "CREATE TABLE IF NOT EXISTS `visitor_logs` (
      `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
      `ip_address` VARCHAR(45) NOT NULL,
      `user_agent` TEXT NULL,
      `visited_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `visit_date` DATE NOT NULL,
      KEY `idx_visit_date` (`visit_date`),
      KEY `idx_ip_address` (`ip_address`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    @$conn->query($log_table_check_sql);

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    // Record visit on POST
    if ($method === 'POST') {
        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true);
        $isNewSession = isset($data['isNewSession']) && $data['isNewSession'] ? 1 : 0;
        
        $todayStr = date('Y-m-d');
        
        // 1. Update daily summary
        $stmtSummary = $conn->prepare("
            INSERT INTO daily_visitors (visit_date, hits, uniques) 
            VALUES (?, 1, ?) 
            ON DUPLICATE KEY UPDATE hits = hits + 1, uniques = uniques + ?
        ");
        if ($stmtSummary) {
            $stmtSummary->bind_param("sii", $todayStr, $isNewSession, $isNewSession);
            $stmtSummary->execute();
            $stmtSummary->close();
        }

        // 2. Record detailed IP log entry
        $clientIp = get_client_ip();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown User Agent';
        
        $stmtLog = $conn->prepare("
            INSERT INTO visitor_logs (ip_address, user_agent, visit_date)
            VALUES (?, ?, ?)
        ");
        if ($stmtLog) {
            $stmtLog->bind_param("sss", $clientIp, $userAgent, $todayStr);
            $stmtLog->execute();
            $stmtLog->close();
        }
    }

    // Handle Admin Logs Fetching Action
    if ($action === 'get_logs') {
        // Fetch last 100 IP logs
        $logs = [];
        $resLogs = $conn->query("
            SELECT id, ip_address, user_agent, visited_at, visit_date 
            FROM visitor_logs 
            ORDER BY id DESC 
            LIMIT 100
        ");
        if ($resLogs) {
            while ($row = $resLogs->fetch_assoc()) {
                $logs[] = [
                    "id" => (int)$row['id'],
                    "ip" => $row['ip_address'],
                    "userAgent" => $row['user_agent'],
                    "visitedAt" => $row['visited_at'],
                    "visitDate" => $row['visit_date']
                ];
            }
        }

        // Fetch daily analytics for the past 30 days
        $dailyHistory = [];
        $resHistory = $conn->query("
            SELECT visit_date, hits, uniques 
            FROM daily_visitors 
            ORDER BY visit_date DESC 
            LIMIT 30
        ");
        if ($resHistory) {
            while ($row = $resHistory->fetch_assoc()) {
                $dailyHistory[] = [
                    "date" => $row['visit_date'],
                    "hits" => (int)$row['hits'],
                    "uniques" => (int)$row['uniques']
                ];
            }
        }

        // Fetch top 15 most active IP addresses
        $topIps = [];
        $resTop = $conn->query("
            SELECT ip_address, COUNT(*) as count, MAX(visited_at) as last_seen 
            FROM visitor_logs 
            GROUP BY ip_address 
            ORDER BY count DESC 
            LIMIT 15
        ");
        if ($resTop) {
            while ($row = $resTop->fetch_assoc()) {
                $topIps[] = [
                    "ip" => $row['ip_address'],
                    "count" => (int)$row['count'],
                    "lastSeen" => $row['last_seen']
                ];
            }
        }

        // Calculate counts
        $resCounts = $conn->query("SELECT SUM(hits) as total_hits, SUM(uniques) as total_uniques FROM daily_visitors");
        $total_hits = 0;
        $total_uniques = 0;
        if ($resCounts && $row = $resCounts->fetch_assoc()) {
            $total_hits = (int)($row['total_hits'] ?? 0);
            $total_uniques = (int)($row['total_uniques'] ?? 0);
        }

        $todayStr = date('Y-m-d');
        $today_hits = 0;
        $today_uniques = 0;
        $resToday = $conn->query("SELECT hits, uniques FROM daily_visitors WHERE visit_date = '$todayStr'");
        if ($resToday && $row = $resToday->fetch_assoc()) {
            $today_hits = (int)$row['hits'];
            $today_uniques = (int)$row['uniques'];
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "todayHits" => $today_hits,
                "todayUniques" => $today_uniques,
                "totalHits" => $total_hits,
                "totalUniques" => $total_uniques,
                "logs" => $logs,
                "dailyHistory" => array_reverse($dailyHistory),
                "topIps" => $topIps
            ]
        ]);
        exit();
    }

    // Now, query stats to return for landing page or normal ping
    $todayStr = date('Y-m-d');
    
    // 1. Get today's stats
    $today_hits = 0;
    $today_uniques = 0;
    $stmt = $conn->prepare("SELECT hits, uniques FROM daily_visitors WHERE visit_date = ?");
    if ($stmt) {
        $stmt->bind_param("s", $todayStr);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        if ($res) {
            $today_hits = (int)$res['hits'];
            $today_uniques = (int)$res['uniques'];
        }
        $stmt->close();
    }

    // 2. Get all-time stats
    $total_hits = 0;
    $total_uniques = 0;
    $res = $conn->query("SELECT SUM(hits) as total_hits, SUM(uniques) as total_uniques FROM daily_visitors");
    if ($res) {
        $row = $res->fetch_assoc();
        if ($row) {
            $total_hits = (int)($row['total_hits'] ?? 0);
            $total_uniques = (int)($row['total_uniques'] ?? 0);
        }
    }

    // Default simulation fallback values if everything is empty
    if ($total_hits === 0) {
        $total_hits = 0;
        $total_uniques = 0;
        $today_hits = 0;
        $today_uniques = 0;
    }

    echo json_encode([
        "success" => true,
        "data" => [
            "todayHits" => $today_hits,
            "todayUniques" => $today_uniques,
            "totalHits" => $total_hits,
            "totalUniques" => $total_uniques,
            "date" => $todayStr
        ]
    ]);

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection or execution failed: " . $err->getMessage(),
        "data" => null
    ]);
}
?>
