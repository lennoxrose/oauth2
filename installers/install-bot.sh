#!/bin/bash

# Discord Bot Installer
# Installs Node.js and sets up Discord bot as systemd service
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
echo -e "${BLUE}   Discord Bot Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Collect configuration
echo -e "${CYAN}Please provide the following information:${NC}\n"

read -p "Discord Bot Token: " BOT_TOKEN
read -p "API Base URL (e.g., https://api.example.com/v2/oauth2/discord): " API_BASE
read -p "Installation directory [/opt/discord-bot]: " BOT_DIR
BOT_DIR=${BOT_DIR:-/opt/discord-bot}

echo -e "\n${YELLOW}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Bot Directory: $BOT_DIR"
echo "API Base: $API_BASE"
echo "Bot Token: ********"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
fi

# Install Node.js
echo -e "\n${GREEN}[1/5] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${CYAN}Node.js version: $NODE_VERSION${NC}"
echo -e "${CYAN}NPM version: $NPM_VERSION${NC}"

# Create bot directory
echo -e "\n${GREEN}[2/5] Creating bot directory...${NC}"
mkdir -p "$BOT_DIR"

# Copy bot files
echo -e "\n${GREEN}[3/5] Deploying bot files...${NC}"
cp -r bot/* "$BOT_DIR/" || cp -r src/* "$BOT_DIR/" || echo "Warning: Could not find bot source files"
cp -r commands "$BOT_DIR/" 2>/dev/null || true
cp package.json "$BOT_DIR/" 2>/dev/null || true
cp main.js "$BOT_DIR/" 2>/dev/null || true
cp config.xml "$BOT_DIR/" 2>/dev/null || true

# Create .env file
cat > "$BOT_DIR/.env" << EOF
# Discord Bot Configuration
DISCORD_TOKEN=$BOT_TOKEN
API_BASE=$API_BASE

# Bot Settings
NODE_ENV=production
EOF

# Install dependencies
echo -e "\n${GREEN}[4/5] Installing dependencies...${NC}"
cd "$BOT_DIR"
npm install > /dev/null 2>&1

# Create systemd service
echo -e "\n${GREEN}[5/5] Creating systemd service...${NC}"

cat > /etc/systemd/system/discord-bot.service << EOF
[Unit]
Description=Discord OAuth2 Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$BOT_DIR
ExecStart=/usr/bin/node $BOT_DIR/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=discord-bot

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown -R www-data:www-data "$BOT_DIR"
chmod 600 "$BOT_DIR/.env"

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable discord-bot
systemctl start discord-bot

# Wait for service to start
sleep 2

# Check service status
if systemctl is-active --quiet discord-bot; then
    BOT_STATUS="${GREEN}Running${NC}"
else
    BOT_STATUS="${RED}Stopped${NC}"
fi

# Display summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Discord Bot Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Installation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Bot Directory: ${GREEN}$BOT_DIR${NC}"
echo -e "Node.js: ${GREEN}$NODE_VERSION${NC}"
echo -e "Service: ${GREEN}discord-bot.service${NC}"
echo -e "Status: $BOT_STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${CYAN}Service Management:${NC}"
echo -e "Start:   ${YELLOW}systemctl start discord-bot${NC}"
echo -e "Stop:    ${YELLOW}systemctl stop discord-bot${NC}"
echo -e "Restart: ${YELLOW}systemctl restart discord-bot${NC}"
echo -e "Status:  ${YELLOW}systemctl status discord-bot${NC}"
echo -e "Logs:    ${YELLOW}journalctl -u discord-bot -f${NC}"

echo -e "\n${CYAN}Configuration file:${NC}"
echo -e "$BOT_DIR/.env"

echo -e "\n${YELLOW}Important:${NC}"
echo -e "1. Keep your .env file secure (permissions: 600)"
echo -e "2. Check logs if bot is not responding: journalctl -u discord-bot -f"
echo -e "3. Update bot_settings table in database with your server/role IDs"

echo -e "\n${GREEN}Discord Bot is ready!${NC}\n"
