# Recovery Tools

This directory contains utility scripts for recovering and managing the OAuth2 verification system.

## recovery.js

**Purpose:** Recovers verified users from Discord by fetching members with the verified role and re-inserting them into the database.

### When to Use

- Database was accidentally wiped/cleared
- Users were incorrectly removed by cleanup operations
- After a database restore from backup without user data
- Migration to a new database instance

### Prerequisites

1. Node.js installed on the server
2. `mysql2` npm package installed
3. Bot token and database credentials in `.env.secret`
4. Bot must have `Server Members Intent` enabled in Discord Developer Portal

### Installation

```bash
# On the server
cd /var/www/html/v2/oauth2/discord/
npm install mysql2

# Or install globally
npm install -g mysql2
```

### Usage

```bash
# Run from anywhere on the server
node /path/to/recovery.js

# Or make it executable
chmod +x /path/to/recovery.js
./recovery.js
```

### How It Works

1. **Reads Configuration**: Loads bot token and database credentials from `/var/www/html/v2/oauth2/discord/.env.secret`
2. **Fetches Bot Settings**: Gets `guild_id` and `verified_role_id` from `bot_settings` table
3. **Queries Discord API**: Fetches all members from the Discord guild (paginated, 1000 per request)
4. **Filters Verified**: Identifies members who have the verified role
5. **Restores Database**: Inserts/updates users in `discord_verified_users` table

### Important Notes

- **Access Tokens**: Recovered users will have `RECOVERED_NO_TOKEN` as their access/refresh tokens
  - Users can still access the system
  - They can re-authenticate via OAuth2 to get fresh tokens
- **Rate Limits**: Script includes 1-second delays between Discord API requests to avoid rate limiting
- **Duplicate Handling**: Uses `ON DUPLICATE KEY UPDATE` to update existing users without errors
- **Non-Destructive**: Only inserts/updates, never deletes existing data

### Output Example

```
============================================================
Discord Verified Users Recovery Script
============================================================

📄 Reading configuration from .env.secret...
   ✓ Database: oauth2_api@localhost
   ✓ Bot token loaded

🔌 Connecting to database...
   ✓ Connected

⚙️  Loading bot settings from database...
   ✓ Guild ID: 1384188536172970116
   ✓ Verified Role ID: 1447025421005619240

🌐 Fetching guild members from Discord...
   ✓ Total members fetched: 9

🔍 Filtering verified members...
   ✓ Found 6 verified members

📊 Current database state: 0 users

💾 Inserting verified members into database...
------------------------------------------------------------
   ✓ Inserted: lennoxgotblessed (794370196843790356)
   ✓ Inserted: mikka.s (1135220637565210804)
   ✓ Inserted: ._cryzz. (1292138306460712970)
   ✓ Inserted: crackhead.gsk (1292210845471866973)
   ✓ Inserted: lennox198 (1301179105777160273)
   ✓ Inserted: l.e.nnox (1306175435486400546)
------------------------------------------------------------

📊 Recovery Summary:
   • Inserted: 6 new users
   • Updated:  0 existing users
   • Failed:   0 users
   • Total in DB: 6 users

✅ Recovery complete!

⚠️  Note: Access/refresh tokens are set to "RECOVERED_NO_TOKEN"
   Users can re-authenticate to update their tokens.
```

### Troubleshooting

**Error: Environment file not found**
- Ensure `.env.secret` exists at `/var/www/html/v2/oauth2/discord/.env.secret`
- Check file permissions

**Error: Cannot find module 'mysql2/promise'**
- Install mysql2: `npm install mysql2`
- Or install in the same directory as the script

**Error: Missing guild_id or verified_role_id**
- Ensure `bot_settings` table has these entries
- Run database migrations if needed

**Error: Discord API error: 401**
- Bot token is invalid or expired
- Update `API_SECRET` in `.env.secret`

**Error: Discord API error: 403**
- Bot doesn't have permission to view guild members
- Enable "Server Members Intent" in Discord Developer Portal

**Error: connect ECONNREFUSED**
- Database is not running
- Check `DB_HOST` in `.env.secret`
- For localhost issues, try using `127.0.0.1` instead

### Security Notes

- Keep `.env.secret` file permissions restricted (`chmod 600`)
- Never commit `.env.secret` to version control
- Bot token has full guild member access - protect it
- Script only reads from Discord API, never modifies Discord data
