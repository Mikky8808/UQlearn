-- =======================================================
-- Video Folders Table (Film & Edit Drive)
-- File: /api/v1/video_folders.sql
-- =======================================================

CREATE TABLE IF NOT EXISTS `video_folders` (
    `id` VARCHAR(64) PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL,
    `course_id` VARCHAR(100) DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(50) DEFAULT 'indigo',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_vfolders_user` (`user_id`),
    INDEX `idx_vfolders_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add folder_id to uploaded_videos if not exists
ALTER TABLE `uploaded_videos` ADD COLUMN IF NOT EXISTS `folder_id` VARCHAR(64) DEFAULT NULL AFTER `folder`;
