<?php
require_once __DIR__ . '/cors.php';
/**
 * Communication Requests API Endpoint (PHP Backend for MySQL)
 * Handles CRUD operations for requests between Users, Instructors, and Admin.
 * 
 * Path: /api/v1/requests.php
 */

date_default_timezone_set('Africa/Nairobi');
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/db.php';

    // 1. Auto-create database table if not present
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS `communication_requests` (
            `id` VARCHAR(64) PRIMARY KEY,
            `sender_type` ENUM('user', 'instructor', 'admin') NOT NULL DEFAULT 'user',
            `sender_id` VARCHAR(64) DEFAULT NULL,
            `sender_name` VARCHAR(150) NOT NULL,
            `sender_email` VARCHAR(191) NOT NULL,
            `recipient_type` ENUM('instructor', 'admin') NOT NULL DEFAULT 'instructor',
            `recipient_id` VARCHAR(64) DEFAULT NULL,
            `course_id` VARCHAR(64) DEFAULT NULL,
            `course_title` VARCHAR(255) DEFAULT NULL,
            `type` VARCHAR(50) NOT NULL DEFAULT 'custom',
            `title` VARCHAR(255) NOT NULL,
            `details` TEXT NOT NULL,
            `date` VARCHAR(100) DEFAULT NULL,
            `status` ENUM('pending', 'approved', 'declined', 'in_review') NOT NULL DEFAULT 'pending',
            `reply_note` TEXT DEFAULT NULL,
            `replied_at` DATETIME DEFAULT NULL,
            `replied_by` VARCHAR(150) DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY `idx_req_sender_type` (`sender_type`),
            KEY `idx_req_sender_id` (`sender_id`),
            KEY `idx_req_recipient_type` (`recipient_type`),
            KEY `idx_req_recipient_id` (`recipient_id`),
            KEY `idx_req_course_id` (`course_id`),
            KEY `idx_req_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    if (!$conn->query($createTableSql)) {
        throw new Exception("Failed to prepare requests table: " . $conn->error);
    }

    // Helper to format database row into camelCase JSON response
    function formatRequestRow($row) {
        if (!$row) return null;
        return [
            'id' => $row['id'],
            'senderType' => $row['sender_type'],
            'senderId' => $row['sender_id'] ?? '',
            'senderName' => $row['sender_name'],
            'senderEmail' => $row['sender_email'],
            'recipientType' => $row['recipient_type'],
            'recipientId' => $row['recipient_id'] ?? '',
            'courseId' => $row['course_id'] ?? '',
            'courseTitle' => $row['course_title'] ?? '',
            'type' => $row['type'],
            'title' => $row['title'],
            'details' => $row['details'],
            'date' => $row['date'] ?: date('M d, Y', strtotime($row['created_at'])),
            'status' => $row['status'],
            'replyNote' => $row['reply_note'] ?? '',
            'repliedAt' => $row['replied_at'] ?? '',
            'repliedBy' => $row['replied_by'] ?? '',
            'createdAt' => $row['created_at']
        ];
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // =========================================================================
    // GET: Fetch requests or single request by ID
    // =========================================================================
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';

        if (!empty($id)) {
            $stmt = $conn->prepare("SELECT * FROM `communication_requests` WHERE `id` = ? LIMIT 1");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $res = $stmt->get_result();
            $row = $res->fetch_assoc();
            $stmt->close();

            if (!$row) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Request not found"]);
                exit();
            }

            echo json_encode(["success" => true, "request" => formatRequestRow($row)]);
            exit();
        }

        // Filters
        $recipientType = isset($_GET['recipient_type']) ? trim($_GET['recipient_type']) : (isset($_GET['recipientType']) ? trim($_GET['recipientType']) : '');
        $recipientId = isset($_GET['recipient_id']) ? trim($_GET['recipient_id']) : (isset($_GET['recipientId']) ? trim($_GET['recipientId']) : '');
        $senderType = isset($_GET['sender_type']) ? trim($_GET['sender_type']) : (isset($_GET['senderType']) ? trim($_GET['senderType']) : '');
        $senderId = isset($_GET['sender_id']) ? trim($_GET['sender_id']) : (isset($_GET['senderId']) ? trim($_GET['senderId']) : '');
        $courseId = isset($_GET['course_id']) ? trim($_GET['course_id']) : (isset($_GET['courseId']) ? trim($_GET['courseId']) : '');
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        $whereClause = [];
        $params = [];
        $types = "";

        if (!empty($recipientType)) {
            $whereClause[] = "`recipient_type` = ?";
            $params[] = $recipientType;
            $types .= "s";
        }
        if (!empty($recipientId)) {
            $whereClause[] = "`recipient_id` = ?";
            $params[] = $recipientId;
            $types .= "s";
        }
        if (!empty($senderType)) {
            $whereClause[] = "`sender_type` = ?";
            $params[] = $senderType;
            $types .= "s";
        }
        if (!empty($senderId)) {
            $whereClause[] = "`sender_id` = ?";
            $params[] = $senderId;
            $types .= "s";
        }
        if (!empty($courseId)) {
            $whereClause[] = "`course_id` = ?";
            $params[] = $courseId;
            $types .= "s";
        }
        if (!empty($status)) {
            $whereClause[] = "`status` = ?";
            $params[] = $status;
            $types .= "s";
        }
        if (!empty($search)) {
            $whereClause[] = "(`sender_name` LIKE ? OR `sender_email` LIKE ? OR `title` LIKE ? OR `details` LIKE ? OR `course_title` LIKE ?)";
            $searchTerm = "%" . $search . "%";
            for ($i = 0; $i < 5; $i++) {
                $params[] = $searchTerm;
                $types .= "s";
            }
        }

        $sql = "SELECT * FROM `communication_requests`";
        if (count($whereClause) > 0) {
            $sql .= " WHERE " . implode(" AND ", $whereClause);
        }
        $sql .= " ORDER BY `created_at` DESC";

        $stmt = $conn->prepare($sql);
        if ($types && count($params) > 0) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $requests = [];
        while ($row = $result->fetch_assoc()) {
            $requests[] = formatRequestRow($row);
        }
        $stmt->close();

        echo json_encode([
            "success" => true,
            "count" => count($requests),
            "requests" => $requests,
            "data" => $requests
        ]);
        exit();
    }

    // Parse input for POST / PUT / PATCH / DELETE
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;

    // =========================================================================
    // POST: Create request OR Update status action
    // =========================================================================
    if ($method === 'POST') {
        $action = isset($input['action']) ? trim($input['action']) : '';

        // Status update / reply action
        if ($action === 'update_status' || $action === 'reply' || isset($input['reply_note']) || isset($input['replyNote'])) {
            $id = isset($input['id']) ? trim($input['id']) : '';
            $status = isset($input['status']) ? trim($input['status']) : 'approved';
            $replyNote = isset($input['reply_note']) ? trim($input['reply_note']) : (isset($input['replyNote']) ? trim($input['replyNote']) : '');
            $repliedBy = isset($input['replied_by']) ? trim($input['replied_by']) : (isset($input['repliedBy']) ? trim($input['repliedBy']) : 'System');

            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Missing request id parameter"]);
                exit();
            }

            $stmt = $conn->prepare("
                UPDATE `communication_requests` 
                SET `status` = ?, `reply_note` = ?, `replied_by` = ?, `replied_at` = NOW() 
                WHERE `id` = ?
            ");
            $stmt->bind_param("ssss", $status, $replyNote, $repliedBy, $id);
            if (!$stmt->execute()) {
                throw new Exception("Failed to update status: " . $stmt->error);
            }
            $stmt->close();

            // Fetch updated
            $stmt = $conn->prepare("SELECT * FROM `communication_requests` WHERE `id` = ? LIMIT 1");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $updatedRow = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            echo json_encode([
                "success" => true,
                "message" => "Request status updated successfully",
                "request" => formatRequestRow($updatedRow)
            ]);
            exit();
        }

        // Create new request
        $id = !empty($input['id']) ? trim($input['id']) : 'req_' . uniqid() . '_' . time();
        $senderType = isset($input['sender_type']) ? trim($input['sender_type']) : (isset($input['senderType']) ? trim($input['senderType']) : 'user');
        $senderId = isset($input['sender_id']) ? trim($input['sender_id']) : (isset($input['senderId']) ? trim($input['senderId']) : null);
        $senderName = isset($input['sender_name']) ? trim($input['sender_name']) : (isset($input['senderName']) ? trim($input['senderName']) : 'Anonymous');
        $senderEmail = isset($input['sender_email']) ? trim($input['sender_email']) : (isset($input['senderEmail']) ? trim($input['senderEmail']) : '');
        $recipientType = isset($input['recipient_type']) ? trim($input['recipient_type']) : (isset($input['recipientType']) ? trim($input['recipientType']) : 'instructor');
        $recipientId = isset($input['recipient_id']) ? trim($input['recipient_id']) : (isset($input['recipientId']) ? trim($input['recipientId']) : null);
        $courseId = isset($input['course_id']) ? trim($input['course_id']) : (isset($input['courseId']) ? trim($input['courseId']) : null);
        $courseTitle = isset($input['course_title']) ? trim($input['course_title']) : (isset($input['courseTitle']) ? trim($input['courseTitle']) : null);
        $type = isset($input['type']) ? trim($input['type']) : 'custom';
        $title = isset($input['title']) ? trim($input['title']) : 'General Request';
        $details = isset($input['details']) ? trim($input['details']) : '';
        $dateStr = isset($input['date']) ? trim($input['date']) : 'Just now';
        $status = isset($input['status']) ? trim($input['status']) : 'pending';

        if (empty($title) || empty($details)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Title and details are required"]);
            exit();
        }

        $stmt = $conn->prepare("
            INSERT INTO `communication_requests` 
            (`id`, `sender_type`, `sender_id`, `sender_name`, `sender_email`, `recipient_type`, `recipient_id`, `course_id`, `course_title`, `type`, `title`, `details`, `date`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("ssssssssssssss", 
            $id, $senderType, $senderId, $senderName, $senderEmail, 
            $recipientType, $recipientId, $courseId, $courseTitle, 
            $type, $title, $details, $dateStr, $status
        );

        if (!$stmt->execute()) {
            throw new Exception("Execute insert failed: " . $stmt->error);
        }
        $stmt->close();

        // Fetch inserted
        $stmt = $conn->prepare("SELECT * FROM `communication_requests` WHERE `id` = ? LIMIT 1");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $newRow = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode([
            "success" => true,
            "message" => "Request created successfully",
            "request" => formatRequestRow($newRow)
        ]);
        exit();
    }

    // =========================================================================
    // PUT / PATCH: Update existing request
    // =========================================================================
    if ($method === 'PUT' || $method === 'PATCH') {
        $id = isset($input['id']) ? trim($input['id']) : (isset($_GET['id']) ? trim($_GET['id']) : '');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing request id parameter"]);
            exit();
        }

        $updates = [];
        $params = [];
        $types = "";

        $fieldsMap = [
            'status' => 'status',
            'reply_note' => 'reply_note',
            'replyNote' => 'reply_note',
            'replied_by' => 'replied_by',
            'repliedBy' => 'replied_by',
            'title' => 'title',
            'details' => 'details',
            'type' => 'type'
        ];

        foreach ($fieldsMap as $key => $col) {
            if (isset($input[$key])) {
                $updates[] = "`$col` = ?";
                $params[] = $input[$key];
                $types .= "s";
            }
        }

        if (count($updates) === 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No valid fields provided for update"]);
            exit();
        }

        if (isset($input['status']) || isset($input['reply_note']) || isset($input['replyNote'])) {
            $updates[] = "`replied_at` = NOW()";
        }

        $sql = "UPDATE `communication_requests` SET " . implode(", ", $updates) . " WHERE `id` = ?";
        $params[] = $id;
        $types .= "s";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new Exception("Update failed: " . $stmt->error);
        }
        $stmt->close();

        $stmt = $conn->prepare("SELECT * FROM `communication_requests` WHERE `id` = ? LIMIT 1");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $updatedRow = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        echo json_encode([
            "success" => true,
            "message" => "Request updated successfully",
            "request" => formatRequestRow($updatedRow)
        ]);
        exit();
    }

    // =========================================================================
    // DELETE: Delete request record
    // =========================================================================
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? trim($_GET['id']) : (isset($input['id']) ? trim($input['id']) : '');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing request id parameter"]);
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM `communication_requests` WHERE `id` = ?");
        $stmt->bind_param("s", $id);
        if (!$stmt->execute()) {
            throw new Exception("Delete failed: " . $stmt->error);
        }
        $stmt->close();

        echo json_encode([
            "success" => true,
            "message" => "Request deleted successfully"
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
