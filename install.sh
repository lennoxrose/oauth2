#!/bin/bash

# OAuth2 System Installer
# Installs API, Admin Panel, and Discord Bot
# Author: Lennox Rose
# Date: 2025-12-08

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${RED} WARNING THE INSTALLERS MIGHT BE BROKEN. MANUEL INSTALLATION IS RECOMMENDED. PROCEDE WITH CAUTION ${NC}\n"
echo -e "${BLUE}
   ▄████▄ ▄████▄ ▄▄ ▄▄ ▄▄▄▄▄▄ ▄▄ ▄▄ ████▄ 
   ██  ██ ██▄▄██ ██ ██   ██   ██▄██  ▄██▀ 
   ▀████▀ ██  ██ ▀███▀   ██   ██ ██ ███▄▄ 
                                       
      OAuth2 System Installer by Lennox
${NC}"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Welcome to the OAuth2 System Installation Wizard${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   echo -e "${YELLOW}Please run: sudo bash install.sh${NC}"
   exit 1
fi

# GitHub repository
GITHUB_REPO="https://github.com/lennoxrose/oauth2.git"
TEMP_DIR="/tmp/oauth2-install-$(date +%s)"

# Clone repository if needed
if [ ! -d "api" ] || [ ! -d "bot" ] || [ ! -d "webroot" ] || [ ! -d "database" ]; then
    echo -e "\n${YELLOW}Downloading latest files from GitHub...${NC}"
    
    # Install git if not present
    if ! command -v git &> /dev/null; then
        echo -e "${CYAN}Installing git...${NC}"
        apt update > /dev/null 2>&1
        apt install -y git > /dev/null 2>&1
    fi
    
    # Clone repository to temp directory
    echo -e "${CYAN}Cloning repository: $GITHUB_REPO${NC}"
    git clone --depth 1 "$GITHUB_REPO" "$TEMP_DIR" > /dev/null 2>&1
    
    # Copy necessary directories to current location
    echo -e "${CYAN}Copying files...${NC}"
    cp -r "$TEMP_DIR/api" . 2>/dev/null || true
    cp -r "$TEMP_DIR/bot" . 2>/dev/null || true
    cp -r "$TEMP_DIR/webroot" . 2>/dev/null || true
    cp -r "$TEMP_DIR/database" . 2>/dev/null || true
    
    # Cleanup temp directory
    rm -rf "$TEMP_DIR"
    
    echo -e "${GREEN}✓ Files downloaded successfully!${NC}\n"
else
    echo -e "${GREEN}✓ All required directories found locally${NC}\n"
fi

# Main menu
echo -e "${YELLOW}What would you like to install?${NC}\n"
echo "1) API Backend (PHP + MariaDB + NGINX)"
echo "2) Admin Panel (Frontend)"
echo "3) Discord Bot (Node.js)"
echo "4) Exit"
echo ""

read -p "Enter your choice [1-4]: " INSTALL_CHOICE

case $INSTALL_CHOICE in
    1)
        echo -e "\n${GREEN}Installing API Backend...${NC}"
        bash ./installers/install-api.sh
        ;;
    2)
        echo -e "\n${GREEN}Installing Admin Panel...${NC}"
        bash ./installers/install-panel.sh
        ;;
    3)
        echo -e "\n${GREEN}Installing Discord Bot...${NC}"
        bash ./installers/install-bot.sh
        ;;
    4)
        echo -e "${YELLOW}Installation cancelled.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Review your configuration files"
echo -e "2. Test your endpoints"
echo -e "3. Check the logs for any errors"
echo -e "\n${YELLOW}Thank you for using OAuth2 System!${NC}\n"
