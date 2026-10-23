-- ============================================================================
-- UQlearn Sponsored Advertisements & Promotion Database Schema
-- Table: sponsored_ads & sponsored_pricing_plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS `sponsored_ads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_id` varchar(64) NOT NULL,
  `instructor_id` varchar(64) NOT NULL,
  `instructor_name` varchar(255) DEFAULT NULL,
  `instructor_email` varchar(255) DEFAULT NULL,
  `course_title` varchar(255) DEFAULT NULL,
  `course_thumbnail` varchar(512) DEFAULT NULL,
  `course_price` decimal(10,2) DEFAULT 0.00,
  `plan_id` varchar(64) DEFAULT 'starter_7d',
  `plan_name` varchar(100) NOT NULL DEFAULT 'Starter Reach (7 Days)',
  `duration_days` int(11) NOT NULL DEFAULT 7,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 9.99,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `payment_method` varchar(64) DEFAULT 'wallet', -- 'wallet', 'card', 'admin_grant'
  `payment_status` varchar(32) NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'free_admin'
  `status` varchar(32) NOT NULL DEFAULT 'active', -- 'active', 'pending_approval', 'paused', 'expired', 'rejected'
  `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime NOT NULL,
  `impressions_count` int(11) NOT NULL DEFAULT 0,
  `clicks_count` int(11) NOT NULL DEFAULT 0,
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `course_active_idx` (`course_id`, `status`, `start_date`, `end_date`),
  KEY `instructor_idx` (`instructor_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsored_pricing_plans` (
  `id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `duration_days` int(11) NOT NULL DEFAULT 7,
  `price` decimal(10,2) NOT NULL DEFAULT 9.99,
  `badge_tag` varchar(64) DEFAULT 'Starter',
  `features` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
