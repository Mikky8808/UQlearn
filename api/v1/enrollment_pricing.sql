-- --------------------------------------------------------
-- Table structure for `enrollment_pricing`
-- 3-Month Mock Student Enrollment & Rating Growth Package Pricing
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `enrollment_pricing` (
    `id` VARCHAR(64) PRIMARY KEY,
    `package_name` VARCHAR(255) NOT NULL DEFAULT '3-Month Mock Student Enrollment & Rating Growth Package',
    `duration_months` INT NOT NULL DEFAULT 3,
    `student_step_unit` INT NOT NULL DEFAULT 100,
    `price_per_unit_usd` DECIMAL(10,2) NOT NULL DEFAULT 0.15,
    `default_rating` DECIMAL(3,2) NOT NULL DEFAULT 4.90,
    `min_students` INT NOT NULL DEFAULT 100,
    `max_students` INT NOT NULL DEFAULT 10000,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping initial seed data for `enrollment_pricing`
-- --------------------------------------------------------

INSERT INTO `enrollment_pricing` 
(`id`, `package_name`, `duration_months`, `student_step_unit`, `price_per_unit_usd`, `default_rating`, `min_students`, `max_students`, `is_active`) 
VALUES 
('standard_3month_boost', '3-Month Mock Student Enrollment & Rating Growth Package', 3, 100, 0.15, 4.90, 100, 10000, 1)
ON DUPLICATE KEY UPDATE `package_name` = VALUES(`package_name`);
