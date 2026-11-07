<?php
require_once __DIR__ . '/cors.php';
/**
 * Learning Reminders API - API v1
 * Path: /api/v1/reminders.php
 * 
 * Provides per-user learning reminders and Google Calendar schedule integration
 */

date_default_timezone_set('Africa/Nairobi');
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

try {
    require_once __DIR__ . '/db.php';

    // Ensure reminders table exists and has necessary columns
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->query("
            CREATE TABLE IF NOT EXISTS reminders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                day VARCHAR(50) NOT NULL,
                time VARCHAR(50) NOT NULL,
                frequency VARCHAR(50) DEFAULT 'Weekly',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // Auto-migrate missing columns if table existed previously without them
        $col_check_freq = $conn->query("SHOW COLUMNS FROM reminders LIKE 'frequency'");
        if ($col_check_freq && $col_check_freq->num_rows === 0) {
            @$conn->query("ALTER TABLE reminders ADD COLUMN frequency VARCHAR(50) DEFAULT 'Weekly'");
        }

        $col_check_uid = $conn->query("SHOW COLUMNS FROM reminders LIKE 'user_id'");
        if ($col_check_uid && $col_check_uid->num_rows === 0) {
            @$conn->query("ALTER TABLE reminders ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'user'");
            @$conn->query("ALTER TABLE reminders ADD INDEX idx_user_id (user_id)");
        }
    }

    if ($method === 'GET') {
        $userId = isset($_GET['userId']) ? trim((string)$_GET['userId']) : (isset($_GET['user_id']) ? trim((string)$_GET['user_id']) : '');

        if (empty($userId)) {
            echo json_encode([
                "success" => true,
                "reminders" => []
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $reminders = [];
        if (isset($conn) && $conn instanceof mysqli) {
            $hasFrequencyCol = false;
            $chkF = $conn->query("SHOW COLUMNS FROM reminders LIKE 'frequency'");
            if ($chkF && $chkF->num_rows > 0) $hasFrequencyCol = true;

            $hasUserIdCol = false;
            $chkU = $conn->query("SHOW COLUMNS FROM reminders LIKE 'user_id'");
            if ($chkU && $chkU->num_rows > 0) $hasUserIdCol = true;

            if ($hasUserIdCol) {
                $query = $hasFrequencyCol 
                    ? "SELECT id, title, day, time, frequency, created_at FROM reminders WHERE user_id = ? ORDER BY id DESC"
                    : "SELECT id, title, day, time, 'Weekly' AS frequency, created_at FROM reminders WHERE user_id = ? ORDER BY id DESC";
                
                $stmt = $conn->prepare($query);
                $stmt->bind_param("s", $userId);
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $reminders[] = [
                        "id" => $row['id'],
                        "title" => $row['title'],
                        "day" => $row['day'],
                        "time" => $row['time'],
                        "frequency" => $row['frequency'] ?? 'Weekly'
                    ];
                }
                $stmt->close();
            }
        }

        echo json_encode([
            "success" => true,
            "reminders" => $reminders
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if ($method === 'POST') {
        $raw_input = file_get_contents("php://input");
        $data = json_decode($raw_input, true);

        $userId = !empty($data['userId']) ? trim((string)$data['userId']) : (!empty($data['user_id']) ? trim((string)$data['user_id']) : '');
        $title = !empty($data['title']) ? trim((string)$data['title']) : 'Learning Session';
        $day = !empty($data['day']) ? trim((string)$data['day']) : 'Monday';
        $time = !empty($data['time']) ? trim((string)$data['time']) : '12:00';
        $frequency = !empty($data['frequency']) ? trim((string)$data['frequency']) : 'Weekly';

        if (empty($userId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "userId is required to create a reminder."
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        if (isset($conn) && $conn instanceof mysqli) {
            $hasFrequencyCol = false;
            $chkF = $conn->query("SHOW COLUMNS FROM reminders LIKE 'frequency'");
            if ($chkF && $chkF->num_rows > 0) $hasFrequencyCol = true;

            $hasUserIdCol = false;
            $chkU = $conn->query("SHOW COLUMNS FROM reminders LIKE 'user_id'");
            if ($chkU && $chkU->num_rows > 0) $hasUserIdCol = true;

            $newId = 0;
            if ($hasUserIdCol && $hasFrequencyCol) {
                $stmt = $conn->prepare("INSERT INTO reminders (user_id, title, day, time, frequency) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $userId, $title, $day, $time, $frequency);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $stmt->close();
            } elseif ($hasUserIdCol) {
                $stmt = $conn->prepare("INSERT INTO reminders (user_id, title, day, time) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("ssss", $userId, $title, $day, $time);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $stmt->close();
            } else {
                $stmt = $conn->prepare("INSERT INTO reminders (title, day, time) VALUES (?, ?, ?)");
                $stmt->bind_param("sss", $title, $day, $time);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $stmt->close();
            }

            echo json_encode([
                "success" => true,
                "message" => "Reminder saved successfully.",
                "reminder" => [
                    "id" => $newId,
                    "userId" => $userId,
                    "title" => $title,
                    "day" => $day,
                    "time" => $time,
                    "frequency" => $frequency
                ]
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Reminder registered.",
                "reminder" => [
                    "title" => $title,
                    "day" => $day,
                    "time" => $time
                ]
            ]);
        }

        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $userId = isset($_GET['userId']) ? trim((string)$_GET['userId']) : (isset($_GET['user_id']) ? trim((string)$_GET['user_id']) : '');

        if ($id > 0 && isset($conn) && $conn instanceof mysqli) {
            $hasUserIdCol = false;
            $chkU = $conn->query("SHOW COLUMNS FROM reminders LIKE 'user_id'");
            if ($chkU && $chkU->num_rows > 0) $hasUserIdCol = true;

            if (!empty($userId) && $hasUserIdCol) {
                $stmt = $conn->prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?");
                $stmt->bind_param("is", $id, $userId);
            } else {
                $stmt = $conn->prepare("DELETE FROM reminders WHERE id = ?");
                $stmt->bind_param("i", $id);
            }
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            "success" => true,
            "message" => "Reminder deleted successfully."
        ]);
        if (isset($conn) && $conn instanceof mysqli) $conn->close();
        exit();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error processing reminder request: " . $e->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}
?>
