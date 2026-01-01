# Manual Installation Guide for OAuth2 Backend

**Disclaimer:** The OAuth2 backend has not been developed or validated within a Docker container environment. Any errors, incompatibilities, or unexpected behavior encountered during installation or operation are explicitly expected to be identified and resolved by the deploying administrator.

---

## Introduction

This document provides a detailed and formalized guide for the manual installation and configuration of the OAuth2 backend service. All procedures described herein assume execution under the `root` user account. Failure to do so may result in permission-related issues or incomplete installation steps.

---

## Installation

Prior to initiating the installation process, download the OAuth2 project and upload the contents of both the `api` and `database` directories into the following path:

```
/var/www/html/
```

---

### Step 1: System Update

Ensure that all system packages are fully up to date:

```
apt update && apt upgrade -y
```

---

### Step 2: Install Base Dependencies

Install the required system utilities and package management dependencies:

```
apt install -y software-properties-common curl wget git unzip
```

---

### Step 3: Install PHP 8.3

Add the appropriate PHP repository and install PHP 8.3 along with all required extensions:

```
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath
```

---

### Step 4: Install MariaDB

Install the MariaDB database server and client packages:

```
apt install -y mariadb-server mariadb-client
```

---

### Step 5: Enable and Start MariaDB

Start the MariaDB service and configure it to launch automatically on system boot:

```
systemctl start mariadb
systemctl enable mariadb
```

---

### Step 6: Database Initialization

Access the MariaDB shell and execute the following SQL statements.

#### 6.1 Create Database

```
CREATE DATABASE IF NOT EXISTS oauth2_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 6.2 Create Database User

```
CREATE USER IF NOT EXISTS 'oauth2_api'@'localhost' IDENTIFIED BY 'your_password';
```

#### 6.3 Grant Database Privileges

```
GRANT ALL PRIVILEGES ON oauth2_api.* TO 'oauth2_api'@'localhost';
```

#### 6.4 Apply Privilege Changes

```
FLUSH PRIVILEGES;
```

---

### Step 7: Import Database Schema and Tables

Navigate to the working directory:

```
cd /var/www/html/
```

Execute the following commands, replacing `your_password` with the password configured for the `oauth2_api` database user:

```
mysql -u oauth2_api -p"your_password" oauth2_api < database/admin_permissions.sql || true
mysql -u oauth2_api -p"your_password" oauth2_api < database/bot_settings.sql || true
mysql -u oauth2_api -p"your_password" oauth2_api < database/discord_verified_users.sql || true
mysql -u oauth2_api -p"your_password" oauth2_api < database/pending_role_assignments.sql || true
```

#### 7.1 Import Database Migrations

Execute all migration scripts to apply schema updates and seed data:

```
mysql -u oauth2_api -p"your_password" oauth2_api < database/migrations/*.sql || true
```

---

### Step 8: Backend Environment Configuration (.env.secret)

#### 8.1 Initialize Environment File

Navigate to the Discord OAuth2 backend directory and rename the environment template:

```
cd /var/www/html/vw/oauth2/discord/
mv .env.example .env.secret
```

#### 8.2 Configure Environment Variables

Edit the `.env.secret` file and populate the following values:

* **DISCORD_CLIENT_ID**: Discord application (bot) client ID.
* **DISCORD_CLIENT_SECRET**: Discord application client secret.
* **DISCORD_REDIRECT_URI**: OAuth2 redirect URI; replace `yourdomain.com` with the actual domain.
* **DISCORD_ADMIN_REDIRECT_URI**: Administrative OAuth2 redirect URI; same domain requirements apply.
* **DB_PASS**: Password assigned to the `oauth2_api` database user.
* **ADMIN_USER_ID**: Discord user ID of the administrator.
* **API_SECRET**: Shared API authorization secret. This value must remain consistent across all services utilizing it.

---

### Step 9: SSL Certificate Acquisition

#### 9.1 Install Certificate Utilities

```
apt install -y certbot python3-certbot-nginx
```

#### 9.2 Request SSL Certificate

Replace the domain name and email address with your own values:

```
certbot --nginx -d "api.example.com" --non-interactive --agree-tos -m "admin@example.com" --redirect
```

If certificate issuance fails, resolve the reported issues and retry until successful.

---

### Step 10: Web Server Configuration

#### 10.1 Install Nginx

```
apt install -y nginx
```

#### 10.2 Configure Nginx

Navigate to the working directory:

```
cd /var/www/html/
```

Edit the `api-nginx-config` file and replace all occurrences of `api.example.com` (notably lines 10 and 11) with the actual API domain (e.g., `api.lennox-rose.com`).

Apply the configuration:

```
cp api-nginx-config /etc/nginx/sites-available/default
```

#### 10.3 Validate Configuration

```
nginx -t
```

If validation succeeds, restart the Nginx service:

```
systemctl restart nginx
```

---

## Note

We wish you Goodluck!