<?php
require_once __DIR__ . '/cors.php';
/**
 * Database Synchronization & Table Hub API - API v1
 * Path: /api/v1/sync.php
 * 
 * Provides unified access to all database tables in `uqlearno_lms`
 * Allows reading, exporting, importing, and synchronizing data
 * between AI Studio development environment and the live database.
 * 
 * AUTOMATIC SCHEMA MIGRATION:
 * When synchronizing, it automatically inspects live MySQL tables
 * and issues `ALTER TABLE ADD COLUMN` statements if any required
 * or payload columns are missing.
 */

// =========================================================================
// 1. Set Timezone & CORS
// =========================================================================
date_default_timezone_set('Africa/Nairobi');

header("Content-Type: application/json; charset=UTF-8");


// =========================================================================
// 2. Include Database Connection
// =========================================================================
require_once __DIR__ . '/db.php';

// Allowed tables for security
$allowed_tables = [
    'users',
    'email_verifications',
    'settings',
    'course_categories',
    'courses',
    'modules',
    'lessons',
    'learning_outcomes',
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'purchases',
    'coupons',
    'asset_folders',
    'uploaded_assets',
    'banners',
    'payment_gateways',
    'video_playback_progress'
];

// Schema dictionary of all canonical table columns and their MySQL definitions
$canonical_schema = [
    'users' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'role' => "ENUM('learner','instructor','admin') NOT NULL DEFAULT 'learner'",
        'first_name' => "VARCHAR(100) NOT NULL",
        'last_name' => "VARCHAR(100) NOT NULL",
        'email' => "VARCHAR(191) NOT NULL",
        'password_hash' => "VARCHAR(255) DEFAULT NULL",
        'country_code' => "VARCHAR(10) DEFAULT '+254'",
        'phone_number' => "VARCHAR(30) DEFAULT NULL",
        'preferred_language' => "VARCHAR(20) DEFAULT 'en'",
        'avatar_url' => "TEXT DEFAULT NULL",
        'auth_provider' => "ENUM('email','google','apple') NOT NULL DEFAULT 'email'",
        'firebase_uid' => "VARCHAR(128) DEFAULT NULL",
        'agreed_terms' => "TINYINT(1) NOT NULL DEFAULT 1",
        'agreed_marketing' => "TINYINT(1) NOT NULL DEFAULT 0",
        'is_email_verified' => "TINYINT(1) NOT NULL DEFAULT 0",
        'last_login_at' => "TIMESTAMP NULL DEFAULT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'email_verifications' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'email' => "VARCHAR(191) NOT NULL",
        'otp_code' => "VARCHAR(10) NOT NULL",
        'is_used' => "TINYINT(1) DEFAULT 0",
        'expires_at' => "DATETIME NOT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'settings' => [
        'setting_key' => "VARCHAR(128) NOT NULL PRIMARY KEY",
        'setting_value' => "LONGTEXT DEFAULT NULL",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'course_categories' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'name' => "VARCHAR(100) NOT NULL",
        'slug' => "VARCHAR(120) NOT NULL",
        'description' => "TEXT DEFAULT NULL",
        'icon' => "VARCHAR(50) DEFAULT '📚'",
        'color' => "VARCHAR(100) DEFAULT 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400'",
        'order_index' => "INT(11) DEFAULT 0",
        'is_active' => "TINYINT(1) DEFAULT 1",
        'is_featured' => "TINYINT(1) DEFAULT 0",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'courses' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'title' => "VARCHAR(255) NOT NULL",
        'subtitle' => "TEXT DEFAULT NULL",
        'description' => "LONGTEXT DEFAULT NULL",
        'instructor' => "VARCHAR(150) NOT NULL DEFAULT 'Dr. Angela Vance'",
        'instructor_title' => "VARCHAR(150) DEFAULT 'Senior Instructor'",
        'instructor_avatar' => "TEXT DEFAULT NULL",
        'created_by' => "VARCHAR(64) DEFAULT NULL",
        'category' => "VARCHAR(100) NOT NULL DEFAULT 'Development'",
        'level' => "ENUM('Beginner','Intermediate','Advanced','All Levels') DEFAULT 'Beginner'",
        'price' => "DECIMAL(10,2) NOT NULL DEFAULT 49.99",
        'original_price' => "DECIMAL(10,2) DEFAULT 99.99",
        'rating' => "DECIMAL(3,2) DEFAULT 5.00",
        'review_count' => "INT(11) DEFAULT 0",
        'learners_enrolled' => "INT(11) DEFAULT 0",
        'image' => "TEXT DEFAULT NULL",
        'duration' => "VARCHAR(50) DEFAULT '10.0 hours'",
        'is_published' => "TINYINT(1) DEFAULT 1",
        'best_seller' => "TINYINT(1) DEFAULT 0",
        'is_deleted' => "TINYINT(1) DEFAULT 0",
        'deleted_at' => "DATETIME DEFAULT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'modules' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'course_id' => "VARCHAR(64) NOT NULL",
        'title' => "VARCHAR(255) NOT NULL",
        'description' => "TEXT DEFAULT NULL",
        'order_index' => "INT(11) DEFAULT 0",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'lessons' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'module_id' => "VARCHAR(64) NOT NULL",
        'title' => "VARCHAR(255) NOT NULL",
        'duration' => "VARCHAR(50) DEFAULT '10:00'",
        'type' => "ENUM('video','article','quiz','audio','scorm') DEFAULT 'video'",
        'video_url' => "VARCHAR(255) DEFAULT ''",
        'content' => "LONGTEXT DEFAULT NULL",
        'is_preview' => "TINYINT(1) DEFAULT 0",
        'order_index' => "INT(11) DEFAULT 0",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'quizzes' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'lesson_id' => "VARCHAR(64) NOT NULL",
        'title' => "VARCHAR(255) NOT NULL",
        'description' => "TEXT DEFAULT NULL",
        'passing_score' => "INT(11) DEFAULT 80",
        'time_limit_minutes' => "INT(11) DEFAULT 15",
        'max_attempts' => "INT(11) DEFAULT 3",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'quiz_questions' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'quiz_id' => "VARCHAR(64) NOT NULL",
        'question' => "TEXT NOT NULL",
        'type' => "VARCHAR(50) DEFAULT 'multiple-choice'",
        'points' => "INT(11) DEFAULT 10",
        'difficulty' => "VARCHAR(50) DEFAULT 'Intermediate'",
        'explanation' => "TEXT DEFAULT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'quiz_options' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'question_id' => "VARCHAR(64) NOT NULL",
        'text' => "TEXT NOT NULL",
        'is_correct' => "TINYINT(1) DEFAULT 0",
        'explanation' => "TEXT DEFAULT NULL",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'learning_outcomes' => [
        'id' => "INT(11) AUTO_INCREMENT PRIMARY KEY",
        'course_id' => "VARCHAR(64) NOT NULL",
        'outcome' => "TEXT NOT NULL"
    ],
    'purchases' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'course_id' => "VARCHAR(64) NOT NULL",
        'course_title' => "VARCHAR(255) NOT NULL",
        'amount' => "DECIMAL(10,2) NOT NULL",
        'payment_method' => "VARCHAR(100) DEFAULT 'Credit Card'",
        'date' => "DATE NOT NULL",
        'status' => "ENUM('success','pending','refunded') DEFAULT 'success'",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'coupons' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'code' => "VARCHAR(50) NOT NULL",
        'discount_type' => "ENUM('percentage','fixed') DEFAULT 'percentage'",
        'discount_value' => "DECIMAL(10,2) NOT NULL",
        'max_uses' => "INT(11) DEFAULT 100",
        'current_uses' => "INT(11) DEFAULT 0",
        'expires_at' => "DATETIME DEFAULT NULL",
        'is_active' => "TINYINT(1) DEFAULT 1",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'asset_folders' => [
        'id' => "INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY",
        'user_id' => "VARCHAR(128) NOT NULL",
        'name' => "VARCHAR(255) NOT NULL",
        'parent_id' => "INT(11) DEFAULT NULL",
        'created_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'uploaded_assets' => [
        'id' => "INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY",
        'user_id' => "VARCHAR(128) DEFAULT NULL",
        'folder_id' => "INT(11) DEFAULT NULL",
        'filename' => "VARCHAR(255) NOT NULL",
        'original_name' => "VARCHAR(255) NOT NULL",
        'file_path' => "VARCHAR(512) NOT NULL",
        'file_url' => "VARCHAR(512) NOT NULL",
        'file_type' => "VARCHAR(100) NOT NULL",
        'category' => "ENUM('lecture','resource') NOT NULL",
        'file_size' => "BIGINT(20) NOT NULL",
        'mime_type' => "VARCHAR(100) NOT NULL",
        'created_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
    ],
    'banners' => [
        'id' => "INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY",
        'image_url' => "VARCHAR(512) NOT NULL",
        'is_active' => "TINYINT(1) DEFAULT 1",
        'display_order' => "INT(11) DEFAULT 0",
        'created_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'payment_gateways' => [
        'id' => "VARCHAR(64) NOT NULL PRIMARY KEY",
        'name' => "VARCHAR(128) NOT NULL",
        'slug' => "VARCHAR(64) NOT NULL",
        'logo_url' => "TEXT DEFAULT NULL",
        'is_active' => "TINYINT(1) NOT NULL DEFAULT 1",
        'api_key' => "TEXT DEFAULT NULL",
        'secret_key' => "TEXT DEFAULT NULL",
        'environment' => "VARCHAR(32) NOT NULL DEFAULT 'sandbox'",
        'created_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ],
    'video_playback_progress' => [
        'id' => "VARCHAR(128) NOT NULL PRIMARY KEY",
        'user_id' => "VARCHAR(64) NOT NULL",
        'lesson_id' => "VARCHAR(64) NOT NULL",
        'course_id' => "VARCHAR(64) DEFAULT NULL",
        'current_time' => "FLOAT DEFAULT 0",
        'duration' => "FLOAT DEFAULT 0",
        'percentage' => "INT(11) DEFAULT 0",
        'updated_at' => "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ]
];

// Helper: Ensure all core tables exist in the database
function ensure_core_tables_exist($conn) {
    // 1. users
    $conn->query("
        CREATE TABLE IF NOT EXISTS `users` (
          `id` varchar(64) NOT NULL,
          `role` enum('learner','instructor','admin') NOT NULL DEFAULT 'learner',
          `first_name` varchar(100) NOT NULL,
          `last_name` varchar(100) NOT NULL,
          `email` varchar(191) NOT NULL,
          `password_hash` varchar(255) DEFAULT NULL,
          `country_code` varchar(10) DEFAULT '+254',
          `phone_number` varchar(30) DEFAULT NULL,
          `preferred_language` varchar(20) DEFAULT 'en',
          `avatar_url` text DEFAULT NULL,
          `auth_provider` enum('email','google','apple') NOT NULL DEFAULT 'email',
          `firebase_uid` varchar(128) DEFAULT NULL,
          `agreed_terms` tinyint(1) NOT NULL DEFAULT 1,
          `agreed_marketing` tinyint(1) NOT NULL DEFAULT 0,
          `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
          `last_login_at` timestamp NULL DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `email` (`email`),
          KEY `idx_users_role` (`role`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. email_verifications
    $conn->query("
        CREATE TABLE IF NOT EXISTS `email_verifications` (
          `id` varchar(64) NOT NULL,
          `email` varchar(191) NOT NULL,
          `otp_code` varchar(10) NOT NULL,
          `is_used` tinyint(1) DEFAULT 0,
          `expires_at` datetime NOT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `idx_email_verifications_email` (`email`),
          KEY `idx_email_verifications_expires_at` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. courses
    $conn->query("
        CREATE TABLE IF NOT EXISTS `courses` (
          `id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `subtitle` text DEFAULT NULL,
          `description` longtext DEFAULT NULL,
          `instructor` varchar(150) NOT NULL DEFAULT 'Dr. Angela Vance',
          `instructor_title` varchar(150) DEFAULT 'Senior Instructor',
          `instructor_avatar` text DEFAULT NULL,
          `created_by` varchar(64) DEFAULT NULL,
          `category` varchar(100) NOT NULL DEFAULT 'Development',
          `level` enum('Beginner','Intermediate','Advanced','All Levels') DEFAULT 'Beginner',
          `price` decimal(10,2) NOT NULL DEFAULT 49.99,
          `original_price` decimal(10,2) DEFAULT 99.99,
          `rating` decimal(3,2) DEFAULT 5.00,
          `review_count` int(11) DEFAULT 0,
          `learners_enrolled` int(11) DEFAULT 0,
          `image` text DEFAULT NULL,
          `duration` varchar(50) DEFAULT '10.0 hours',
          `is_published` tinyint(1) DEFAULT 1,
          `best_seller` tinyint(1) DEFAULT 0,
          `is_deleted` tinyint(1) DEFAULT 0,
          `deleted_at` datetime DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `idx_created_by` (`created_by`),
          KEY `idx_is_deleted` (`is_deleted`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 4. modules
    $conn->query("
        CREATE TABLE IF NOT EXISTS `modules` (
          `id` varchar(64) NOT NULL,
          `course_id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `description` text DEFAULT NULL,
          `order_index` int(11) DEFAULT 0,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `fk_module_course` (`course_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 5. lessons
    $conn->query("
        CREATE TABLE IF NOT EXISTS `lessons` (
          `id` varchar(64) NOT NULL,
          `module_id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `duration` varchar(50) DEFAULT '10:00',
          `type` enum('video','article','quiz','audio','scorm') DEFAULT 'video',
          `video_url` varchar(255) DEFAULT '',
          `content` longtext DEFAULT NULL,
          `is_preview` tinyint(1) DEFAULT 0,
          `order_index` int(11) DEFAULT 0,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `fk_lesson_module` (`module_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 6. quizzes
    $conn->query("
        CREATE TABLE IF NOT EXISTS `quizzes` (
          `id` varchar(64) NOT NULL,
          `lesson_id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `description` text DEFAULT NULL,
          `passing_score` int(11) DEFAULT 80,
          `time_limit_minutes` int(11) DEFAULT 15,
          `max_attempts` int(11) DEFAULT 3,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `fk_quiz_lesson` (`lesson_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 7. quiz_questions
    $conn->query("
        CREATE TABLE IF NOT EXISTS `quiz_questions` (
          `id` varchar(64) NOT NULL,
          `quiz_id` varchar(64) NOT NULL,
          `question` text NOT NULL,
          `type` varchar(50) DEFAULT 'multiple-choice',
          `points` int(11) DEFAULT 10,
          `difficulty` varchar(50) DEFAULT 'Intermediate',
          `explanation` text DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `fk_question_quiz` (`quiz_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 8. quiz_options
    $conn->query("
        CREATE TABLE IF NOT EXISTS `quiz_options` (
          `id` varchar(64) NOT NULL,
          `question_id` varchar(64) NOT NULL,
          `text` text NOT NULL,
          `is_correct` tinyint(1) DEFAULT 0,
          `explanation` text DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `fk_option_question` (`question_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 9. learning_outcomes
    $conn->query("
        CREATE TABLE IF NOT EXISTS `learning_outcomes` (
          `id` int(11) AUTO_INCREMENT PRIMARY KEY,
          `course_id` varchar(64) NOT NULL,
          `outcome` text NOT NULL,
          KEY `fk_outcome_course` (`course_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 10. purchases
    $conn->query("
        CREATE TABLE IF NOT EXISTS `purchases` (
          `id` varchar(64) NOT NULL,
          `course_id` varchar(64) NOT NULL,
          `course_title` varchar(255) NOT NULL,
          `amount` decimal(10,2) NOT NULL,
          `payment_method` varchar(100) DEFAULT 'Credit Card',
          `date` date NOT NULL,
          `status` enum('success','pending','refunded') DEFAULT 'success',
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 11. course_categories
    $conn->query("
        CREATE TABLE IF NOT EXISTS `course_categories` (
          `id` varchar(64) NOT NULL,
          `name` varchar(100) NOT NULL,
          `slug` varchar(120) NOT NULL,
          `description` text DEFAULT NULL,
          `icon` varchar(50) DEFAULT '📚',
          `color` varchar(100) DEFAULT 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
          `order_index` int(11) DEFAULT 0,
          `is_active` tinyint(1) DEFAULT 1,
          `is_featured` tinyint(1) DEFAULT 0,
          `created_at` timestamp NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `idx_cat_name` (`name`),
          UNIQUE KEY `idx_cat_slug` (`slug`),
          KEY `idx_cat_order` (`order_index`),
          KEY `idx_cat_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 12. settings
    $conn->query("
        CREATE TABLE IF NOT EXISTS `settings` (
          `setting_key` varchar(128) NOT NULL PRIMARY KEY,
          `setting_value` longtext DEFAULT NULL,
          `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 13. coupons
    $conn->query("
        CREATE TABLE IF NOT EXISTS `coupons` (
          `id` varchar(64) PRIMARY KEY,
          `code` varchar(50) NOT NULL UNIQUE,
          `discount_type` enum('percentage','fixed') DEFAULT 'percentage',
          `discount_value` decimal(10,2) NOT NULL,
          `max_uses` int DEFAULT 100,
          `current_uses` int DEFAULT 0,
          `expires_at` datetime DEFAULT NULL,
          `is_active` tinyint(1) DEFAULT 1,
          `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 14. asset_folders
    $conn->query("
        CREATE TABLE IF NOT EXISTS `asset_folders` (
          `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `user_id` varchar(128) NOT NULL,
          `name` varchar(255) NOT NULL,
          `parent_id` int(11) DEFAULT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 15. uploaded_assets
    $conn->query("
        CREATE TABLE IF NOT EXISTS `uploaded_assets` (
          `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `user_id` varchar(128) DEFAULT NULL,
          `folder_id` int(11) DEFAULT NULL,
          `filename` varchar(255) NOT NULL,
          `original_name` varchar(255) NOT NULL,
          `file_path` varchar(512) NOT NULL,
          `file_url` varchar(512) NOT NULL,
          `file_type` varchar(100) NOT NULL,
          `category` enum('lecture','resource') NOT NULL,
          `file_size` bigint(20) NOT NULL,
          `mime_type` varchar(100) NOT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 16. banners
    $conn->query("
        CREATE TABLE IF NOT EXISTS `banners` (
          `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `image_url` varchar(512) NOT NULL,
          `is_active` tinyint(1) DEFAULT 1,
          `display_order` int(11) DEFAULT 0,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          KEY `active_order` (`is_active`,`display_order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 17. payment_gateways
    $conn->query("
        CREATE TABLE IF NOT EXISTS `payment_gateways` (
          `id` varchar(64) NOT NULL PRIMARY KEY,
          `name` varchar(128) NOT NULL,
          `slug` varchar(64) NOT NULL,
          `logo_url` text DEFAULT NULL,
          `is_active` tinyint(1) NOT NULL DEFAULT 1,
          `api_key` text DEFAULT NULL,
          `secret_key` text DEFAULT NULL,
          `environment` varchar(32) NOT NULL DEFAULT 'sandbox',
          `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 18. video_playback_progress
    $conn->query("
        CREATE TABLE IF NOT EXISTS `video_playback_progress` (
          `id` varchar(128) PRIMARY KEY,
          `user_id` varchar(64) NOT NULL,
          `lesson_id` varchar(64) NOT NULL,
          `course_id` varchar(64) DEFAULT NULL,
          `current_time` float DEFAULT 0,
          `duration` float DEFAULT 0,
          `percentage` int DEFAULT 0,
          `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY `idx_user_lesson` (`user_id`, `lesson_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

/**
 * AUTO-ALTER / ADD COLUMN MIGRATION HELPER
 * Checks each table in MySQL and adds missing columns automatically.
 * Returns array of alter operations performed.
 */
function ensure_and_alter_table_columns($conn, $canonical_schema) {
    $alter_log = [];

    foreach ($canonical_schema as $table => $columns) {
        // First verify table exists
        $tbl_check = $conn->query("SHOW TABLES LIKE '$table'");
        if (!$tbl_check || $tbl_check->num_rows === 0) {
            continue;
        }

        // Fetch existing columns in this table
        $existing_cols = [];
        $res = $conn->query("SHOW COLUMNS FROM `$table`");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $existing_cols[] = strtolower($row['Field']);
            }
        }

        // Check for missing columns and run ALTER TABLE
        foreach ($columns as $col_name => $col_definition) {
            if (!in_array(strtolower($col_name), $existing_cols)) {
                // If definition includes PRIMARY KEY or AUTO_INCREMENT on existing table, clean it for ADD COLUMN
                $clean_def = preg_replace('/\s+PRIMARY\s+KEY/i', '', $col_definition);
                $alter_sql = "ALTER TABLE `$table` ADD COLUMN `$col_name` $clean_def";
                
                $alter_res = $conn->query($alter_sql);
                if ($alter_res) {
                    $alter_log[] = [
                        'table' => $table,
                        'column' => $col_name,
                        'definition' => $clean_def,
                        'status' => 'added',
                        'sql' => $alter_sql
                    ];
                } else {
                    $alter_log[] = [
                        'table' => $table,
                        'column' => $col_name,
                        'definition' => $clean_def,
                        'status' => 'error',
                        'error' => $conn->error,
                        'sql' => $alter_sql
                    ];
                }
            }
        }
    }

    return $alter_log;
}

/**
 * DYNAMIC COLUMN INSERTER FOR ARBITRARY PAYLOAD FIELDS
 * If user payload contains columns not in the schema, dynamically add them.
 */
function auto_add_custom_column_if_missing($conn, $table, $col_name, $sample_val = null) {
    if (empty($col_name) || empty($table)) return false;

    // Check if column exists
    $check = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$col_name'");
    if ($check && $check->num_rows > 0) {
        return false; // Already exists
    }

    // Determine appropriate MySQL data type
    $type = "VARCHAR(255) NULL DEFAULT NULL";
    if (is_int($sample_val)) {
        $type = "INT(11) NULL DEFAULT 0";
    } elseif (is_float($sample_val)) {
        $type = "DECIMAL(10,2) NULL DEFAULT 0.00";
    } elseif (is_bool($sample_val)) {
        $type = "TINYINT(1) NULL DEFAULT 0";
    } elseif (is_array($sample_val) || (is_string($sample_val) && strlen($sample_val) > 255)) {
        $type = "LONGTEXT NULL";
    }

    $sql = "ALTER TABLE `$table` ADD COLUMN `$col_name` $type";
    return $conn->query($sql);
}

// Auto-check tables & auto-alter missing columns
ensure_core_tables_exist($conn);
$auto_altered = ensure_and_alter_table_columns($conn, $canonical_schema);

// =========================================================================
// 3. Process Request Actions
// =========================================================================

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? trim($_GET['action']) : '';

if ($method === 'POST') {
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true);
    if ($data && isset($data['action'])) {
        $action = trim($data['action']);
    }
}

// Default action is 'status'
if (empty($action)) {
    $action = 'status';
}

// -------------------------------------------------------------------------
// ACTION 1: STATUS & FULL SCHEMA OVERVIEW
// -------------------------------------------------------------------------
if ($action === 'status' || $action === 'inspect_schema') {
    $tables_summary = [];
    $schema_details = [];

    foreach ($allowed_tables as $table) {
        $check = $conn->query("SHOW TABLES LIKE '$table'");
        if ($check && $check->num_rows > 0) {
            $count_res = $conn->query("SELECT COUNT(*) as total FROM `$table`");
            $total = ($count_res) ? (int)$count_res->fetch_assoc()['total'] : 0;
            
            // Fetch live columns
            $cols_res = $conn->query("SHOW COLUMNS FROM `$table`");
            $columns_list = [];
            if ($cols_res) {
                while ($c = $cols_res->fetch_assoc()) {
                    $columns_list[] = [
                        'field' => $c['Field'],
                        'type' => $c['Type'],
                        'null' => $c['Null'],
                        'key' => $c['Key'],
                        'default' => $c['Default'],
                        'extra' => $c['Extra']
                    ];
                }
            }

            $tables_summary[$table] = [
                'exists' => true,
                'rowCount' => $total,
                'columnCount' => count($columns_list),
                'columns' => $columns_list
            ];
        } else {
            $tables_summary[$table] = [
                'exists' => false,
                'rowCount' => 0,
                'columnCount' => 0,
                'columns' => []
            ];
        }
    }

    echo json_encode([
        "success" => true,
        "database" => "uqlearno_lms",
        "serverTime" => date('Y-m-d H:i:s'),
        "tables" => $tables_summary,
        "columnsAutoAltered" => $auto_altered,
        "message" => "Database sync & schema migration hub is active and verified."
    ], JSON_PRETTY_PRINT);

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 2: AUTO MIGRATE / ALTER TABLE SCHEMA
// -------------------------------------------------------------------------
if ($action === 'auto_migrate' || $action === 'alter_schema') {
    ensure_core_tables_exist($conn);
    $migrations = ensure_and_alter_table_columns($conn, $canonical_schema);

    // Fetch refreshed column count for all tables
    $table_col_counts = [];
    foreach ($allowed_tables as $table) {
        $c_res = $conn->query("SHOW COLUMNS FROM `$table`");
        $cnt = ($c_res) ? $c_res->num_rows : 0;
        $table_col_counts[$table] = $cnt;
    }

    echo json_encode([
        "success" => true,
        "message" => count($migrations) > 0 ? "Schema successfully migrated with " . count($migrations) . " columns added." : "All table schemas are up-to-date. No missing columns detected.",
        "alteredColumns" => $migrations,
        "tableColumnsCount" => $table_col_counts,
        "timestamp" => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 3: ADD CUSTOM COLUMN TO A SPECIFIC TABLE
// -------------------------------------------------------------------------
if ($action === 'add_column' && $method === 'POST') {
    $table = isset($data['table']) ? trim($data['table']) : '';
    $column = isset($data['column']) ? trim($data['column']) : '';
    $type = isset($data['type']) ? trim($data['type']) : 'VARCHAR(255)';
    $nullable = isset($data['nullable']) ? (bool)$data['nullable'] : true;
    $default_val = isset($data['defaultValue']) ? $data['defaultValue'] : null;
    $after_column = isset($data['afterColumn']) ? trim($data['afterColumn']) : '';

    if (!in_array($table, $allowed_tables)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid or disallowed table name."
        ]);
        $conn->close();
        exit();
    }

    if (empty($column) || !preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Column name must only contain alphanumeric characters and underscores."
        ]);
        $conn->close();
        exit();
    }

    // Check if column already exists
    $check = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($check && $check->num_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Column `$column` already exists in `$table`.",
            "alreadyExists" => true
        ]);
        $conn->close();
        exit();
    }

    $col_def = "$type " . ($nullable ? "NULL" : "NOT NULL");
    if ($default_val !== null && $default_val !== '') {
        $col_def .= " DEFAULT '" . $conn->real_escape_string($default_val) . "'";
    } elseif ($nullable) {
        $col_def .= " DEFAULT NULL";
    }

    if (!empty($after_column)) {
        $col_def .= " AFTER `" . $conn->real_escape_string($after_column) . "`";
    }

    $sql = "ALTER TABLE `$table` ADD COLUMN `$column` $col_def";
    $exec = $conn->query($sql);

    if ($exec) {
        echo json_encode([
            "success" => true,
            "message" => "Column `$column` successfully added to `$table` via ALTER TABLE.",
            "table" => $table,
            "column" => $column,
            "sql" => $sql
        ], JSON_PRETTY_PRINT);
    } else {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to add column: " . $conn->error,
            "sql" => $sql
        ]);
    }

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 4: READ TABLE DATA (WITH COLUMN DEFINITIONS)
// -------------------------------------------------------------------------
if ($action === 'read_table') {
    $table = isset($_GET['table']) ? trim($_GET['table']) : (isset($data['table']) ? trim($data['table']) : '');
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    if (!in_array($table, $allowed_tables)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Invalid or disallowed table name."
        ]);
        $conn->close();
        exit();
    }

    // Fetch column info
    $col_res = $conn->query("SHOW COLUMNS FROM `$table`");
    $columns = [];
    if ($col_res) {
        while ($col = $col_res->fetch_assoc()) {
            $columns[] = [
                'field' => $col['Field'],
                'type' => $col['Type'],
                'null' => $col['Null'],
                'key' => $col['Key'],
                'default' => $col['Default']
            ];
        }
    }

    $result = $conn->query("SELECT * FROM `$table` LIMIT $limit OFFSET $offset");
    $rows = [];
    if ($result) {
        while ($r = $result->fetch_assoc()) {
            $rows[] = $r;
        }
    }

    echo json_encode([
        "success" => true,
        "table" => $table,
        "count" => count($rows),
        "columns" => $columns,
        "data" => $rows
    ], JSON_PRETTY_PRINT);

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 5: EXPORT FULL DATABASE AS JSON / BACKUP
// -------------------------------------------------------------------------
if ($action === 'export_all') {
    $database_export = [];

    foreach ($allowed_tables as $table) {
        $result = $conn->query("SELECT * FROM `$table`");
        $database_export[$table] = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $database_export[$table][] = $row;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "database" => "uqlearno_lms",
        "exportedAt" => date('Y-m-d H:i:s'),
        "data" => $database_export
    ], JSON_PRETTY_PRINT);

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 6: SYNC / UPSERT DATA BATCH WITH AUTO-ALTER COLUMNS
// -------------------------------------------------------------------------
if ($action === 'sync_upsert' && $method === 'POST') {
    if (!$data || !isset($data['payload'])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Missing payload for synchronization."
        ]);
        $conn->close();
        exit();
    }

    $payload = $data['payload'];
    $synced_stats = [];

    // Auto-migrate standard schema columns first
    $migration_report = ensure_and_alter_table_columns($conn, $canonical_schema);

    $conn->begin_transaction();

    try {
        // 1. Sync Users
        if (isset($payload['users']) && is_array($payload['users'])) {
            $count = 0;
            
            // Dynamic column check for users payload
            if (!empty($payload['users'][0])) {
                foreach (array_keys($payload['users'][0]) as $k) {
                    if (!in_array($k, ['firstName', 'lastName', 'countryCode', 'phoneNumber', 'preferredLanguage', 'avatar', 'authProvider', 'firebaseUid'])) {
                        auto_add_custom_column_if_missing($conn, 'users', $k, $payload['users'][0][$k]);
                    }
                }
            }

            $stmt = $conn->prepare("
                INSERT INTO `users` (
                    id, role, first_name, last_name, email, password_hash,
                    country_code, phone_number, preferred_language, avatar_url,
                    auth_provider, firebase_uid, agreed_terms, agreed_marketing, is_email_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    role = VALUES(role),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    avatar_url = VALUES(avatar_url),
                    is_email_verified = VALUES(is_email_verified),
                    updated_at = NOW()
            ");

            foreach ($payload['users'] as $u) {
                $uid = $u['id'] ?? ('usr_' . bin2hex(random_bytes(8)));
                $role = $u['role'] ?? 'learner';
                $fn = $u['first_name'] ?? ($u['firstName'] ?? '');
                $ln = $u['last_name'] ?? ($u['lastName'] ?? '');
                $em = strtolower($u['email'] ?? '');
                $pwd = $u['password_hash'] ?? null;
                $cc = $u['country_code'] ?? ($u['countryCode'] ?? '+254');
                $phone = $u['phone_number'] ?? ($u['phoneNumber'] ?? null);
                $lang = $u['preferred_language'] ?? ($u['preferredLanguage'] ?? 'en');
                $avatar = $u['avatar_url'] ?? ($u['avatar'] ?? null);
                $auth = $u['auth_provider'] ?? ($u['authProvider'] ?? 'email');
                $fb = $u['firebase_uid'] ?? ($u['firebaseUid'] ?? null);
                $terms = isset($u['agreed_terms']) ? (int)$u['agreed_terms'] : 1;
                $mkt = isset($u['agreed_marketing']) ? (int)$u['agreed_marketing'] : 0;
                $ver = isset($u['is_email_verified']) ? (int)$u['is_email_verified'] : 0;

                if (!empty($em)) {
                    $stmt->bind_param("ssssssssssssiii", $uid, $role, $fn, $ln, $em, $pwd, $cc, $phone, $lang, $avatar, $auth, $fb, $terms, $mkt, $ver);
                    $stmt->execute();
                    $count++;
                }
            }
            $stmt->close();
            $synced_stats['users'] = $count;
        }

        // 2. Sync Courses
        if (isset($payload['courses']) && is_array($payload['courses'])) {
            $count = 0;

            // Ensure created_by column exists
            auto_add_custom_column_if_missing($conn, 'courses', 'created_by', 'usr_sample');

            $c_stmt = $conn->prepare("
                INSERT INTO `courses` (
                    id, title, subtitle, description, instructor, instructor_title,
                    instructor_avatar, created_by, category, level, price, original_price,
                    rating, review_count, learners_enrolled, image, duration, is_published, best_seller
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    subtitle = VALUES(subtitle),
                    description = VALUES(description),
                    instructor = VALUES(instructor),
                    instructor_title = VALUES(instructor_title),
                    instructor_avatar = VALUES(instructor_avatar),
                    created_by = VALUES(created_by),
                    category = VALUES(category),
                    price = VALUES(price),
                    image = VALUES(image),
                    is_published = VALUES(is_published),
                    best_seller = VALUES(best_seller),
                    updated_at = NOW()
            ");

            foreach ($payload['courses'] as $c) {
                $cid = $c['id'] ?? ('course-' . bin2hex(random_bytes(4)));
                $title = $c['title'] ?? 'Untitled Course';
                $sub = $c['subtitle'] ?? '';
                $desc = $c['description'] ?? '';
                $inst = $c['instructor'] ?? 'Dr. Angela Vance';
                $inst_title = $c['instructorTitle'] ?? ($c['instructor_title'] ?? 'Senior Instructor');
                $inst_avatar = $c['instructorAvatar'] ?? ($c['instructor_avatar'] ?? '');
                $created_by = $c['createdBy'] ?? ($c['created_by'] ?? null);
                $cat = $c['category'] ?? 'Development';
                $lvl = $c['level'] ?? 'Beginner';
                $price = (float)($c['price'] ?? 49.99);
                $orig_price = (float)($c['originalPrice'] ?? ($c['original_price'] ?? 99.99));
                $rating = (float)($c['rating'] ?? 5.0);
                $reviews = (int)($c['reviewCount'] ?? ($c['review_count'] ?? 0));
                $learners = (int)($c['learnersEnrolled'] ?? ($c['learners_enrolled'] ?? 0));
                $img = $c['image'] ?? '';
                $dur = $c['duration'] ?? '10.0 hours';
                $pub = isset($c['isPublished']) ? (int)$c['isPublished'] : (isset($c['is_published']) ? (int)$c['is_published'] : 1);
                $best = isset($c['bestSeller']) ? (int)$c['bestSeller'] : (isset($c['best_seller']) ? (int)$c['best_seller'] : 0);

                $c_stmt->bind_param("ssssssssssddiiissii", 
                    $cid, $title, $sub, $desc, $inst, $inst_title, 
                    $inst_avatar, $created_by, $cat, $lvl, $price, $orig_price, 
                    $rating, $reviews, $learners, $img, $dur, $pub, $best
                );
                $c_stmt->execute();
                $count++;
            }
            $c_stmt->close();
            $synced_stats['courses'] = $count;
        }

        // 3. Sync Modules
        if (isset($payload['modules']) && is_array($payload['modules'])) {
            $m_count = 0;
            $m_stmt = $conn->prepare("
                INSERT INTO `modules` (id, course_id, title, description, order_index)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    description = VALUES(description),
                    order_index = VALUES(order_index)
            ");
            foreach ($payload['modules'] as $idx => $m) {
                $mid = $m['id'] ?? ('mod-' . bin2hex(random_bytes(4)));
                $cid = $m['courseId'] ?? ($m['course_id'] ?? '');
                $mtitle = $m['title'] ?? 'Module';
                $mdesc = $m['description'] ?? '';
                $morder = isset($m['orderIndex']) ? (int)$m['orderIndex'] : (isset($m['order_index']) ? (int)$m['order_index'] : $idx);

                if (!empty($cid)) {
                    $m_stmt->bind_param("ssssi", $mid, $cid, $mtitle, $mdesc, $morder);
                    $m_stmt->execute();
                    $m_count++;
                }
            }
            $m_stmt->close();
            $synced_stats['modules'] = $m_count;
        }

        // 4. Sync Lessons
        if (isset($payload['lessons']) && is_array($payload['lessons'])) {
            $l_count = 0;
            $l_stmt = $conn->prepare("
                INSERT INTO `lessons` (id, module_id, title, duration, type, video_url, content, is_preview, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    duration = VALUES(duration),
                    type = VALUES(type),
                    video_url = VALUES(video_url),
                    content = VALUES(content),
                    is_preview = VALUES(is_preview),
                    order_index = VALUES(order_index)
            ");
            foreach ($payload['lessons'] as $idx => $l) {
                $lid = $l['id'] ?? ('les-' . bin2hex(random_bytes(4)));
                $mid = $l['moduleId'] ?? ($l['module_id'] ?? '');
                $ltitle = $l['title'] ?? 'Lesson';
                $ldur = $l['duration'] ?? '10:00';
                $ltype = $l['type'] ?? 'video';
                $lurl = $l['videoUrl'] ?? ($l['video_url'] ?? '');
                $lcontent = $l['content'] ?? '';
                $lprev = isset($l['isPreview']) ? (int)$l['isPreview'] : (isset($l['is_preview']) ? (int)$l['is_preview'] : 0);
                $lorder = isset($l['orderIndex']) ? (int)$l['orderIndex'] : (isset($l['order_index']) ? (int)$l['order_index'] : $idx);

                if (!empty($mid)) {
                    $l_stmt->bind_param("sssssssii", $lid, $mid, $ltitle, $ldur, $ltype, $lurl, $lcontent, $lprev, $lorder);
                    $l_stmt->execute();
                    $l_count++;
                }
            }
            $l_stmt->close();
            $synced_stats['lessons'] = $l_count;
        }

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Database and schema synchronized successfully! Tables verified and missing columns auto-altered.",
            "synced" => $synced_stats,
            "columnsAutoAltered" => $migration_report,
            "timestamp" => date('Y-m-d H:i:s')
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Sync transaction failed: " . $e->getMessage(),
            "columnsAutoAltered" => $migration_report
        ]);
    }

    $conn->close();
    exit();
}

// -------------------------------------------------------------------------
// ACTION 7: GENERATE PURE SQL EXPORT SCRIPT FOR PHPMYADMIN
// -------------------------------------------------------------------------
if ($action === 'generate_sql') {
    $sql_output = "-- ========================================================\n";
    $sql_output .= "-- DATABASE SYNC DUMP: uqlearno_lms\n";
    $sql_output .= "-- Generated on: " . date('Y-m-d H:i:s') . "\n";
    $sql_output .= "-- Host: localhost (uqlearn.org)\n";
    $sql_output .= "-- ========================================================\n\n";
    $sql_output .= "START TRANSACTION;\n";
    $sql_output .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

    foreach ($allowed_tables as $tbl) {
        $res = $conn->query("SELECT * FROM `$tbl`");
        if ($res && $res->num_rows > 0) {
            $sql_output .= "-- Dumping data for `$tbl`\n";
            while ($row = $res->fetch_assoc()) {
                $keys = array_keys($row);
                $escaped_vals = array_map(function($v) use ($conn) {
                    if ($v === null) return 'NULL';
                    return "'" . $conn->real_escape_string($v) . "'";
                }, array_values($row));

                $sql_output .= "INSERT INTO `$tbl` (`" . implode("`, `", $keys) . "`) VALUES (" . implode(", ", $escaped_vals) . ") ";
                $sql_output .= "ON DUPLICATE KEY UPDATE `updated_at` = NOW();\n";
            }
            $sql_output .= "\n";
        }
    }

    $sql_output .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    $sql_output .= "COMMIT;\n";

    echo json_encode([
        "success" => true,
        "sqlScript" => $sql_output,
        "database" => "uqlearno_lms"
    ]);

    $conn->close();
    exit();
}

http_response_code(400);
echo json_encode([
    "success" => false,
    "message" => "Unknown action specified. Available actions: 'status', 'inspect_schema', 'auto_migrate', 'add_column', 'read_table', 'export_all', 'sync_upsert', 'generate_sql'."
]);
$conn->close();
?>
