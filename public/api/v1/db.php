<?php
// db.php - Database connection for Uqlearn shared host API
$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$dbname = getenv('DB_NAME') ?: 'uqlearn';

$conn = @new mysqli($host, $user, $pass, $dbname);

if ($conn && !$conn->connect_error) {
    $conn->set_charset("utf8mb4");
}
?>
