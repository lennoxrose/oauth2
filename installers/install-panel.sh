#!/bin/bash

# Admin Panel Installer
# Deploys admin panel frontend to web server
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
echo -e "${BLUE}   Admin Panel Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Collect configuration
echo -e "${CYAN}Please provide the following information:${NC}\n"

read -p "Domain name (e.g., example.com): " DOMAIN
read -p "API Base URL (e.g., https://api.example.com/v2/oauth2/discord): " API_BASE
read -p "API Secret (Bot Token): " API_SECRET
read -p "Admin Discord User ID: " ADMIN_USER_ID

echo ""
read -p "Do you want to install SSL certificate? (y/n): " INSTALL_SSL

if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    read -p "Email for Let's Encrypt notifications: " SSL_EMAIL
fi

echo -e "\n${YELLOW}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Domain: $DOMAIN"
echo "API Base: $API_BASE"
echo "Admin User ID: $ADMIN_USER_ID"
echo "SSL Certificate: $INSTALL_SSL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
fi

# Check if NGINX is installed
if ! command -v nginx &> /dev/null; then
    echo -e "\n${GREEN}Installing NGINX...${NC}"
    apt update > /dev/null 2>&1
    apt install -y nginx > /dev/null 2>&1
fi

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "\n${GREEN}Installing PHP 8.3...${NC}"
    apt install -y software-properties-common > /dev/null 2>&1
    add-apt-repository ppa:ondrej/php -y > /dev/null 2>&1
    apt update > /dev/null 2>&1
    apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl > /dev/null 2>&1
    systemctl start php8.3-fpm
    systemctl enable php8.3-fpm
fi

# Deploy panel files
echo -e "\n${GREEN}[1/3] Deploying admin panel files...${NC}"
PANEL_DIR="/var/www/html"
ADMIN_DIR="$PANEL_DIR/admin"
OAUTH_DIR="$PANEL_DIR/oauth2"

# Create directories
mkdir -p "$ADMIN_DIR"
mkdir -p "$OAUTH_DIR"

# Copy admin panel files
cp -r webroot/admin/* "$ADMIN_DIR/"
cp -r webroot/oauth2/* "$OAUTH_DIR/"

# Create admin .env file
echo -e "\n${GREEN}[2/3] Creating configuration files...${NC}"

cat > "$ADMIN_DIR/.env" << EOF
# API Configuration
API_SECRET=$API_SECRET
API_BASE=$API_BASE
ADMIN_USER_ID=$ADMIN_USER_ID
APP_DOMAIN=$DOMAIN
EOF

# Create oauth2 .env file
cat > "$OAUTH_DIR/.env" << EOF
# OAuth2 Public Pages Configuration
API_BASE=$API_BASE
APP_DOMAIN=$DOMAIN
EOF

# Set permissions
chown -R www-data:www-data "$PANEL_DIR"
chmod 600 "$ADMIN_DIR/.env"
chmod 600 "$OAUTH_DIR/.env"

# Configure NGINX
echo -e "\n${GREEN}[3/3] Configuring NGINX...${NC}"

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo -e "${YELLOW}Removing default NGINX site...${NC}"
    rm -f /etc/nginx/sites-enabled/default
fi

cat > "/etc/nginx/sites-available/$DOMAIN" << 'NGINX_EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    
    root /var/www/html;
    index index.html index.php;

    # Admin panel
    location /admin {
        try_files $uri $uri/ /admin/index.html;
    }
    
    # Admin PHP files
    location ~ ^/admin/.*\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # OAuth2 pages
    location /oauth2 {
        try_files $uri $uri/ /oauth2/index.html;
    }
    
    # OAuth2 PHP files
    location ~ ^/oauth2/.*\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
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

    # PHP processing (fallback)
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }
}
NGINX_EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "/etc/nginx/sites-available/$DOMAIN"

# Enable site (this will create/overwrite the symlink)
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

echo -e "${GREEN}NGINX configured for domain: $DOMAIN${NC}"

# Test NGINX configuration
nginx -t

# Restart NGINX
systemctl restart nginx
systemctl enable nginx

# Install SSL if requested
if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    echo -e "\n${GREEN}Installing SSL certificate...${NC}"
    
    # Install Certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        apt install -y certbot python3-certbot-nginx > /dev/null 2>&1
    fi
    
    # Obtain certificate (certbot will modify the nginx config)
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect > /dev/null 2>&1
    
    echo -e "${GREEN}SSL certificate obtained successfully!${NC}"
    
    # Now replace the config with the full HTTPS version
    echo -e "${GREEN}Configuring NGINX with SSL...${NC}"
    
    cat > "/etc/nginx/sites-available/$DOMAIN" <<'NGINX_SSL_EOF'
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Admin panel
    location /admin {
        try_files $uri $uri/ /admin/index.html;
    }
    
    # Admin PHP files
    location ~ ^/admin/.*\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # OAuth2 pages
    location /oauth2 {
        try_files $uri $uri/ /oauth2/index.html;
    }
    
    # OAuth2 PHP files
    location ~ ^/oauth2/.*\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
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

    # PHP processing (fallback)
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;
    return 301 https://$server_name$request_uri;
}
NGINX_SSL_EOF

    # Replace domain placeholders
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "/etc/nginx/sites-available/$DOMAIN"
    
    # Test and reload NGINX
    nginx -t
    systemctl reload nginx
    
    echo -e "${GREEN}SSL configuration complete!${NC}"
fi

# Display summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Admin Panel Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Installation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    echo -e "Admin Panel: ${GREEN}https://$DOMAIN/admin${NC}"
    echo -e "OAuth2 Pages: ${GREEN}https://$DOMAIN/oauth2${NC}"
else
    echo -e "Admin Panel: ${GREEN}http://$DOMAIN/admin${NC}"
    echo -e "OAuth2 Pages: ${GREEN}http://$DOMAIN/oauth2${NC}"
fi
echo -e "Panel Directory: ${GREEN}$PANEL_DIR${NC}"
echo -e "Web Server: ${GREEN}NGINX${NC}"
if [[ $INSTALL_SSL == "y" || $INSTALL_SSL == "Y" ]]; then
    echo -e "SSL: ${GREEN}Enabled (Let's Encrypt)${NC}"
else
    echo -e "SSL: ${YELLOW}Not installed${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${CYAN}Configuration files:${NC}"
echo -e "Admin: $ADMIN_DIR/.env"
echo -e "OAuth2: $OAUTH_DIR/.env"

echo -e "\n${YELLOW}Important:${NC}"
echo -e "1. Keep your .env files secure (permissions: 600)"
echo -e "2. Never commit .env files to version control"
echo -e "3. Test admin panel: https://$DOMAIN/admin"
echo -e "4. Test OAuth2: https://$DOMAIN/oauth2"

echo -e "\n${GREEN}Admin Panel is ready!${NC}\n"
