<?php
require_once __DIR__ . '/cors.php';
/**
 * PayHero Configuration & Credentials Store
 * Path: /api/v1/ph.php
 */

return [
    'api_key' => 'a7pjzstMR8Dy4gDGHiBp',
    'api_secret' => 'OMJvzh7oKUgrny5ViHBB7bedsEhH2OeONLybORA5',
    'auth_token' => 'Basic YTdwanpzdE1SOER5NGdER0hpQnA6T01KdnpoN29LVWdybnk1VmlIQkI3YmVkc0VoSDJPZU9OTHliT1JBNQ==',
    'channel_id' => 3501,
    'provider' => 'm-pesa',
    'environment' => 'production',
    'endpoint_stk' => 'https://backend.payhero.co.ke/api/v2/payments',
    'endpoint_status' => 'https://backend.payhero.co.ke/api/v2/transaction-status'
];
?>
