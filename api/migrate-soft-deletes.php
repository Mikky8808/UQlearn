<?php
require_once __DIR__ . '/cors.php';
/**
 * Safe Database Migration for Soft Deletes
 * Path: /api/v1/migrate-soft-deletes.php
 * This script adds `is_deleted` and `deleted_at` columns to tables without deleting any data.
 */
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

$tables_to_update = [
    'users',
    'price_adjustments',
    'modules',
    'lessons',
    'courses',
    'quizzes',
    'course_categories'
];

$results = [];
$errors = [];

foreach ($tables_to_update as $table) {
    // Check if table exists
    $check_table = $conn->query("SHOW TABLES LIKE '$table'");
    if ($check_table->num_rows > 0) {
        // Check if `is_deleted` column already exists
        $check_col = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'is_deleted'");
        
        if ($check_col->num_rows == 0) {
            // Column does not exist, add it
            $sql = "ALTER TABLE `$table` 
                    ADD `is_deleted` TINYINT(1) NOT NULL DEFAULT 0, 
                    ADD `deleted_at` DATETIME NULL";
            
            if ($conn->query($sql) === TRUE) {
                $results[] = "Successfully added soft delete columns to '$table'";
            } else {
                $errors[] = "Error updating '$table': " . $conn->error;
            }
        } else {
            $results[] = "Table '$table' already has soft delete columns (Skipped)";
        }
    } else {
        $errors[] = "Table '$table' does not exist in the database.";
    }
}

echo json_encode([
    'success' => count($errors) === 0,
    'message' => 'Migration completed',
    'logs' => $results,
    'errors' => $errors
], JSON_PRETTY_PRINT);
