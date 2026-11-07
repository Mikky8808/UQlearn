-- Adverts Table Schema for MySQL / MariaDB (uqlearno_lms)
-- Designed for In-Page Promotional Adverts (Super Deals / Flash Sale & Tailored For You sections)

CREATE TABLE IF NOT EXISTS `adverts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slot` varchar(64) NOT NULL DEFAULT 'super_deals', -- 'super_deals' or 'tailored_for_you'
  `image_url` varchar(512) NOT NULL,
  `link_url` varchar(512) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `badge_text` varchar(64) DEFAULT NULL,
  `bg_color` varchar(32) DEFAULT '#0f172a',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `slot_active_idx` (`slot`, `is_active`, `display_order`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
