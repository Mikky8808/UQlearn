<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Users Management (Admin)
 * Compatible with Shared Hosting (PHP 7.4+)
 * Path: /api/v1/users.php
 */

date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


try {
    // Centralized database connection
    require_once __DIR__ . '/db.php';

    // Auto-create/alter users table to ensure `status` column exists
    $check_col = @$conn->query("SHOW COLUMNS FROM `users` LIKE 'status'");
    if ($check_col && $check_col->num_rows === 0) {
        @$conn->query("ALTER TABLE `users` ADD COLUMN `status` ENUM('Active', 'Suspended') DEFAULT 'Active'");
    }

    // Seed mock data if table is empty
    $count_res = @$conn->query("SELECT COUNT(*) as count FROM users");
    $count_row = $count_res ? $count_res->fetch_assoc() : null;
    if ($count_row && $count_row['count'] == 0) {
        $mocks = [
            ['id' => 'u-1', 'role' => 'admin', 'first_name' => 'Wamuu', 'last_name' => 'Rajab', 'email' => 'wamuurajab@gmail.com', 'status' => 'Active'],
            ['id' => 'u-2', 'role' => 'admin', 'first_name' => 'System', 'last_name' => 'Administrator', 'email' => 'admin@uqlearn.org', 'status' => 'Active'],
            ['id' => 'u-3', 'role' => 'instructor', 'first_name' => 'Angela', 'last_name' => 'Vance', 'email' => 'angela.vance@mit.edu', 'status' => 'Active'],
            ['id' => 'u-4', 'role' => 'instructor', 'first_name' => 'Sarah', 'last_name' => 'Chen', 'email' => 'sarah.chen@designlab.io', 'status' => 'Active'],
            ['id' => 'u-5', 'role' => 'learner', 'first_name' => 'Alex', 'last_name' => 'Rivera', 'email' => 'alex.rivera@learner.uqlearn.com', 'status' => 'Active'],
            ['id' => 'u-6', 'role' => 'learner', 'first_name' => 'David', 'last_name' => 'Kim', 'email' => 'david.k@stanford.alumni.edu', 'status' => 'Active']
        ];

        $stmt = $conn->prepare("INSERT IGNORE INTO users (id, role, first_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($mocks as $m) {
            $stmt->bind_param("ssssss", $m['id'], $m['role'], $m['first_name'], $m['last_name'], $m['email'], $m['status']);
            $stmt->execute();
        }
        if ($stmt) $stmt->close();
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true) ?? [];

    $id = $_GET['id'] ?? $data['id'] ?? null;
    $role = $_GET['role'] ?? null;
    
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM users WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
                $stmt->bind_param("s", $id);
                $stmt->execute();
                $res = $stmt->get_result();
                $item = $res->fetch_assoc();
                $stmt->close();
                if ($item) {
                    echo json_encode(["success" => true, "data" => formatRow($item)]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "User not found or deleted"]);
                }
            } else {
                $where = ["(is_deleted = 0 OR is_deleted IS NULL)"];
                $params = [];
                $types = "";

                if ($role && $role !== 'All') {
                    $where[] = "role = ?";
                    $params[] = $role;
                    $types .= "s";
                }

                $query = "SELECT * FROM users";
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

        case 'PUT':
        case 'PATCH':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "User ID is required"]);
                exit();
            }

            $updates = [];
            $params = [];
            $types = "";

            if (isset($data['status'])) {
                $updates[] = "status = ?";
                $params[] = $data['status'];
                $types .= "s";
            }
            if (isset($data['role'])) {
                $updates[] = "role = ?";
                $params[] = $data['role'];
                $types .= "s";
            }

            if (!empty($updates)) {
                $params[] = $id;
                $types .= "s";
                $stmt = $conn->prepare("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?");
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $stmt->close();
            }

            echo json_encode(["success" => true, "message" => "User updated successfully"]);
            break;
            
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "User ID is required"]);
                exit();
            }
            $stmt = $conn->prepare("UPDATE users SET is_deleted = 1, deleted_at = NOW() WHERE id = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["success" => true, "message" => "User deleted successfully"]);
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
    // Format to match frontend structure
    $joined = isset($row['created_at']) ? date('M Y', strtotime($row['created_at'])) : 'Unknown';
    $name = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
    if (!$name) $name = 'Unknown User';
    
    return [
        'id' => $row['id'],
        'name' => $name,
        'email' => $row['email'],
        'role' => $row['role'],
        'status' => $row['status'] ?? 'Active',
        'joined' => $joined,
        'avatar' => $row['avatar_url'] ?? null
    ];
}
