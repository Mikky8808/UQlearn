-- Top Advert Table Schema for MySQL / MariaDB (uqlearno_lms)
-- Designed for Top Nav Advertisement Banner on Shared Hosting

CREATE TABLE IF NOT EXISTS `top_adverts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `image_url` varchar(512) NOT NULL,
  `link_url` varchar(512) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `bg_color` varchar(32) DEFAULT '#0f172a',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `active_order_idx` (`is_active`, `display_order`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
