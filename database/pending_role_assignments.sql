-- Pending Role Assignments Table
-- Tracks users who are waiting for role assignment in Discord
-- This is the base table structure - migrations go in /migration/ folder

CREATE TABLE IF NOT EXISTS `pending_role_assignments` (
    `user_id` VARCHAR(255) PRIMARY KEY,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table Description:
-- - user_id: Discord user ID waiting for role assignment
-- - created_at: When the role assignment request was queued
--
-- This table is used as a queue for role assignments that need to be processed
-- by the Discord bot. Users are added here when they verify, and removed after
-- the bot successfully assigns their role.
