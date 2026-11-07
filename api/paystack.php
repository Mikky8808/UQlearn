<?php
// ============================================================
// PAYSTACK PAYMENT ENDPOINT
// ============================================================
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/cors.php';

$config = file_exists(__DIR__ . '/paystack-keys.php') 
    ? require __DIR__ . '/paystack-keys.php' 
    : (file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : []);

$PAYSTACK_SECRET_KEY = $config['paystack']['secret_key'] ?? 'sk_live_f57fdd97f82425508e6542e9b59c9bdce105caa0';
$PAYSTACK_PUBLIC_KEY = $config['paystack']['public_key'] ?? 'pk_live_b7f1f56f379b773724bf604cfcfb8eeed36e482c';
$CURRENCY            = $config['paystack']['currency'] ?? 'KES';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $email  = trim($input['email'] ?? '');
    $amount = trim($input['amount'] ?? '');
    $currency = trim($input['currency'] ?? $CURRENCY);

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => false, 'message' => 'Please enter a valid email address.']);
        exit;
    }

    if ($amount === '' || !is_numeric($amount) || (float)$amount <= 0) {
        echo json_encode(['status' => false, 'message' => 'Please enter a valid amount greater than 0.']);
        exit;
    }

    $reference = 'PSK_' . time() . '_' . rand(1000, 9999);
    $amountInSubunit = (int) round((float)$amount * 100);

    $initData = [
        'email'        => $email,
        'amount'       => $amountInSubunit,
        'currency'     => $currency,
        'reference'    => $reference,
        'channels'     => ['card'],
        'callback_url' => !empty($input['callback_url']) 
            ? trim($input['callback_url']) 
            : ('http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['PHP_SELF']), '/\\') . '/paystack-callback.php'),
    ];

    $ch = curl_init('https://api.paystack.co/transaction/initialize');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($initData),
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $PAYSTACK_SECRET_KEY,
            'Content-Type: application/json',
        ],
    ]);
    $initResponse = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (empty($initResponse['status'])) {
        echo json_encode([
            'status' => false,
            'message' => 'Could not initialize payment: ' . ($initResponse['message'] ?? 'Unknown error'),
            'data' => null
        ]);
        exit;
    }

    echo json_encode([
        'status' => true,
        'message' => 'Payment initialized',
        'publicKey' => $PAYSTACK_PUBLIC_KEY,
        'data' => [
            'access_code' => $initResponse['data']['access_code'],
            'reference' => $reference,
            'amount' => (float)$amount,
            'amountInSubunit' => $amountInSubunit,
            'currency' => $currency,
            'email' => $email,
            'authorization_url' => $initResponse['data']['authorization_url'] ?? ''
        ]
    ]);
    exit;
}

if (isset($_GET['reference']) || isset($_GET['verify'])) {
    $ref = $_GET['reference'] ?? $_GET['verify'];
    $ch = curl_init('https://api.paystack.co/transaction/verify/' . rawurlencode($ref));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $PAYSTACK_SECRET_KEY],
    ]);
    $verification = json_decode(curl_exec($ch), true);
    curl_close($ch);

    echo json_encode($verification);
    exit;
}

echo json_encode(['status' => false, 'message' => 'Invalid request']);
