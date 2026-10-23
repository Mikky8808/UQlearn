<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

// Automatically ensure signatures table exists in the database
try {
    if (isset($pdo)) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS signatures (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            signature_data LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
} catch (Exception $e) {
    // Continue gracefully if table already exists or permissions restrict DDL
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? $_GET['user_id'] ?? $_GET['id'] ?? '';
    if (!$userId) {
        echo json_encode(['success' => false, 'message' => 'Missing userId parameter']);
        exit;
    }
    
    try {
        if (!isset($pdo)) {
            echo json_encode(['success' => false, 'message' => 'Database connection unavailable']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT signature_data, updated_at FROM signatures WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['signature_data'])) {
            echo json_encode([
                'success' => true,
                'signatureData' => $row['signature_data'],
                'updatedAt' => $row['updated_at'] ?? null
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'signatureData' => null,
                'message' => 'No signature recorded for this user yet'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} 
else if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!is_array($data) || empty($data)) {
        $data = $_POST;
    }

    $action = $data['action'] ?? 'save_signature';
    $userId = $data['userId'] ?? $data['user_id'] ?? '';
    $sigData = $data['signatureData'] ?? $data['signature'] ?? '';

    if (empty($userId) || empty($sigData)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Missing required fields: userId and signatureData must be provided'
        ]);
        exit;
    }

    try {
        if (!isset($pdo)) {
            echo json_encode(['success' => false, 'message' => 'Database connection unavailable']);
            exit;
        }

        $stmt = $pdo->prepare("REPLACE INTO signatures (user_id, signature_data) VALUES (?, ?)");
        $stmt->execute([$userId, $sigData]);

        echo json_encode([
            'success' => true,
            'message' => 'Signature successfully saved to database',
            'userId' => $userId
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
