-- =======================================================
-- LMS Platform Database Schema (MySQL / MariaDB)
-- Database: uqlearno_lms
-- File: /api/v1/schema.sql
-- =======================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `video_playback_progress`;
DROP TABLE IF EXISTS `payment_gateways`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `uploaded_assets`;
DROP TABLE IF EXISTS `asset_folders`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `email_verifications`;
DROP TABLE IF EXISTS `quiz_options`;
DROP TABLE IF EXISTS `quiz_questions`;
DROP TABLE IF EXISTS `quizzes`;
DROP TABLE IF EXISTS `lessons`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `learning_outcomes`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `course_categories`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE `users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `role` ENUM('learner', 'instructor', 'admin') DEFAULT 'learner',
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `country_code` VARCHAR(10) DEFAULT '+254',
  `phone_number` VARCHAR(30) DEFAULT NULL,
  `preferred_language` VARCHAR(20) DEFAULT 'en',
  `avatar_url` TEXT DEFAULT NULL,
  `auth_provider` ENUM('email','google','apple') NOT NULL DEFAULT 'email',
  `firebase_uid` VARCHAR(128) DEFAULT NULL,
  `agreed_terms` TINYINT(1) NOT NULL DEFAULT 1,
  `agreed_marketing` TINYINT(1) NOT NULL DEFAULT 0,
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Email Verifications Table
CREATE TABLE `email_verifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(128) NOT NULL PRIMARY KEY,
  `setting_value` LONGTEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Course Categories Table
CREATE TABLE IF NOT EXISTS `course_categories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT '📚',
  `color` VARCHAR(100) DEFAULT 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  `order_index` INT(11) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_featured` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_cat_name` (`name`),
  UNIQUE KEY `idx_cat_slug` (`slug`),
  KEY `idx_cat_order` (`order_index`),
  KEY `idx_cat_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Courses Table
CREATE TABLE `courses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` TEXT DEFAULT NULL,
  `description` LONGTEXT DEFAULT NULL,
  `instructor` VARCHAR(150) NOT NULL DEFAULT 'Dr. Angela Vance',
  `instructor_title` VARCHAR(150) DEFAULT 'Senior Instructor',
  `instructor_avatar` TEXT DEFAULT NULL,
  `created_by` VARCHAR(64) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Development',
  `level` ENUM('Beginner','Intermediate','Advanced','All Levels') DEFAULT 'Beginner',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 49.99,
  `original_price` DECIMAL(10,2) DEFAULT 99.99,
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `review_count` INT(11) DEFAULT 0,
  `learners_enrolled` INT(11) DEFAULT 0,
  `image` TEXT DEFAULT NULL,
  `duration` VARCHAR(50) DEFAULT '10.0 hours',
  `is_published` TINYINT(1) DEFAULT 1,
  `is_approved_by_admin` TINYINT(1) DEFAULT 0,
  `best_seller` TINYINT(1) DEFAULT 0,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Modules Table
CREATE TABLE `modules` (
  `id` VARCHAR(64) PRIMARY KEY,
  `course_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `order_index` INT DEFAULT 0,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_module_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Lessons Table
CREATE TABLE `lessons` (
  `id` VARCHAR(64) PRIMARY KEY,
  `module_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `duration` VARCHAR(50) DEFAULT '10:00',
  `type` ENUM('video', 'article', 'quiz', 'audio', 'scorm') DEFAULT 'video',
  `video_url` VARCHAR(255) DEFAULT '',
  `video_path` VARCHAR(255) DEFAULT '',
  `content` LONGTEXT,
  `description` TEXT DEFAULT NULL,
  `lab_url` TEXT DEFAULT NULL,
  `lab_title` VARCHAR(255) DEFAULT '',
  `is_preview` TINYINT(1) DEFAULT 0,
  `resources` LONGTEXT DEFAULT NULL,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_lesson_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Learning Outcomes Table
CREATE TABLE `learning_outcomes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` VARCHAR(64) NOT NULL,
  `outcome` TEXT NOT NULL,
  CONSTRAINT `fk_outcome_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Quizzes Table
CREATE TABLE `quizzes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `lesson_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `passing_score` INT DEFAULT 80,
  `time_limit_minutes` INT DEFAULT 15,
  `max_attempts` INT DEFAULT 3,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_quiz_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Quiz Questions Table
CREATE TABLE `quiz_questions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `quiz_id` VARCHAR(64) NOT NULL,
  `question` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'multiple-choice',
  `points` INT DEFAULT 10,
  `difficulty` VARCHAR(50) DEFAULT 'Intermediate',
  `explanation` TEXT,
  CONSTRAINT `fk_question_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Quiz Options Table
CREATE TABLE `quiz_options` (
  `id` VARCHAR(64) PRIMARY KEY,
  `question_id` VARCHAR(64) NOT NULL,
  `text` TEXT NOT NULL,
  `is_correct` TINYINT(1) DEFAULT 0,
  `explanation` TEXT,
  CONSTRAINT `fk_option_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Purchases Table
CREATE TABLE `purchases` (
  `id` VARCHAR(64) PRIMARY KEY,
  `course_id` VARCHAR(64) NOT NULL,
  `course_title` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(100) DEFAULT 'Credit Card',
  `date` DATE NOT NULL,
  `status` ENUM('success', 'pending', 'refunded') DEFAULT 'success',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_purchase_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Coupons Table
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` VARCHAR(64) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `discount_type` ENUM('percentage', 'fixed') DEFAULT 'percentage',
  `discount_value` DECIMAL(10,2) NOT NULL,
  `max_uses` INT DEFAULT 100,
  `current_uses` INT DEFAULT 0,
  `expires_at` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Asset Folders Table
CREATE TABLE IF NOT EXISTS `asset_folders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `parent_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Uploaded Assets Table
CREATE TABLE IF NOT EXISTS `uploaded_assets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(128) DEFAULT NULL,
  `folder_id` INT(11) DEFAULT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(512) NOT NULL,
  `file_url` VARCHAR(512) NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `category` ENUM('lecture', 'resource') NOT NULL,
  `file_size` BIGINT(20) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Banners Table
CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `image_url` VARCHAR(512) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `display_order` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `active_order` (`is_active`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Payment Gateways Table
CREATE TABLE IF NOT EXISTS `payment_gateways` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(64) NOT NULL,
  `logo_url` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `api_key` TEXT DEFAULT NULL,
  `secret_key` TEXT DEFAULT NULL,
  `environment` ENUM('sandbox', 'production') NOT NULL DEFAULT 'sandbox',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Video Playback Progress Table
CREATE TABLE IF NOT EXISTS `video_playback_progress` (
  `id` VARCHAR(128) PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `lesson_id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) DEFAULT NULL,
  `current_time` FLOAT DEFAULT 0,
  `duration` FLOAT DEFAULT 0,
  `percentage` INT DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_user_lesson` (`user_id`, `lesson_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Price Adjustments & Instructor Notices Table
CREATE TABLE IF NOT EXISTS `price_adjustments` (
  `id` VARCHAR(64) PRIMARY KEY,
  `course_id` VARCHAR(64) NOT NULL,
  `course_title` VARCHAR(255) NOT NULL,
  `course_thumbnail` TEXT DEFAULT NULL,
  `instructor_name` VARCHAR(150) NOT NULL,
  `instructor_email` VARCHAR(191) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT 'Development',
  `type` VARCHAR(50) DEFAULT 'price_adjustment',
  `title` VARCHAR(255) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `current_price` DECIMAL(10,2) NOT NULL,
  `suggested_price` DECIMAL(10,2) NOT NULL,
  `flag_reason` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'accepted', 'declined', 'dismissed') DEFAULT 'pending',
  `is_read` TINYINT(1) DEFAULT 0,
  `reminder_sent_at` DATETIME DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_price_adj_course` (`course_id`),
  KEY `idx_price_adj_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Instructor Compliance Table
CREATE TABLE IF NOT EXISTS `instructor_compliance` (
  `id` VARCHAR(64) PRIMARY KEY,
  `instructor_id` VARCHAR(64) NOT NULL,
  `file_path` VARCHAR(512) NOT NULL,
  `summary` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_instructor_id` (`instructor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Course Messages Table
CREATE TABLE IF NOT EXISTS `course_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` VARCHAR(100) NOT NULL UNIQUE,
  `welcome_message` TEXT NULL,
  `congratulations_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_course_msg_id` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. User Videos Table
CREATE TABLE IF NOT EXISTS `user_videos` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(128) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `file_path` VARCHAR(512) NOT NULL,
  `folder` VARCHAR(128) DEFAULT 'videos',
  `source` VARCHAR(128) DEFAULT 'film_and_edit',
  `file_size` BIGINT DEFAULT 0,
  `title` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_vid_user` (`user_id`),
  KEY `idx_user_vid_folder` (`folder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. User Resources Table (for Uploaded Resources Library & Lesson Resources)
CREATE TABLE IF NOT EXISTS `user_resources` (
  `id` VARCHAR(128) PRIMARY KEY,
  `user_id` VARCHAR(128) NOT NULL,
  `lesson_id` VARCHAR(128) DEFAULT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `file_path` TEXT,
  `file_type` VARCHAR(64) DEFAULT 'pdf',
  `file_size` BIGINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_res_user` (`user_id`),
  KEY `idx_user_res_lesson` (`lesson_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Communication Requests Table
CREATE TABLE IF NOT EXISTS `communication_requests` (
  `id` VARCHAR(64) PRIMARY KEY,
  `sender_type` ENUM('user', 'instructor', 'admin') NOT NULL DEFAULT 'user',
  `sender_id` VARCHAR(64) DEFAULT NULL,
  `sender_name` VARCHAR(150) NOT NULL,
  `sender_email` VARCHAR(191) NOT NULL,
  `recipient_type` ENUM('instructor', 'admin') NOT NULL DEFAULT 'instructor',
  `recipient_id` VARCHAR(64) DEFAULT NULL,
  `course_id` VARCHAR(64) DEFAULT NULL,
  `course_title` VARCHAR(255) DEFAULT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'custom',
  `title` VARCHAR(255) NOT NULL,
  `details` TEXT NOT NULL,
  `date` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'declined', 'in_review') NOT NULL DEFAULT 'pending',
  `reply_note` TEXT DEFAULT NULL,
  `replied_at` DATETIME DEFAULT NULL,
  `replied_by` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_req_sender_type` (`sender_type`),
  KEY `idx_req_sender_id` (`sender_id`),
  KEY `idx_req_recipient_type` (`recipient_type`),
  KEY `idx_req_recipient_id` (`recipient_id`),
  KEY `idx_req_course_id` (`course_id`),
  KEY `idx_req_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Instructor Plans Table (Pro / Turbo Plan Defaults)
CREATE TABLE IF NOT EXISTS `instructor_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL UNIQUE,
  `plan_type` VARCHAR(32) DEFAULT 'pro',
  `plan_name` VARCHAR(100) DEFAULT 'Pro / Turbo Plan',
  `status` VARCHAR(20) DEFAULT 'active',
  `price` DECIMAL(10,2) DEFAULT 29.99,
  `billing_cycle` VARCHAR(20) DEFAULT 'monthly',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




