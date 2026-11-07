<?php
/**
 * Database Connection File (Optimized for Shared Hosting)
 * LMS Platform - Database Configuration
 * 
 * Path: /api/v1/db.php
 */

// Prevent direct access to this script
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'db.php') {
    http_response_code(403);
    exit('Forbidden');
}

// Enable error reporting for mysqli
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Singleton / connection factory for shared hosting resilience
if (!function_exists('getDbConnection')) {
    function getDbConnection(): ?mysqli {
        // If global connection is already active and valid, reuse it
        if (isset($GLOBALS['db_conn']) && ($GLOBALS['db_conn'] instanceof mysqli)) {
            try {
                if (@$GLOBALS['db_conn']->ping()) {
                    return $GLOBALS['db_conn'];
                }
            } catch (\Throwable $t) {
                $GLOBALS['db_conn'] = null;
            }
        }

        // Check for optional config file in current or parent directories
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

        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            try {
                $newConn = @new mysqli($host, $username, $password, $database);
                if ($newConn && !$newConn->connect_errno) {
                    $newConn->set_charset("utf8mb4");
                    $GLOBALS['db_conn'] = $newConn;
                    return $newConn;
                }
            } catch (\Throwable $e) {
                // Wait briefly before retrying
            }
            if ($attempt < $maxRetries - 1) {
                sleep($retryDelay);
            }
        }

        return null;
    }
}

// Ensure $conn is established and assigned in both local and global scope
$conn = getDbConnection();
$GLOBALS['conn'] = $conn;
?>
