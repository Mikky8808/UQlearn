<?php
/**
 * Database Connection File (Optimized for Shared Hosting)
 * LMS Platform - Database Configuration
 * 
 * Path: /api/v1/db.php
 */

// Prevent direct access to this script
if (basename($_SERVER['SCRIPT_FILENAME']) === 'db.php') {
    http_response_code(403);
    exit('Forbidden');
}

// Enable error reporting for mysqli
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Check if existing global connection is still active and valid
if (isset($GLOBALS['db_conn']) && ($GLOBALS['db_conn'] instanceof mysqli)) {
    try {
        if (!@$GLOBALS['db_conn']->ping()) {
            $GLOBALS['db_conn'] = null; // Connection lost or server gone away, reset to force re-connect
        }
    } catch (Throwable $t) {
        $GLOBALS['db_conn'] = null;
    }
}

// Create connection if not established or stale
if (!isset($GLOBALS['db_conn']) || !($GLOBALS['db_conn'] instanceof mysqli)) {
    // Check for optional config file in current or root directory
    if (file_exists(__DIR__ . '/db_config.php')) {
        require_once __DIR__ . '/db_config.php';
    } elseif (file_exists(dirname(dirname(__DIR__)) . '/db_config.php')) {
        require_once dirname(dirname(__DIR__)) . '/db_config.php';
    }

    $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
    $username = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'uqlearno_lms');
    $password = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: 'uqlearno_lms');
    $database = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'uqlearno_lms');

    // Retry connection logic for shared hosting environment stability
    $maxRetries = 3;
    $retryDelay = 1; // seconds
    $conn = null;

    for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
        try {
            $conn = new mysqli($host, $username, $password, $database);
            break; // Connection succeeded
        } catch (mysqli_sql_exception $e) {
            if ($attempt < $maxRetries - 1) {
                sleep($retryDelay);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Database connection failed"
                ]);
                exit();
            }
        }
    }

    $conn->set_charset("utf8mb4");
    $GLOBALS['db_conn'] = $conn;
}

$conn = $GLOBALS['db_conn'];
// DO NOT auto-close on shutdown - let PHP handle it natively
// This prevents connection exhaustion or double-close clashes
?>
