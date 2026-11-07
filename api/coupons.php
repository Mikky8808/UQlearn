<?php
require_once __DIR__ . '/cors.php';
/**
 * RESTful API for UQlearn Coupons & Discounts
 * Compatible with Shared Hosting (PHP 7.4+)
 * Path: /api/v1/coupons.php
 */

date_default_timezone_set('Africa/Nairobi');

header('Content-Type: application/json; charset=utf-8');


try {
    require_once __DIR__ . '/db.php';

    // Ensure table exists
    $conn->query("CREATE TABLE IF NOT EXISTS `coupons` (
      `id` VARCHAR(64) PRIMARY KEY,
      `code` VARCHAR(50) NOT NULL UNIQUE,
      `discount_type` ENUM('percentage', 'fixed') DEFAULT 'percentage',
      `discount_value` DECIMAL(10,2) NOT NULL,
      `max_uses` INT DEFAULT 100,
      `current_uses` INT DEFAULT 0,
      `expires_at` DATETIME DEFAULT NULL,
      `is_active` TINYINT(1) DEFAULT 1,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX `idx_code` (`code`),
      INDEX `idx_active` (`is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $method = $_SERVER['REQUEST_METHOD'];

    function formatCoupon($row) {
        return [
            'id' => $row['id'],
            'code' => strtoupper($row['code']),
            'discountType' => $row['discount_type'] ?? 'percentage',
            'discount_type' => $row['discount_type'] ?? 'percentage',
            'discountValue' => (float)$row['discount_value'],
            'discount_value' => (float)$row['discount_value'],
            'maxUses' => (int)($row['max_uses'] ?? 100),
            'max_uses' => (int)($row['max_uses'] ?? 100),
            'currentUses' => (int)($row['current_uses'] ?? 0),
            'current_uses' => (int)($row['current_uses'] ?? 0),
            'expiresAt' => $row['expires_at'],
            'expires_at' => $row['expires_at'],
            'isActive' => (bool)$row['is_active'],
            'is_active' => (int)$row['is_active'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'] ?? $row['created_at']
        ];
    }

    if ($method === 'GET') {
        $code = isset($_GET['code']) ? trim($_GET['code']) : '';
        if (!empty($code)) {
            $codeSafe = $conn->real_escape_string(strtoupper($code));
            $stmt = $conn->query("SELECT * FROM coupons WHERE UPPER(code) = '$codeSafe' LIMIT 1");
            if ($stmt && $stmt->num_rows > 0) {
                $coupon = $stmt->fetch_assoc();
                echo json_encode(["success" => true, "data" => formatCoupon($coupon)]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Coupon not found"]);
            }
        } else {
            $result = $conn->query("SELECT * FROM coupons ORDER BY created_at DESC");
            $coupons = [];
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $coupons[] = formatCoupon($row);
                }
            }
            echo json_encode(["success" => true, "data" => $coupons]);
        }
    } elseif ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);

        if (!$data || !is_array($data)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid JSON payload"]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $action = $data['action'] ?? ($_GET['action'] ?? '');

        // 1. Validate / Apply Coupon
        if ($action === 'apply' || $action === 'validate') {
            $code = strtoupper(trim($data['code'] ?? ''));
            if (empty($code)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Coupon code is required."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            $codeSafe = $conn->real_escape_string($code);
            $res = $conn->query("SELECT * FROM coupons WHERE UPPER(code) = '$codeSafe' LIMIT 1");
            if (!$res || $res->num_rows === 0) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Invalid coupon code."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            $coupon = $res->fetch_assoc();
            if (!$coupon['is_active']) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "This coupon is currently inactive."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            if (!empty($coupon['expires_at']) && strtotime($coupon['expires_at']) < time()) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "This coupon has expired."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            if ($coupon['max_uses'] > 0 && $coupon['current_uses'] >= $coupon['max_uses']) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Coupon usage limit has been reached."]);
                if (isset($conn) && $conn instanceof mysqli) $conn->close();
                exit();
            }

            echo json_encode([
                "success" => true,
                "message" => "Coupon applied successfully.",
                "data" => formatCoupon($coupon)
            ]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // 2. Generate Random Coupon
        if ($action === 'generate') {
            $id = 'coup_' . bin2hex(random_bytes(8));
            $code = strtoupper(substr(md5(uniqid()), 0, 8));
            $type = $data['discount_type'] ?? ($data['discountType'] ?? 'percentage');
            $value = isset($data['discount_value']) ? (float)$data['discount_value'] : (isset($data['discountValue']) ? (float)$data['discountValue'] : 10.00);
            $maxUses = isset($data['max_uses']) ? (int)$data['max_uses'] : (isset($data['maxUses']) ? (int)$data['maxUses'] : 100);
            $expiresAt = $data['expires_at'] ?? ($data['expiresAt'] ?? null);

            $stmt = $conn->prepare("INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sssdis", $id, $code, $type, $value, $maxUses, $expiresAt);
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Coupon generated successfully.",
                        "data" => ["id" => $id, "code" => $code, "discountType" => $type, "discountValue" => $value]
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "message" => $stmt->error]);
                }
                $stmt->close();
            }
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        // 3. Create or Update Specified Coupon
        $id = !empty($data['id']) ? trim($data['id']) : 'coup_' . bin2hex(random_bytes(8));
        $code = strtoupper(trim($data['code'] ?? ''));
        if (empty($code)) {
            $code = strtoupper(substr(md5(uniqid()), 0, 8));
        }
        $type = $data['discount_type'] ?? ($data['discountType'] ?? 'percentage');
        $value = isset($data['discount_value']) ? (float)$data['discount_value'] : (isset($data['discountValue']) ? (float)$data['discountValue'] : 10.00);
        $maxUses = isset($data['max_uses']) ? (int)$data['max_uses'] : (isset($data['maxUses']) ? (int)$data['maxUses'] : 100);
        $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : ($data['is_active'] ?? 1);
        $expiresAt = !empty($data['expires_at']) ? $data['expires_at'] : (!empty($data['expiresAt']) ? $data['expiresAt'] : null);

        $stmt = $conn->prepare("
            INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, is_active, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                code = VALUES(code),
                discount_type = VALUES(discount_type),
                discount_value = VALUES(discount_value),
                max_uses = VALUES(max_uses),
                is_active = VALUES(is_active),
                expires_at = VALUES(expires_at)
        ");

        if ($stmt) {
            $stmt->bind_param("sssdiss", $id, $code, $type, $value, $maxUses, $isActive, $expiresAt);
            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Coupon saved successfully.",
                    "data" => [
                        "id" => $id,
                        "code" => $code,
                        "discountType" => $type,
                        "discountValue" => $value,
                        "maxUses" => $maxUses,
                        "isActive" => (bool)$isActive,
                        "expiresAt" => $expiresAt
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $stmt->error]);
            }
            $stmt->close();
        }
    } elseif ($method === 'DELETE') {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        $id = isset($_GET['id']) ? trim($_GET['id']) : ($data['id'] ?? '');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon ID required for deletion."]);
            if (isset($conn) && $conn instanceof mysqli) $conn->close();
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM coupons WHERE id = ?");
        if ($stmt) {
            $stmt->bind_param("s", $id);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Coupon deleted successfully."]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $stmt->error]);
            }
            $stmt->close();
        }
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

} catch (\Throwable $err) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Coupons API error: " . $err->getMessage()
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
