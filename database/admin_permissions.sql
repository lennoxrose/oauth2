-- Admin Permissions Table
-- General database schema for admin permissions system
-- This is the base table structure - migrations go in /migration/ folder

CREATE TABLE IF NOT EXISTS `admin_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `discord_id` VARCHAR(255) NOT NULL UNIQUE,
    `username` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(255) DEFAULT NULL,
    `permissions` JSON NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_discord_id` (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permission Structure Reference:
-- The permissions column stores a JSON object with this structure:
-- {
--     "dashboard": {"enabled": boolean, "subPermissions": {}},
--     "users_view": {"enabled": boolean, "subPermissions": {}},
--     "users_delete": {"enabled": boolean, "subPermissions": {}},
--     "pullback": {"enabled": boolean, "subPermissions": {}},
--     "sync": {"enabled": boolean, "subPermissions": {}},
--     "settings_view": {
--         "enabled": boolean,
--         "subPermissions": {
--             "settings_view_token": boolean,
--             "settings_view_secret": boolean
--         }
--     },
--     "settings_edit": {"enabled": boolean, "subPermissions": {}},
--     "permissions": {"enabled": boolean, "subPermissions": {}}
-- }
