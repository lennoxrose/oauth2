-- Users the DB needs to function properly
-- Can be ignored due to installers making this without the file
-- still kept for reference purposes

CREATE DATABASE IF NOT EXISTS `oauth2_api` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'oauth2_api'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON `oauth2_api`.* TO 'oauth2_api'@'localhost';
FLUSH PRIVILEGES;