<?php
require_once __DIR__ . '/cors.php';
/**
 * Soft Delete User and Payout Details API Endpoint (PHP Backend for Shared Hosting / MySQL)
 * LMS Platform - UQlearn
 * Path: /api/v1/delete-user.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $userId = $_GET['id'] ?? $_GET['user_id'] ?? $input['id'] ?? $input['userId'] ?? '';

    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit();
    }

    // Ensure users table has is_deleted column
    $check_col = @$conn->query("SHOW COLUMNS FROM `users` LIKE 'is_deleted'");
    if ($check_col && $check_col->num_rows === 0) {
        @$conn->query("ALTER TABLE `users` ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0");
    }

    // 1. Soft delete user in users table
    $stmt = $conn->prepare("UPDATE `users` SET `is_deleted` = 1, `status` = 'Suspended' WHERE `id` = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();

    // 2. Delete user payout / bank settings
    $stmtPayout = $conn->prepare("DELETE FROM `instructor_payout_settings` WHERE `user_id` = ?");
    @$stmtPayout->bind_param("s", $userId);
    @$stmtPayout->execute();
    @$stmtPayout->close();

    echo json_encode([
        'success' => true,
        'message' => 'User and associated payout details successfully soft-deleted/removed'
    ]);
    exit();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
