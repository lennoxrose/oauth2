# Discord OAuth2 Verification System

A complete Discord OAuth2 verification system with admin dashboard, role management, automated installers, and granular permission controls.

## 🌟 Features

### User-Facing
- **Discord OAuth2 Authentication** - Secure login via Discord
- **Automated Role Assignment** - Automatic role grants upon verification
- **Modern UI** - Clean, responsive interface built with TailwindCSS
- **Email Verification** - Email validation through Discord OAuth

### Admin Dashboard
- **User Management** - View, search, and manage verified users
- **Permission System** - Granular JSON-based permissions with sub-permissions
- **Analytics Dashboard** - Real-time stats on verifications and users
- **Settings Management** - Configure Discord bot settings via API
- **Role Sync** - Manual and automated role synchronization
- **Data Protection** - Configurable blur/privacy controls for sensitive data
- **Dynamic Configuration** - All settings loaded from API (no hardcoded secrets)

### Security
- **Role-Based Access Control (RBAC)** - Flexible permission system
- **Bearer Token Authentication** - All API endpoints secured with bot token
- **Session Management** - Secure session handling
- **Token Refresh** - Automatic OAuth2 token renewal
- **Email Privacy** - Blur protection for sensitive user data
- **Audit Logging** - Track permission changes and admin actions
- **Environment-Based Secrets** - Secure .env.secret file for credentials

## 📁 Project Structure

```
oauth2/
├── api/                    # Backend API
│   ├── api-nginx-config    # NGINX configuration template
│   └── v2/oauth2/discord/  # Discord OAuth2 API endpoints
│       ├── admin.php       # Admin authentication
│       ├── auth.php        # OAuth2 callback handler
│       ├── callback.php    # Discord OAuth callback
│       ├── cleanup.php     # Token cleanup
│       ├── cleanup-all.php # Full cleanup
│       ├── config.php      # Public configuration endpoint
│       ├── db.php          # Database connection
│       ├── delete-all.php  # Delete all users
│       ├── env.php         # Environment variable loader
│       ├── pending-roles.php # Role assignment queue
│       ├── permissions.php # Permission management
│       ├── settings.php    # Bot settings API
│       ├── stats.php       # Statistics
│       ├── users.php       # User management
│       └── verify-check.php # Verification status
├── bot/                    # Discord bot (Node.js)
│   ├── main.js             # Bot entry point
│   ├── config.xml          # Bot configuration
│   ├── embeds.js           # Discord embeds
│   ├── commands/           # Bot commands
│   └── src/                # Bot source files
├── database/               # Database schemas
│   ├── admin_permissions.sql
│   ├── bot_settings.sql
│   ├── discord_verified_users.sql
│   ├── pending_role_assignments.sql
│   ├── root.sql            # Full database schema
│   └── migrations/         # Database migrations
│       ├── 2025-12-08_rename_database.sql # Only for People who has user_permissions.sql (this file doesnt exist anymore)
│       └── migrate-database.sh
├── installers/             # Automated installation scripts
│   ├── install-api.sh      # API backend installer
│   ├── install-bot.sh      # Discord bot installer
│   └── install-panel.sh    # Frontend panel installer
├── webroot/                # Frontend files
│   ├── admin/              # Admin dashboard
│   │   ├── config.php      # Admin configuration endpoint
│   │   ├── callback/       # Admin OAuth callback
│   │   ├── dashboard/      # Main dashboard
│   │   ├── users/          # User management UI
│   │   ├── pullback/       # Role pullback UI
│   │   ├── sync/           # Server sync UI
│   │   ├── settings/       # Settings UI
│   │   ├── permissions/    # Permission management UI
│   │   ├── components/     # Shared components
│   │   └── js/             # JavaScript modules
│   │       ├── auth.js     # Authentication
│   │       ├── config.js   # Dynamic config loader
│   │       ├── dashboard.js
│   │       ├── permissions.js
│   │       ├── settings.js
│   │       └── users.js
│   ├── oauth2/             # Public OAuth2 pages
│   │   ├── config.php      # Public configuration endpoint
│   │   ├── callback/       # OAuth2 callback
│   │   └── index.html      # Verification page
│   ├── assets/             # Static assets
│   └── index.html          # Landing page
└── install.sh              # Main installer (auto-downloads from GitHub)
```

## 🚀 Tech Stack

**Frontend:**
- HTML5 / CSS3
- JavaScript (ES6+)
- TailwindCSS (CDN)
- Discord OAuth2

**Backend:**
- PHP 8.3
- MariaDB / MySQL
- NGINX

**Infrastructure:**
- Automated Bash installers
- Let's Encrypt SSL (Certbot)
- systemd service management
- Git-based deployment

## � Installation

### Quick Install (Recommended)

The easiest way to install is using the automated installers:

```bash
# Clone the repository
git clone https://github.com/lennoxrose/oauth2.git
cd oauth2

# Run the main installer
sudo bash install.sh
```

The installer will guide you through:
1. **API Backend** - PHP, MariaDB, NGINX, SSL certificates
2. **Admin Panel** - Frontend files, configuration
3. **Discord Bot** - Node.js bot service (optional)

**Note:** You only need `install.sh` and the `installers/` folder. The script will automatically download the rest from GitHub if needed.

### Manual Installation

### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name with DNS configured
- Discord Application (Bot + OAuth2)

### Database Setup

The installer creates the database automatically, but for manual setup:

1. Create the database:
```sql
CREATE DATABASE oauth2_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'oauth2_api'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON oauth2_api.* TO 'oauth2_api'@'localhost';
FLUSH PRIVILEGES;
```

2. Import table schemas:
```bash
mysql -u oauth2_api -p oauth2_api < database/root.sql
```

3. (Optional) Migrate from old database name:
```bash
cd database/migrations
bash migrate-database.sh
```

### API Backend Configuration

The installer creates the `.env.secret` file automatically. For manual setup:

1. Navigate to the API directory:
```bash
cd /var/www/html/v2/oauth2/discord/
```

2. Create `.env.secret` file:
```bash
# Discord OAuth2 Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-domain.com/oauth2/callback/
DISCORD_ADMIN_REDIRECT_URI=https://your-domain.com/admin/callback/

# Database Configuration
DB_HOST=localhost
DB_NAME=oauth2_api
DB_USER=oauth2_api
DB_PASS=your_db_password

# Admin Configuration
ADMIN_USER_ID=your_discord_user_id

# API Secret (Discord Bot Token)
API_SECRET=your_discord_bot_token
```

3. Set secure permissions:
```bash
chown www-data:www-data .env.secret
chmod 600 .env.secret
```

4. Populate bot_settings table:
```sql
INSERT INTO bot_settings (setting_key, setting_value, setting_type, description) VALUES
('client_id', 'your_discord_client_id', 'string', 'Discord Application Client ID'),
('client_secret', 'your_discord_client_secret', 'string', 'Discord Application Client Secret'),
('bot_token', 'your_discord_bot_token', 'string', 'Discord Bot Token'),
('guild_id', 'your_discord_server_id', 'string', 'Discord Server ID'),
('verified_role_id', 'your_verified_role_id', 'string', 'Verified Role ID');
```

### Frontend Configuration

The installer creates configuration files automatically. For manual setup:

1. Create `/var/www/html/admin/.env`:
```bash
# API Configuration
API_SECRET=your_discord_bot_token
API_BASE=https://your-api-domain.com/v2/oauth2/discord
ADMIN_USER_ID=your_discord_user_id
APP_DOMAIN=https://your-domain.com
```

2. Create `/var/www/html/oauth2/.env`:
```bash
# OAuth2 Public Pages Configuration
API_BASE=https://your-api-domain.com/v2/oauth2/discord
APP_DOMAIN=https://your-domain.com
```

3. Set secure permissions:
```bash
chown www-data:www-data /var/www/html/admin/.env
chown www-data:www-data /var/www/html/oauth2/.env
chmod 600 /var/www/html/admin/.env
chmod 600 /var/www/html/oauth2/.env
```

**Note:** The frontend dynamically loads configuration from these files via `config.php` endpoints. No hardcoded values in HTML/JS files.

### NGINX Configuration

The installer automatically configures NGINX with SSL. The configuration includes:

**API Server (api.your-domain.com):**
- PHP-FPM 8.3 integration
- Explicit route handlers for all OAuth2 endpoints
- SSL/TLS 1.2+ with secure ciphers
- Security headers (X-Frame-Options, CSP, etc.)
- Static file serving

**Frontend Server (your-domain.com):**
- Separate PHP handlers for `/admin/` and `/oauth2/`
- SSL certificate from Let's Encrypt
- HTTP to HTTPS redirect
- `.env` file access protection

For manual setup:
```bash
# Use the template from api/api-nginx-config
cp api/api-nginx-config /etc/nginx/sites-available/your-site
# Update domain names in the file
sed -i 's/api.example.com/your-api-domain.com/g' /etc/nginx/sites-available/your-site
# Enable site
ln -s /etc/nginx/sites-available/your-site /etc/nginx/sites-enabled/
# Remove default site
rm /etc/nginx/sites-enabled/default
# Test and reload
nginx -t
systemctl reload nginx
```

### Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Create a new application or select existing
3. In **OAuth2** settings, add redirect URIs:
   - `https://your-domain.com/oauth2/callback/` (user verification)
   - `https://your-domain.com/admin/callback/` (admin login)
4. Note your **Client ID** and **Client Secret**
5. In **Bot** settings:
   - Create a bot if not exists
   - Enable required intents (Server Members, Message Content)
   - Copy the **Bot Token**
6. Add bot to your Discord server with proper permissions

## � Security Best Practices

### API Endpoint Protection

All protected API endpoints require Bearer token authentication:

```javascript
fetch('https://api.your-domain.com/v2/oauth2/discord/settings', {
    headers: {
        'Authorization': 'Bearer YOUR_BOT_TOKEN'
    }
});
```

**Protected Endpoints:**
- `/config.php` - Returns bot settings (requires auth)
- `/settings` - Manage bot configuration
- `/permissions` - Permission management
- `/admin` - Admin authentication
- `/cleanup`, `/cleanup-all`, `/delete-all` - Data management

**Public Endpoints:**
- `/auth` - OAuth2 authorization redirect
- `/callback` - OAuth2 callback handler
- `/users` - Public user list (read-only)
- `/stats` - Public statistics
- `/verify-check` - Verification status check

### File Security

```bash
# Protect sensitive files
chmod 600 /var/www/html/v2/oauth2/discord/.env.secret
chmod 600 /var/www/html/admin/.env
chmod 600 /var/www/html/oauth2/.env

# Ensure proper ownership
chown -R www-data:www-data /var/www/html
```

### NGINX Security Headers

The installer configures these security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `.env` file access denied
- Hidden file access denied

## 🛠️ Automated Installers

### install.sh (Main Installer)

The main installer orchestrates the entire setup:

```bash
sudo bash install.sh
```

Features:
- Auto-downloads missing files from GitHub
- Menu-driven component selection
- Path-independent execution
- Validates prerequisites

### install-api.sh (API Backend)

Installs and configures the API backend:

```bash
cd installers
sudo bash install-api.sh
```

What it does:
1. Installs PHP 8.3, MariaDB, NGINX
2. Creates database and user
3. Runs migrations (skips manual-only migrations)
4. Deploys API files to `/var/www/html/v2/oauth2/discord/`
5. Creates `.env.secret` with your configuration
6. Configures NGINX with domain-specific settings
7. Removes default NGINX site
8. Optionally installs SSL with Let's Encrypt
9. Overwrites NGINX config with production-ready SSL setup

### install-panel.sh (Frontend Panel)

Installs the admin panel and OAuth2 pages:

```bash
cd installers
sudo bash install-panel.sh
```

What it does:
1. Installs PHP 8.3 and NGINX (if not installed)
2. Deploys frontend files to `/var/www/html/`
3. Creates `.env` files for admin and oauth2
4. Configures NGINX with proper PHP handling
5. Removes default NGINX site
6. Optionally installs SSL certificate
7. Overwrites NGINX config with production-ready SSL setup

### install-bot.sh (Discord Bot)

Installs the Node.js Discord bot:

```bash
cd installers
sudo bash install-bot.sh
```

What it does:
1. Installs Node.js 20.x
2. Deploys bot files to `/opt/discord-bot/`
3. Creates `config.xml` from user input
4. Installs npm dependencies
5. Creates systemd service
6. Starts and enables bot service

### Installer Features

**Common Features:**
- ✅ Path-independent (works from any directory)
- ✅ Grouped configuration prompts (Discord, Database, Admin sections)
- ✅ Configuration summary before installation
- ✅ MySQL root password authentication
- ✅ Automatic default site cleanup
- ✅ SSL certificate integration (Certbot)
- ✅ Post-install NGINX config replacement

**Installation Flow:**
1. Collect all configuration upfront
2. Display summary for confirmation
3. Install system packages
4. Deploy application files
5. Configure services
6. Request SSL certificate from Let's Encrypt
7. Replace NGINX config with production SSL version
8. Display installation summary with URLs and file locations

The system uses a JSON-based permission structure with granular controls:

```json
{
  "dashboard": {"enabled": true, "subPermissions": {}},
  "users_view": {"enabled": true, "subPermissions": {}},
  "users_delete": {"enabled": false, "subPermissions": {}},
  "pullback": {"enabled": true, "subPermissions": {}},
  "sync": {"enabled": true, "subPermissions": {}},
  "settings_view": {
    "enabled": true,
    "subPermissions": {
      "settings_view_token": true,
      "settings_view_secret": false
    }
  },
  "settings_edit": {"enabled": false, "subPermissions": {}},
  "permissions": {"enabled": false, "subPermissions": {}}
}
```

### Permission Types

| Permission | Description |
|------------|-------------|
| `dashboard` | Access to admin dashboard overview |
| `users_view` | View verified users list |
| `users_delete` | Delete users from the system |
| `pullback` | Access role pullback functionality |
| `sync` | Manually sync Discord roles |
| `settings_view` | View application settings |
| `settings_edit` | Edit application settings |
| `permissions` | Manage admin permissions |

### Sub-Permissions

- `settings_view_token` - View Discord bot token
- `settings_view_secret` - View application secret keys

## 🔒 Security Features

### Permission-Based Access Control
- Page-level access restrictions
- Component-level visibility controls
- Read-only mode for restricted users

### Data Protection
- **User Data Blur**: Automatically blur user information for unauthorized viewers
- **Email Privacy**: Always blur email addresses with reveal icon
- **Session Validation**: Continuous session checking
- **Error 403 Modal**: Custom access denied modal with countdown redirect

### Debug Mode
Enable testing mode in `auth.js`:
```javascript
const DEBUG_PERMISSIONS = true; // Test restrictions even as owner
```

## 🛠️ Development

### Cache Busting
Update version numbers for cache invalidation:

1. Update `SCRIPT_VERSION` in `webroot/admin/components/sidebar.js`
2. Update all HTML files to reference new version: `?v=XX`

Example:
```html
<script src="../components/sidebar.js?v=34"></script>
```

### Adding New Permissions

1. Add to database `admin_permissions.permissions` JSON
2. Update `webroot/admin/js/permissions-page.js` table columns
3. Add permission check in `webroot/admin/js/auth.js`
4. Apply restrictions in `applyPermissionRestrictions()`

## 📝 API Endpoints

### Authentication & Users
- `GET /auth` - Redirect to Discord OAuth
- `POST /callback` - Handle OAuth callback
- `GET /users` - List verified users (public, read-only)
- `GET /users/{user_id}` - Get specific user
- `DELETE /users/{user_id}` - Delete user (requires auth)
- `GET /verify-check` - Check if user is verified
- `POST /admin` - Admin login (exchanges code for token)

### Configuration & Settings
- `GET /config.php` - Get public bot configuration (requires auth)
- `GET /settings` - Get all bot settings (requires auth)
- `GET /settings?key={key}` - Get specific setting (requires auth)
- `POST /settings` - Update bot settings (requires auth)
- `DELETE /settings?key={key}` - Reset setting (requires auth)

### Permissions
- `GET /permissions` - List all admin users with permissions (requires auth)
- `GET /permissions/{user_id}` - Get specific user permissions (requires auth)
- `PUT /permissions` - Update user permissions (requires auth)

### Role Management
- `GET /pending-roles` - Get pending role assignments (requires auth)
- `POST /pending-roles` - Add user to role queue (requires auth)
- `DELETE /pending-roles` - Remove from queue (requires auth)
- `POST /pullback` - Pull back roles from users (requires auth)

### Utility & Maintenance
- `GET /stats` - Get verification statistics (public)
- `POST /cleanup` - Clean up expired tokens (requires auth)
- `POST /cleanup-all` - Full token cleanup (requires auth)
- `POST /delete-all` - Delete all verified users (requires auth)

### Frontend Endpoints
- `GET /admin/config.php` - Admin panel configuration
- `GET /oauth2/config.php` - Public OAuth2 page configuration

## 📦 Database Tables

### `discord_verified_users`
Stores verified Discord users with OAuth2 tokens.

**Columns:**
- `id` - Auto-increment primary key
- `user_id` - Discord user ID (unique)
- `username` - Discord username
- `discriminator` - Discord discriminator (#0000)
- `email` - User email from Discord
- `avatar` - Avatar hash
- `access_token` - OAuth2 access token
- `refresh_token` - OAuth2 refresh token
- `expires_at` - Token expiration timestamp
- `created_at` - Verification timestamp

### `admin_permissions`
JSON-based permission system for admin users.

**Columns:**
- `id` - Auto-increment primary key
- `discord_id` - Discord user ID (unique)
- `username` - Discord username
- `permissions` - JSON object with granular permissions
- `created_at` - When permissions were granted
- `updated_at` - Last permission update

### `bot_settings`
Centralized bot configuration storage.

**Columns:**
- `id` - Auto-increment primary key
- `setting_key` - Unique setting identifier
- `setting_value` - Setting value (text)
- `setting_type` - Data type (string, number, boolean)
- `description` - Setting description

**Common Settings:**
- `client_id` - Discord Application Client ID
- `client_secret` - Discord Client Secret
- `bot_token` - Discord Bot Token
- `guild_id` - Discord Server ID
- `verified_role_id` - Role ID for verified users
- `admin_redirect_uri` - Admin OAuth redirect (optional)

### `pending_role_assignments`
Queue for Discord role assignments.

**Columns:**
- `id` - Auto-increment primary key
- `user_id` - Discord user ID
- `role_id` - Discord role ID to assign
- `guild_id` - Discord server ID
- `created_at` - When queued

See `database/root.sql` for complete schema or individual table files in `database/`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👤 Author

**Lennox Rose**
- Website: [lennox-rose.com](https://lennox-rose.com)
- GitHub: [@lennoxrose](https://github.com/lennoxrose)

**Technologies:**
- Discord OAuth2 API
- TailwindCSS for UI
- PHP & MariaDB for backend
- NGINX for web serving
- Let's Encrypt for SSL certificates

## 📞 Support

For issues or questions:
1. Check the **Known Issues & Solutions** section above
2. Review installer output for specific error messages
3. Check logs:
   - NGINX: `/var/log/nginx/error.log`
   - PHP-FPM: `/var/log/php8.3-fpm.log`
   - MySQL: `/var/log/mysql/error.log`
4. Contact the repository owner

## 📚 Additional Documentation

- **SECURITY.md** - Complete security audit and best practices
- **QUICK_INSTALL.md** - Minimal installer package guide
- **database/migrations/README.md** - Database migration guide
- **api/api-nginx-config** - Reference NGINX configuration

## 🐛 Known Issues & Solutions

### Install Script
**Issue** The Install Script doesnt work like its supposed to be but only on option 1
- **Solution** Fix the code (not in work yet)

### Installation Issues

**Issue:** MySQL authentication errors during installation
- **Solution:** Installers now prompt for MySQL root password upfront and use it in all commands

**Issue:** NGINX default site conflicts with custom domain
- **Solution:** Installers automatically remove `/etc/nginx/sites-enabled/default`

**Issue:** Certbot modifies NGINX config
- **Solution:** This is expected behavior. Installers now replace the config after Certbot with a production-ready version

### Frontend Issues

**Issue:** OAuth2 pages return 502 Bad Gateway
- **Cause:** PHP-FPM not installed or NGINX config has nested location blocks
- **Solution:** Install PHP 8.3 and use explicit regex patterns for PHP files (`location ~ ^/oauth2/.*\.php$`)

**Issue:** Admin config.php returning errors
- **Cause:** Missing `.env` file or incorrect permissions
- **Solution:** Ensure `/var/www/html/admin/.env` exists with `chmod 600` and `chown www-data:www-data`

**Issue:** CLIENT_ID is undefined in admin login
- **Cause:** `client_id` not in `bot_settings` table
- **Solution:** Insert into database:
  ```sql
  INSERT INTO bot_settings (setting_key, setting_value, setting_type, description) 
  VALUES ('client_id', 'YOUR_CLIENT_ID', 'string', 'Discord Application Client ID');
  ```

### Discord OAuth Issues

**Issue:** "Invalid OAuth2 redirect_uri" error
- **Cause:** Redirect URI not configured in Discord Developer Portal or doesn't match exactly
- **Solution:** Add exact URLs (with trailing slash) in Discord:
  - `https://your-domain.com/oauth2/callback/`
  - `https://your-domain.com/admin/callback/`

**Issue:** "invalid_grant" error on callback
- **Cause:** Authorization code expired or already used
- **Solution:** Codes are single-use and expire quickly. Generate a fresh authorization by clicking login again

### Configuration Issues

**Issue:** Hardcoded values in frontend
- **Cause:** Old version of files on server
- **Solution:** Re-copy files from repository and hard refresh browser (Ctrl+Shift+R)

**Issue:** Browser caching old JavaScript
- **Solution:** Clear browser cache or open in incognito/private window

## 🔄 Migration Guide

### From oath2_api to oauth2_api

If you have the old misspelled database name:

```bash
cd database/migrations
bash migrate-database.sh
```

The script will:
1. Prompt for MySQL root password
2. Create backup of old database
3. Create new `oauth2_api` database
4. Copy all tables and data
5. Verify migration
6. Optionally drop old database

### Updating Existing Installation

```bash
cd ~/oauth2
git pull origin main

# Update API files
sudo cp -r api/v2/oauth2/discord/* /var/www/html/v2/oauth2/discord/

# Update frontend files
sudo cp -r webroot/admin/* /var/www/html/admin/
sudo cp -r webroot/oauth2/* /var/www/html/oauth2/

# Restart services
sudo systemctl reload nginx
sudo systemctl reload php8.3-fpm
```

## 🔄 Changelog

See `database/migrations/` folder for database changes and version history.

### December 2025 - Major Overhaul

**Security Improvements:**
- ✅ All API endpoints secured with Bearer token authentication
- ✅ `config.php` no longer exposes API_SECRET publicly
- ✅ Environment-based secrets via `.env.secret` file
- ✅ Proper authentication standardization across all protected endpoints

**Installer System:**
- ✅ Automated installation scripts (install-api.sh, install-panel.sh, install-bot.sh)
- ✅ Main installer with GitHub auto-download capability
- ✅ Path-independent execution using BASH_SOURCE
- ✅ MySQL root password handling
- ✅ Automatic default NGINX site removal
- ✅ Let's Encrypt SSL integration with post-cert config replacement
- ✅ Grouped configuration prompts with clear labels

**Database:**
- ✅ Database renamed from `oath2_api` to `oauth2_api` (migration script provided)
- ✅ Added `bot_settings` table for centralized configuration
- ✅ Migration script with backup and validation

**Frontend:**
- ✅ Dynamic configuration loading (no hardcoded secrets)
- ✅ Admin login uses API-provided CLIENT_ID
- ✅ Fixed OAuth2 redirect URIs (callback/ vs callback.html)
- ✅ Proper error handling and logging

**NGINX:**
- ✅ Production-ready configurations for both API and frontend
- ✅ Explicit PHP handling with regex patterns
- ✅ SSL/TLS 1.2+ with secure ciphers
- ✅ HTTP to HTTPS redirect
- ✅ Security headers

**Bug Fixes:**
- ✅ Fixed nested location blocks causing 502 errors
- ✅ Fixed PHP-FPM socket path inconsistencies
- ✅ Fixed settings.php to use env.php for .env.secret parsing
- ✅ Fixed admin callback to use dynamic API URL

### Version 34 (Previous)
- SVG eye icon for email blur
- Error handling for permission checks
- Fixed logout loop on code updates

### Version 33
- Email blur with MutationObserver
- Always-on email privacy protection

### Version 32
- User data blur protection
- Settings read-only mode

### Version 31
- Custom Error 403 modal
- Permission-based sidebar filtering

## 📞 Support

For issues or questions, contact the repository owner.
