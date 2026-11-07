<?php
/**
 * RESTful API for UQlearn 3-Month Student Enrollment & Rating Growth Package Pricing
 * Endpoint: /api/v1/enrollment-pricing.php
 * Handles reading and updating the 3-month mock student enrollment and star rating pricing configuration.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Ensure enrollment_pricing table exists in MySQL database
    $conn->query("CREATE TABLE IF NOT EXISTS `enrollment_pricing` (
        `id` VARCHAR(64) PRIMARY KEY,
        `package_name` VARCHAR(255) NOT NULL DEFAULT '3-Month Mock Student Enrollment & Rating Growth Package',
        `duration_months` INT NOT NULL DEFAULT 3,
        `student_step_unit` INT NOT NULL DEFAULT 100,
        `price_per_unit_usd` DECIMAL(10,2) NOT NULL DEFAULT 0.15,
        `default_rating` DECIMAL(3,2) NOT NULL DEFAULT 4.90,
        `min_students` INT NOT NULL DEFAULT 100,
        `max_students` INT NOT NULL DEFAULT 10000,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Seed default record if empty
    $checkEmpty = $conn->query("SELECT COUNT(*) as cnt FROM `enrollment_pricing`");
    if ($checkEmpty) {
        $row = $checkEmpty->fetch_assoc();
        if ((int)$row['cnt'] === 0) {
            $conn->query("INSERT INTO `enrollment_pricing` 
                (`id`, `package_name`, `duration_months`, `student_step_unit`, `price_per_unit_usd`, `default_rating`, `min_students`, `max_students`, `is_active`) 
                VALUES 
                ('standard_3month_boost', '3-Month Mock Student Enrollment & Rating Growth Package', 3, 100, 0.15, 4.90, 100, 10000, 1)");
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // -------------------------------------------------------------------------
    // GET: Fetch the current enrollment pricing configuration
    // -------------------------------------------------------------------------
    if ($method === 'GET') {
        $res = $conn->query("SELECT * FROM `enrollment_pricing` WHERE `id` = 'standard_3month_boost' LIMIT 1");
        if (!$res || $res->num_rows === 0) {
            $res = $conn->query("SELECT * FROM `enrollment_pricing` LIMIT 1");
        }

        if ($res && $row = $res->fetch_assoc()) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => $row['id'],
                    'packageName' => $row['package_name'],
                    'durationMonths' => (int)$row['duration_months'],
                    'studentStepUnit' => (int)$row['student_step_unit'],
                    'pricePerUnitUsd' => (float)$row['price_per_unit_usd'],
                    'defaultRating' => (float)$row['default_rating'],
                    'minStudents' => (int)$row['min_students'],
                    'maxStudents' => (int)$row['max_students'],
                    'isActive' => (bool)$row['is_active'],
                    'updatedAt' => $row['updated_at']
                ]
            ]);
            exit;
        }

        // Fallback default response if query returned no rows
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => 'standard_3month_boost',
                'packageName' => '3-Month Mock Student Enrollment & Rating Growth Package',
                'durationMonths' => 3,
                'studentStepUnit' => 100,
                'pricePerUnitUsd' => 0.15,
                'defaultRating' => 4.90,
                'minStudents' => 100,
                'maxStudents' => 10000,
                'isActive' => true
            ]
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST: Save or update enrollment pricing configuration
    // -------------------------------------------------------------------------
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data || !is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON payload received.']);
            exit;
        }

        $id = !empty($data['id']) ? trim($data['id']) : 'standard_3month_boost';
        $packageName = !empty($data['packageName']) ? trim($data['packageName']) : '3-Month Mock Student Enrollment & Rating Growth Package';
        $durationMonths = isset($data['durationMonths']) ? max(1, (int)$data['durationMonths']) : 3;
        $studentStepUnit = isset($data['studentStepUnit']) ? max(10, (int)$data['studentStepUnit']) : 100;
        $pricePerUnitUsd = isset($data['pricePerUnitUsd']) ? max(0.01, (float)$data['pricePerUnitUsd']) : 0.15;
        $defaultRating = isset($data['defaultRating']) ? min(5.0, max(1.0, (float)$data['defaultRating'])) : 4.90;
        $minStudents = isset($data['minStudents']) ? max(10, (int)$data['minStudents']) : 100;
        $maxStudents = isset($data['maxStudents']) ? max(500, (int)$data['maxStudents']) : 10000;
        $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1;

        $stmt = $conn->prepare("INSERT INTO `enrollment_pricing` 
            (`id`, `package_name`, `duration_months`, `student_step_unit`, `price_per_unit_usd`, `default_rating`, `min_students`, `max_students`, `is_active`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                `package_name` = VALUES(`package_name`),
                `duration_months` = VALUES(`duration_months`),
                `student_step_unit` = VALUES(`student_step_unit`),
                `price_per_unit_usd` = VALUES(`price_per_unit_usd`),
                `default_rating` = VALUES(`default_rating`),
                `min_students` = VALUES(`min_students`),
                `max_students` = VALUES(`max_students`),
                `is_active` = VALUES(`is_active`),
                `updated_at` = CURRENT_TIMESTAMP");

        if ($stmt) {
            $stmt->bind_param('ssiiddiii', $id, $packageName, $durationMonths, $studentStepUnit, $pricePerUnitUsd, $defaultRating, $minStudents, $maxStudents, $isActive);
            $stmt->execute();
            $stmt->close();

            echo json_encode([
                'success' => true,
                'message' => '3-Month Mock Student Enrollment & Rating Growth Package Pricing saved to database successfully.',
                'data' => [
                    'id' => $id,
                    'packageName' => $packageName,
                    'durationMonths' => $durationMonths,
                    'studentStepUnit' => $studentStepUnit,
                    'pricePerUnitUsd' => $pricePerUnitUsd,
                    'defaultRating' => $defaultRating,
                    'minStudents' => $minStudents,
                    'maxStudents' => $maxStudents,
                    'isActive' => (bool)$isActive,
                    'updatedAt' => date('Y-m-d H:i:s')
                ]
            ]);
            exit;
        } else {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database operation error: ' . $e->getMessage()
    ]);
}
