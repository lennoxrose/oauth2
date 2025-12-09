-- Bot Settings Table
-- Stores Discord bot configuration that can be managed via admin panel
-- Database: oauth2_api (note: correct spelling, not oath2_api)

CREATE TABLE IF NOT EXISTS `bot_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) UNIQUE NOT NULL,
  `setting_value` TEXT,
  `setting_type` ENUM('string', 'number', 'boolean', 'token', 'id') DEFAULT 'string',
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default bot settings
-- IMPORTANT: Replace these values with your actual Discord bot configuration
INSERT INTO `bot_settings` (`setting_key`, `setting_value`, `setting_type`, `description`) VALUES
('token', '', 'token', 'Discord bot token - should be loaded from environment variables'),
('client_id', '', 'string', 'Discord application client ID'),
('client_secret', '', 'string', 'Discord application client secret'),
('prefix', '', 'string', 'Bot command prefix (e.g., !, ;, .)'),
('owner_id', '', 'id', 'Discord user ID of the bot owner'),
('guild_id', '', 'id', 'Discord server (guild) ID where the bot operates'),
('redirect_uri', '', 'string', 'OAuth2 redirect/callback URI (e.g., https://yourdomain.com/oauth2/callback/)'),
('web_url', '', 'string', 'Main website URL (e.g., https://yourdomain.com)'),
('verified_role_id', '', 'id', 'Role ID assigned to verified users'),
('unverified_role_id', '', 'id', 'Role ID for unverified users')
ON DUPLICATE KEY UPDATE 
  `setting_value` = VALUES(`setting_value`),
  `description` = VALUES(`description`);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS `idx_setting_key` ON `bot_settings` (`setting_key`);

-- Display current settings
SELECT 
  setting_key,
  CASE 
    WHEN setting_type = 'token' AND setting_value != '' THEN '********' 
    ELSE setting_value 
  END AS setting_value,
  setting_type,
  description
FROM bot_settings
ORDER BY setting_key;