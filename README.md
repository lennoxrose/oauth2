# Discord Verification System

A complete Discord OAuth2 verification system with admin dashboard, role management, and granular permission controls.

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
- **Settings Management** - Configure Discord bot tokens and application secrets
- **Role Sync** - Manual and automated role synchronization
- **Data Protection** - Configurable blur/privacy controls for sensitive data

### Security
- **Role-Based Access Control (RBAC)** - Flexible permission system
- **Session Management** - Secure session handling
- **Token Refresh** - Automatic OAuth2 token renewal
- **Email Privacy** - Blur protection for sensitive user data
- **Audit Logging** - Track permission changes and admin actions

## 📁 Project Structure

```
js-pullback/
├── api/                    # Backend API (deployed to Ubuntu server)
│   └── v2/                 # API v2 endpoints
│       └── oauth2/
│           └── discord/    # Discord OAuth2 handlers
├── bot/                    # Discord bot files (if applicable)
├── database/               # Database schema files
│   ├── admin_permissions.sql
│   ├── discord_verified_users.sql
│   └── pending_role_assignments.sql
├── migrations/             # Database migrations (timestamped)
├── webroot/                # Frontend (deployed to Pterodactyl)
│   ├── admin/              # Admin dashboard
│   │   ├── dashboard/      # Main dashboard page
│   │   ├── users/          # User management
│   │   ├── pullback/       # Role pullback
│   │   ├── sync/           # Server sync
│   │   ├── settings/       # App settings
│   │   ├── permissions/    # Permission management
│   │   ├── components/     # Shared components (sidebar, etc.)
│   │   └── js/             # Shared JavaScript modules
│   ├── oauth2/             # OAuth2 callback handler
│   ├── assets/             # Static assets
│   └── index.html          # Landing page
└── api-nginx-config        # NGINX configuration
```

## 🚀 Tech Stack

**Frontend:**
- HTML5 / CSS3
- JavaScript (ES6+)
- TailwindCSS
- Discord OAuth2

**Backend:**
- PHP 8+
- MariaDB / MySQL
- NGINX

**Deployment:**
- Frontend: Pterodactyl container (lennox-rose.com) (LumenWeb or any other)
- Backend API: Ubuntu server
- Database: MariaDB

## 🔧 Installation

### Prerequisites
- PHP 8.0 or higher
- MySQL/MariaDB 10.5+
- NGINX or Apache
- Discord Application (Bot + OAuth2)

### Database Setup

1. Create the database:
```sql
CREATE DATABASE oath2_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import table schemas:
```bash
# Import all active tables
mysql -u your_user -p oath2_api < database/discord_verified_users.sql
mysql -u your_user -p oath2_api < database/admin_permissions.sql
mysql -u your_user -p oath2_api < database/pending_role_assignments.sql
```

3. Run migrations (if any):
```bash
mysql -u your_user -p oath2_api < migrations/7-12-2025-permissions.sql
```

### Backend Configuration

1. Navigate to the API directory:
```bash
cd /var/www/html/v2/oauth2/discord/
```

2. Create `config.php` with your credentials:
```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'oath2_api');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

define('DISCORD_CLIENT_ID', 'your_discord_client_id');
define('DISCORD_CLIENT_SECRET', 'your_discord_client_secret');
define('DISCORD_REDIRECT_URI', 'https://your-domain.com/oauth2/callback.php');
define('DISCORD_BOT_TOKEN', 'your_discord_bot_token');

define('GUILD_ID', 'your_discord_server_id');
define('VERIFIED_ROLE_ID', 'your_verified_role_id');
```

### Frontend Configuration

1. Update `webroot/admin/js/config.js`:
```javascript
const CONFIG = {
    API_BASE: 'https://your-api-domain.com/v2/oauth2/discord',
    API_SECRET: 'your_api_secret_key',
    DISCORD_CLIENT_ID: 'your_discord_client_id',
    REDIRECT_URI: 'https://your-domain.com/oauth2/callback.php'
};
```

2. Set up your admin user by updating `ADMIN_USER_ID` in `webroot/admin/js/auth.js`:
```javascript
const ADMIN_USER_ID = 'your_discord_user_id';
```

### NGINX Configuration

Copy the NGINX config:
```bash
cp api-nginx-config /etc/nginx/sites-available/your-site
ln -s /etc/nginx/sites-available/your-site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 📊 Permission System

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

### Authentication
- `POST /auth.php` - Check authentication status
- `GET /auth.php` - Get verified users list
- `DELETE /auth.php?user_id={id}` - Delete user

### Permissions
- `GET /permissions.php` - List all admin users with permissions
- `GET /permissions.php?user_id={id}` - Get specific user permissions
- `PUT /permissions.php` - Update user permissions

### Role Management
- `GET /pending-roles.php` - Get pending role assignments
- `POST /pending-roles.php` - Add user to role queue
- `DELETE /pending-roles.php` - Remove from queue

### Utility
- `GET /stats.php` - Get verification statistics
- `POST /cleanup.php` - Clean up invalid tokens
- `POST /delete-all.php` - Delete all verified users (admin only)

## 📦 Database Tables

### `discord_verified_users`
Stores verified Discord users with OAuth2 tokens.

### `admin_permissions`
JSON-based permission system for admin users.

### `pending_role_assignments`
Queue for Discord role assignments.

### `user_permissions` (Deprecated)
Legacy boolean-based permission system. Use `admin_permissions` instead.

See `database/` folder for complete schemas.

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

## 🐛 Known Issues

- Email blur requires MutationObserver due to async table loading
- Permission checks need error handling to prevent logout loops
- Legacy `user_permissions` table needs migration for existing data

## 🔄 Changelog

See `migrations/` folder for database changes and version history.

### Version 34 (Current)
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
