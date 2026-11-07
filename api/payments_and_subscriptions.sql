-- =======================================================
-- PayHero & Subscriptions MySQL Schema (cPanel Database)
-- Database: uqlearno_lms
-- File: /api/v1/payments_and_subscriptions.sql
-- =======================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `student_id` VARCHAR(64) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `student_email` VARCHAR(191) NOT NULL,
  `course_id` VARCHAR(64) NOT NULL,
  `course_title` VARCHAR(255) NOT NULL,
  `course_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(30) NOT NULL DEFAULT 'payhero_stk',
  `transaction_code` VARCHAR(100) NOT NULL,
  `status` ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
  `enrolled_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `activated_at` DATETIME DEFAULT NULL,
  `activated_by` VARCHAR(150) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_sub_student` (`student_id`),
  KEY `idx_sub_course` (`course_id`),
  KEY `idx_sub_status` (`status`),
  KEY `idx_sub_txcode` (`transaction_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Payments Table (PayHero M-Pesa STK Push Logs)
CREATE TABLE IF NOT EXISTS `payments` (
  `transaction_id` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
  `checkout_request_id` VARCHAR(100) DEFAULT NULL,
  `external_reference` VARCHAR(100) NOT NULL UNIQUE,
  `mpesa_receipt_number` VARCHAR(100) DEFAULT NULL,
  `channel_id` INT(11) NOT NULL DEFAULT 3501,
  `provider` VARCHAR(30) NOT NULL DEFAULT 'm-pesa',
  `phone_number` VARCHAR(30) NOT NULL,
  `subscription_id` VARCHAR(64) DEFAULT NULL,
  `payhero_response` LONGTEXT DEFAULT NULL,
  `callback_payload` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_pay_user` (`user_id`),
  KEY `idx_pay_course` (`course_id`),
  KEY `idx_pay_checkout` (`checkout_request_id`),
  KEY `idx_pay_extref` (`external_reference`),
  KEY `idx_pay_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
