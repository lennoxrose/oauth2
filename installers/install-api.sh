#!/bin/bash

# API Backend Installer
# Installs PHP, MariaDB, NGINX, and configures OAuth2 API
# Author: Lennox Rose
# Date: 2025-12-08

set -e

# Get the parent directory (where install.sh is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   API Backend Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Collect configuration
echo -e "${CYAN}Please provide the following information:${NC}\n"

read -p "Domain name (e.g., api.example.com): " DOMAIN
read -p "Database password for oauth2_api user: " DB_PASS
read -p "Discord Client ID: " CLIENT_ID
read -p "Discord Client Secret: " CLIENT_SECRET
read -p "Frontend domain for OAuth redirect (e.g., example.com): " FRONTEND_DOMAIN
read -p "Discord Bot Token (API_SECRET): " BOT_TOKEN
read -p "Admin Discord User ID: " ADMIN_USER_ID
read -sp "MySQL root password: " MYSQL_ROOT_PASS
echo ""

echo ""
read -p "Do you want to install SSL certificate? (y/n): " INSTALL_SSL

if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    read -p "Email for Let's Encrypt notifications: " SSL_EMAIL
fi

echo -e "\n${YELLOW}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Domain: $DOMAIN"
echo "Frontend Domain: $FRONTEND_DOMAIN"
echo "Database Password: ********"
echo "Admin User ID: $ADMIN_USER_ID"
echo "SSL Certificate: $INSTALL_SSL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
fi

# Update system
echo -e "\n${GREEN}[1/8] Updating system packages...${NC}"
apt update > /dev/null 2>&1 && apt upgrade -y > /dev/null 2>&1

# Install dependencies
echo -e "\n${GREEN}[2/8] Installing dependencies...${NC}"
apt install -y software-properties-common curl wget git unzip > /dev/null 2>&1

# Install PHP 8.3
echo -e "\n${GREEN}[3/8] Installing PHP 8.3...${NC}"
add-apt-repository ppa:ondrej/php -y > /dev/null 2>&1
apt update > /dev/null 2>&1
apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath > /dev/null 2>&1

# Install MariaDB
echo -e "\n${GREEN}[4/8] Installing MariaDB...${NC}"
apt install -y mariadb-server mariadb-client > /dev/null 2>&1

# Secure MariaDB
systemctl start mariadb
systemctl enable mariadb

# Create database and user
echo -e "\n${GREEN}[5/8] Setting up database...${NC}"
mysql -u root -p"$MYSQL_ROOT_PASS" -e "CREATE DATABASE IF NOT EXISTS oauth2_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p"$MYSQL_ROOT_PASS" -e "CREATE USER IF NOT EXISTS 'oauth2_api'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -u root -p"$MYSQL_ROOT_PASS" -e "GRANT ALL PRIVILEGES ON oauth2_api.* TO 'oauth2_api'@'localhost';"
mysql -u root -p"$MYSQL_ROOT_PASS" -e "FLUSH PRIVILEGES;"

# Run migrations
echo -e "\n${CYAN}Running database migrations...${NC}"
for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
        # Skip the rename migration - it should only be run manually
        if [[ "$(basename $migration)" == "2025-12-08_rename_database.sql" ]]; then
            echo "Skipping migration: $(basename $migration) (manual migration only)"
            continue
        fi
        
        echo "Running migration: $(basename $migration)"
        # Replace placeholder password in migration file
        sed "s/your_password/$DB_PASS/g" "$migration" | mysql -u root -p"$MYSQL_ROOT_PASS"
    fi
done

# Import base schema
echo -e "\n${CYAN}Importing database schema...${NC}"
mysql -u oauth2_api -p"$DB_PASS" oauth2_api < database/admin_permissions.sql || true
mysql -u oauth2_api -p"$DB_PASS" oauth2_api < database/bot_settings.sql || true
mysql -u oauth2_api -p"$DB_PASS" oauth2_api < database/discord_verified_users.sql || true
mysql -u oauth2_api -p"$DB_PASS" oauth2_api < database/pending_role_assignments.sql || true

echo -e "${GREEN}Database setup complete!${NC}"

# Install NGINX
echo -e "\n${GREEN}[6/8] Installing NGINX...${NC}"
apt install -y nginx > /dev/null 2>&1

# Deploy API files
echo -e "\n${GREEN}[7/8] Deploying API files...${NC}"
API_DIR="/var/www/html/v2/oauth2/discord"
mkdir -p "$API_DIR"

# Copy API files
cp -r api/v2/oauth2/discord/* "$API_DIR/"

# Create .env.secret file
cat > "$API_DIR/.env.secret" << EOF
# Discord OAuth2 Configuration
DISCORD_CLIENT_ID=$CLIENT_ID
DISCORD_CLIENT_SECRET=$CLIENT_SECRET
DISCORD_REDIRECT_URI=https://$FRONTEND_DOMAIN/oauth2/callback/
DISCORD_ADMIN_REDIRECT_URI=https://$FRONTEND_DOMAIN/admin/callback/

# Database Configuration
DB_HOST=localhost
DB_NAME=oauth2_api
DB_USER=oauth2_api
DB_PASS=$DB_PASS

# Admin Configuration
ADMIN_USER_ID=$ADMIN_USER_ID

# API Secret (Bot Token)
API_SECRET=$BOT_TOKEN
EOF

# Set permissions
chown -R www-data:www-data "$API_DIR"
chmod 600 "$API_DIR/.env.secret"
chmod 755 "$API_DIR"
find "$API_DIR" -type f -name "*.php" -exec chmod 644 {} \;

# Configure NGINX
echo -e "\n${GREEN}[8/8] Configuring NGINX...${NC}"

cat > "/etc/nginx/sites-available/$DOMAIN" << 'NGINX_EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    
    root /var/www/html;
    index index.php index.html;

    # API location
    location /v2/oauth2/discord {
        try_files $uri $uri/ /v2/oauth2/discord/index.php?$query_string;
        
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # Deny access to .env files
    location ~ /\.env {
        deny all;
    }

    # PHP processing
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }
}
NGINX_EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "/etc/nginx/sites-available/$DOMAIN"

# Enable site
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

# Test NGINX configuration
nginx -t

# Restart services
systemctl restart php8.3-fpm
systemctl restart nginx
systemctl enable nginx
systemctl enable php8.3-fpm

# Install SSL if requested
if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    echo -e "\n${GREEN}Installing SSL certificate...${NC}"
    
    # Install Certbot
    apt install -y certbot python3-certbot-nginx > /dev/null 2>&1
    
    # Obtain certificate
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect > /dev/null 2>&1
    
    echo -e "${GREEN}SSL certificate installed successfully!${NC}"
fi

# Display summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}API Backend Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Installation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "API URL: ${GREEN}https://$DOMAIN/v2/oauth2/discord${NC}"
echo -e "API Directory: ${GREEN}$API_DIR${NC}"
echo -e "Database: ${GREEN}oauth2_api${NC}"
echo -e "Database User: ${GREEN}oauth2_api${NC}"
echo -e "PHP Version: ${GREEN}8.3${NC}"
echo -e "Web Server: ${GREEN}NGINX${NC}"
if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    echo -e "SSL: ${GREEN}Enabled (Let's Encrypt)${NC}"
else
    echo -e "SSL: ${YELLOW}Not installed${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${CYAN}Test your API:${NC}"
echo -e "curl https://$DOMAIN/v2/oauth2/discord/config.php"

echo -e "\n${CYAN}Configuration file:${NC}"
echo -e "$API_DIR/.env.secret"

echo -e "\n${YELLOW}Important:${NC}"
echo -e "1. Keep your .env.secret file secure (permissions: 600)"
echo -e "2. Never commit .env.secret to version control"
echo -e "3. Update bot_settings table with your Discord bot configuration"
echo -e "4. Review NGINX configuration: /etc/nginx/sites-available/$DOMAIN"

echo -e "\n${GREEN}API Backend is ready!${NC}\n"
