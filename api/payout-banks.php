<?php
require_once __DIR__ . '/cors.php';
/**
 * Supported Payout Banks API Endpoint (PHP Backend for Shared Hosting / MySQL)
 * LMS Platform - UQlearn
 * 
 * Path: /api/v1/payout-banks.php
 * 
 * Manages approved banks for each supported country.
 * Instructors select their bank from this list when setting up bank payout details.
 */

date_default_timezone_set('Africa/Nairobi');
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/db.php';

    // Auto-create payout_banks table if it doesn't exist
    $createTableSql = "CREATE TABLE IF NOT EXISTS `payout_banks` (
        `id` VARCHAR(64) PRIMARY KEY,
        `country_id` VARCHAR(64) NOT NULL,
        `country_name` VARCHAR(128) DEFAULT NULL,
        `name` VARCHAR(255) NOT NULL,
        `code` VARCHAR(32) DEFAULT NULL,
        `is_active` TINYINT(1) DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_country_id` (`country_id`),
        INDEX `idx_bank_active` (`is_active`),
        INDEX `idx_bank_name` (`name`),
        INDEX `idx_bank_code` (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    @$conn->query($createTableSql);

    // Ensure code column exists if table was previously created
    @$conn->query("ALTER TABLE `payout_banks` ADD COLUMN IF NOT EXISTS `code` VARCHAR(32) DEFAULT NULL AFTER `name`");

    // Standard list of licensed Kenya banks
    $kenyaBanks = [
        ['name' => 'KCB Bank Kenya', 'code' => 'KCB'],
        ['name' => 'Equity Bank Kenya', 'code' => 'EQTY'],
        ['name' => 'Co-operative Bank of Kenya', 'code' => 'COOP'],
        ['name' => 'NCBA Bank Kenya', 'code' => 'NCBA'],
        ['name' => 'Absa Bank Kenya', 'code' => 'ABSA'],
        ['name' => 'Standard Chartered Bank Kenya', 'code' => 'SCBL'],
        ['name' => 'Stanbic Bank Kenya', 'code' => 'SBIC'],
        ['name' => 'Diamond Trust Bank (DTB)', 'code' => 'DTB'],
        ['name' => 'I&M Bank Kenya', 'code' => 'IMBL'],
        ['name' => 'Family Bank', 'code' => 'FABL'],
        ['name' => 'Prime Bank Kenya', 'code' => 'PRMB'],
        ['name' => 'SBM Bank Kenya', 'code' => 'SBMA'],
        ['name' => 'Kingdom Bank Kenya', 'code' => 'KNDM'],
        ['name' => 'Gulf African Bank', 'code' => 'GABK'],
        ['name' => 'Premier Bank Kenya', 'code' => 'PRMR'],
        ['name' => 'Credit Bank Kenya', 'code' => 'CRDB'],
        ['name' => 'Sidian Bank', 'code' => 'SIDN'],
        ['name' => 'Guardian Bank', 'code' => 'GRDN'],
        ['name' => 'Bank of Africa Kenya (BOA)', 'code' => 'BOAK'],
        ['name' => 'Consolidated Bank of Kenya', 'code' => 'CNSL'],
        ['name' => 'Development Bank of Kenya', 'code' => 'DEVB'],
        ['name' => 'Victoria Commercial Bank', 'code' => 'VCBK'],
        ['name' => 'Habib Bank AG Zurich', 'code' => 'HBZU'],
        ['name' => 'Middle East Bank Kenya', 'code' => 'MEBK'],
        ['name' => 'UBA Kenya Bank (United Bank for Africa)', 'code' => 'UBAK'],
        ['name' => 'Postbank (Kenya Post Office Savings Bank)', 'code' => 'POST'],
        ['name' => 'Faulu Microfinance Bank', 'code' => 'FAUL'],
        ['name' => 'Kenya Women Microfinance Bank (KWFT)', 'code' => 'KWFT'],
        ['name' => 'Caritas Microfinance Bank', 'code' => 'CRTS'],
        ['name' => 'DIB Bank Kenya (Dubai Islamic Bank)', 'code' => 'DIBK'],
        ['name' => 'Mayfair CIB Bank', 'code' => 'MCIB'],
        ['name' => 'M-Pesa (Safaricom Business Settlement)', 'code' => 'MPESA']
    ];

    // Auto-seed Kenya banks if table has no banks for Kenya
    $checkKe = @$conn->query("SELECT COUNT(*) as cnt FROM `payout_banks` WHERE `country_id` = 'pc-ke'");
    $cntRow = $checkKe ? $checkKe->fetch_assoc() : null;
    if ($cntRow && (int)$cntRow['cnt'] === 0) {
        $stmt = @$conn->prepare("INSERT IGNORE INTO `payout_banks` (`id`, `country_id`, `country_name`, `name`, `code`, `is_active`) VALUES (?, 'pc-ke', 'Kenya', ?, ?, 1)");
        if ($stmt) {
            foreach ($kenyaBanks as $b) {
                $bId = 'pb-ke-' . preg_replace('/[^a-z0-9]/', '', strtolower($b['name']));
                $stmt->bind_param('ssss', $bId, $b['name'], $b['code']);
                $stmt->execute();
            }
            $stmt->close();
        }
    }

    // Helper: Map database row to camelCase & standard types
    function formatPayoutBank($row) {
        return [
            'id' => (string)$row['id'],
            'countryId' => (string)$row['country_id'],
            'countryName' => (string)($row['country_name'] ?? ''),
            'name' => (string)$row['name'],
            'code' => (string)($row['code'] ?? ''),
            'isActive' => (bool)$row['is_active'],
            'createdAt' => (string)($row['created_at'] ?? ''),
            'updatedAt' => (string)($row['updated_at'] ?? '')
        ];
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // Parse incoming JSON body or fallback to $_POST
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true);
    if (!is_array($body)) {
        $body = $_POST;
    }

    $action = trim($_GET['action'] ?? ($body['action'] ?? ''));

    // Handle Seed Kenya explicit action
    if ($action === 'seed_kenya') {
        $seededCount = 0;
        $stmt = @$conn->prepare("INSERT INTO `payout_banks` (`id`, `country_id`, `country_name`, `name`, `code`, `is_active`) VALUES (?, 'pc-ke', 'Kenya', ?, ?, 1) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `code` = VALUES(`code`), `country_name` = 'Kenya', `is_active` = 1");
        if ($stmt) {
            foreach ($kenyaBanks as $b) {
                $bId = 'pb-ke-' . preg_replace('/[^a-z0-9]/', '', strtolower($b['name']));
                $stmt->bind_param('ssss', $bId, $b['name'], $b['code']);
                if ($stmt->execute()) {
                    $seededCount++;
                }
            }
            $stmt->close();
        }
        echo json_encode([
            'success' => true,
            'message' => "Seeded {$seededCount} Kenya banks successfully",
            'count' => $seededCount
        ]);
        exit();
    }

    // =========================================================================
    // Handle GET: Fetch banks
    // =========================================================================
    if ($method === 'GET') {
        $countryId = trim($_GET['country_id'] ?? ($_GET['countryId'] ?? ''));
        // Ignore literal 'undefined' or 'null' passed by bad frontend query strings
        if ($countryId === 'undefined' || $countryId === 'null') {
            $countryId = '';
        }

        $countryName = trim($_GET['country_name'] ?? ($_GET['countryName'] ?? ''));
        if ($countryName === 'undefined' || $countryName === 'null') {
            $countryName = '';
        }

        $activeOnly = isset($_GET['active_only']) && ($_GET['active_only'] === '1' || $_GET['active_only'] === 'true');

        $where = [];
        $params = [];
        $types = '';

        if (!empty($countryId)) {
            // Match either by country_id or country_name for maximum flexibility
            $where[] = "(`country_id` = ? OR `country_name` = ?)";
            $params[] = $countryId;
            $params[] = $countryId;
            $types .= 'ss';
        } elseif (!empty($countryName)) {
            $where[] = "(`country_name` = ? OR `country_id` = ?)";
            $params[] = $countryName;
            $params[] = $countryName;
            $types .= 'ss';
        }

        if ($activeOnly) {
            $where[] = "`is_active` = 1";
        }

        $sql = "SELECT * FROM `payout_banks`";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY `name` ASC";

        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if ($stmt) {
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
            } else {
                $result = $conn->query($sql);
            }
        } else {
            $result = $conn->query($sql);
        }

        $banks = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $banks[] = formatPayoutBank($row);
            }
        }

        echo json_encode([
            'success' => true,
            'count' => count($banks),
            'data' => $banks
        ]);
        exit();
    }

    // =========================================================================
    // Handle DELETE: Remove a bank
    // =========================================================================
    if ($method === 'DELETE' || $action === 'delete') {
        $id = trim($_GET['id'] ?? ($body['id'] ?? ''));
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Bank ID is required for deletion']);
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM `payout_banks` WHERE `id` = ?");
        if ($stmt) {
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode(['success' => true, 'message' => 'Bank deleted successfully', 'id' => $id]);
        exit();
    }

    // =========================================================================
    // Handle TOGGLE ACTIVE: Activate / Deactivate a bank
    // =========================================================================
    if ($action === 'toggle_active' || ($method === 'PATCH' && (isset($_GET['id']) || isset($body['id'])) && (isset($body['active']) || isset($body['isActive']) || isset($_GET['active'])))) {
        $id = trim($body['id'] ?? ($_GET['id'] ?? ''));
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Bank ID is required']);
            exit();
        }

        $isActive = 1;
        if (isset($body['isActive'])) {
            $isActive = $body['isActive'] ? 1 : 0;
        } elseif (isset($body['active'])) {
            $isActive = $body['active'] ? 1 : 0;
        } elseif (isset($_GET['active'])) {
            $isActive = ($_GET['active'] === '1' || $_GET['active'] === 'true') ? 1 : 0;
        }

        $stmt = $conn->prepare("UPDATE `payout_banks` SET `is_active` = ?, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = ?");
        if ($stmt) {
            $stmt->bind_param("is", $isActive, $id);
            $stmt->execute();
            $stmt->close();
        }

        echo json_encode([
            'success' => true, 
            'message' => 'Status updated successfully', 
            'id' => $id,
            'isActive' => (bool)$isActive
        ]);
        exit();
    }

    // =========================================================================
    // Handle CREATE / UPDATE (POST / PUT / PATCH)
    // =========================================================================
    if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH' || $action === 'create' || $action === 'update' || $action === 'save') {
        $id = trim($body['id'] ?? ($_GET['id'] ?? ''));
        $name = trim($body['name'] ?? '');
        $code = trim($body['code'] ?? '');
        $countryId = trim($body['countryId'] ?? ($body['country_id'] ?? ($_GET['countryId'] ?? ($_GET['country_id'] ?? ''))));
        $countryName = trim($body['countryName'] ?? ($body['country_name'] ?? ($_GET['countryName'] ?? ($_GET['country_name'] ?? ''))));

        $hasActive = isset($body['isActive']) || isset($body['active']);
        $isActive = isset($body['isActive']) ? ($body['isActive'] ? 1 : 0) : (isset($body['active']) ? ($body['active'] ? 1 : 0) : 1);

        // Check if updating an existing record by ID
        $existingRow = null;
        if (!empty($id)) {
            $checkStmt = $conn->prepare("SELECT * FROM `payout_banks` WHERE `id` = ? LIMIT 1");
            if ($checkStmt) {
                $checkStmt->bind_param("s", $id);
                $checkStmt->execute();
                $checkRes = $checkStmt->get_result();
                if ($checkRes && ($r = $checkRes->fetch_assoc())) {
                    $existingRow = $r;
                }
                $checkStmt->close();
            }
        }

        // If existing record found, perform targeted update without requiring all fields
        if ($existingRow) {
            $finalName = !empty($name) ? $name : $existingRow['name'];
            $finalCode = !empty($code) ? $code : ($existingRow['code'] ?? '');
            $finalCountryId = !empty($countryId) ? $countryId : $existingRow['country_id'];
            $finalCountryName = !empty($countryName) ? $countryName : ($existingRow['country_name'] ?? '');
            $finalActive = $hasActive ? $isActive : (int)$existingRow['is_active'];

            $updateSql = "UPDATE `payout_banks` SET `name` = ?, `code` = ?, `country_id` = ?, `country_name` = ?, `is_active` = ?, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = ?";
            $upStmt = $conn->prepare($updateSql);
            if ($upStmt) {
                $upStmt->bind_param("ssssis", $finalName, $finalCode, $finalCountryId, $finalCountryName, $finalActive, $id);
                $upStmt->execute();
                $upStmt->close();
            }

            // Return updated bank
            $savedBank = [
                'id' => $id,
                'countryId' => $finalCountryId,
                'countryName' => $finalCountryName,
                'name' => $finalName,
                'code' => $finalCode,
                'isActive' => (bool)$finalActive,
                'createdAt' => $existingRow['created_at'],
                'updatedAt' => date('Y-m-d H:i:s')
            ];

            echo json_encode([
                'success' => true,
                'message' => 'Bank updated successfully',
                'data' => $savedBank
            ]);
            exit();
        }

        // Otherwise this is a NEW bank creation
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Bank name is required']);
            exit();
        }

        if (empty($countryId)) {
            // Default to pc-ke if country name is Kenya
            if (strtolower($countryName) === 'kenya') {
                $countryId = 'pc-ke';
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Country ID is required for new bank creation']);
                exit();
            }
        }

        if (empty($id)) {
            $cleanName = preg_replace('/[^a-z0-9]/', '', strtolower($name));
            $prefix = preg_replace('/[^a-z0-9]/', '', strtolower(str_replace('pc-', '', $countryId)));
            if (empty($prefix)) $prefix = 'bank';
            $id = 'pb-' . substr($prefix, 0, 4) . '-' . substr($cleanName, 0, 16) . '-' . substr(md5($name . microtime()), 0, 4);
        }

        $upsertSql = "INSERT INTO `payout_banks` (`id`, `country_id`, `country_name`, `name`, `code`, `is_active`, `created_at`, `updated_at`)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE 
                `name` = VALUES(`name`),
                `code` = VALUES(`code`),
                `is_active` = VALUES(`is_active`),
                `country_id` = VALUES(`country_id`),
                `country_name` = VALUES(`country_name`),
                `updated_at` = CURRENT_TIMESTAMP";

        $stmt = $conn->prepare($upsertSql);
        if ($stmt) {
            $stmt->bind_param("sssssi", $id, $countryId, $countryName, $name, $code, $isActive);
            $stmt->execute();
            $stmt->close();
        }

        // Fetch freshly created record
        $savedBank = null;
        $getStmt = $conn->prepare("SELECT * FROM `payout_banks` WHERE `id` = ? LIMIT 1");
        if ($getStmt) {
            $getStmt->bind_param("s", $id);
            $getStmt->execute();
            $res = $getStmt->get_result();
            if ($res && ($row = $res->fetch_assoc())) {
                $savedBank = formatPayoutBank($row);
            }
            $getStmt->close();
        }

        if (!$savedBank) {
            $savedBank = [
                'id' => $id,
                'countryId' => $countryId,
                'countryName' => $countryName,
                'name' => $name,
                'code' => $code,
                'isActive' => (bool)$isActive,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s')
            ];
        }

        echo json_encode([
            'success' => true,
            'message' => 'Bank saved successfully',
            'data' => $savedBank
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server Error: ' . $e->getMessage()
    ]);
}
