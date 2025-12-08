-- Discord Verified Users Table
-- Stores verified Discord users who have completed OAuth2 authentication
-- This is the base table structure - migrations go in /migration/ folder

CREATE TABLE IF NOT EXISTS `discord_verified_users` (
    `user_id` VARCHAR(20) PRIMARY KEY,
    `username` VARCHAR(32) NOT NULL,
    `discriminator` VARCHAR(4),
    `avatar` VARCHAR(255),
    `email` VARCHAR(255),
    `access_token` TEXT,
    `refresh_token` TEXT,
    `guilds` JSON,
    `verified_at` BIGINT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_verified_at` (`verified_at`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table Description:
-- - user_id: Discord user ID (primary key)
-- - username: Discord username
-- - discriminator: Discord discriminator (legacy, may be '0' for new usernames)
-- - avatar: Discord avatar hash
-- - email: User's Discord email address
-- - access_token: OAuth2 access token for Discord API
-- - refresh_token: OAuth2 refresh token to renew access
-- - guilds: JSON array of Discord guilds (servers) the user is in
-- - verified_at: Unix timestamp when user was verified
-- - created_at: Record creation timestamp
-- - updated_at: Last update timestamp
