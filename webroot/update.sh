#!/bin/bash

# OAuth2 Webroot Update Script
# This script updates the webroot directory from GitHub while preserving .env files

set -e

REPO_OWNER="lennoxrose"
REPO_NAME="oauth2"
BRANCH="main"
UPDATE_DIR="webroot"

echo "======================================"
echo "OAuth2 Webroot Update Script"
echo "======================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# Get the script directory (webroot folder)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "Current directory: $SCRIPT_DIR"
echo ""

# Navigate to the repository root (one level up from webroot)
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

echo "Repository root: $REPO_ROOT"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository. Please run this script from within the oauth2 repository."
    exit 1
fi

# Backup all .env files before updating
echo "Step 1: Backing up .env files..."
ENV_FILES=$(find "$SCRIPT_DIR" -name "*.env" -o -name ".env.*" -o -name "env.php" 2>/dev/null || true)

if [ -n "$ENV_FILES" ]; then
    BACKUP_DIR="/tmp/oauth2_env_backup_$(date +%s)"
    mkdir -p "$BACKUP_DIR"
    
    while IFS= read -r env_file; do
        if [ -f "$env_file" ]; then
            rel_path="${env_file#$SCRIPT_DIR/}"
            backup_path="$BACKUP_DIR/$rel_path"
            mkdir -p "$(dirname "$backup_path")"
            cp "$env_file" "$backup_path"
            echo "  ✓ Backed up: $rel_path"
        fi
    done <<< "$ENV_FILES"
    
    echo "  Backup location: $BACKUP_DIR"
else
    echo "  No .env files found to backup"
    BACKUP_DIR=""
fi

echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Step 2: Current branch: $CURRENT_BRANCH"
echo ""

# Stash any local changes (excluding .env files)
echo "Step 3: Stashing local changes..."
if git diff --quiet && git diff --cached --quiet; then
    echo "  No local changes to stash"
else
    git stash push -m "Auto-stash before webroot update $(date +%Y-%m-%d_%H:%M:%S)"
    echo "  ✓ Local changes stashed"
fi

echo ""

# Fetch latest changes from GitHub
echo "Step 4: Fetching latest changes from GitHub..."
git fetch origin "$BRANCH"
echo "  ✓ Fetched latest changes"
echo ""

# Show what will be updated
echo "Step 5: Checking for updates in $UPDATE_DIR/..."
CHANGES=$(git diff --name-only HEAD origin/$BRANCH -- "$UPDATE_DIR/" | grep -v "\.env" | grep -v "env\.php" || true)

if [ -z "$CHANGES" ]; then
    echo "  ✓ No updates available. Webroot is already up to date."
    echo ""
    
    # Restore .env files
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        echo "Step 6: Restoring .env files..."
        cp -r "$BACKUP_DIR"/* "$SCRIPT_DIR/"
        echo "  ✓ .env files restored"
        rm -rf "$BACKUP_DIR"
    fi
    
    exit 0
fi

echo "  Files to be updated:"
echo "$CHANGES" | while read -r file; do
    echo "    - $file"
done

echo ""
read -p "Do you want to proceed with the update? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    
    # Restore .env files
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        echo "Restoring .env files..."
        cp -r "$BACKUP_DIR"/* "$SCRIPT_DIR/"
        echo "  ✓ .env files restored"
        rm -rf "$BACKUP_DIR"
    fi
    
    exit 0
fi

echo ""

# Pull changes for webroot directory only
echo "Step 6: Pulling changes for $UPDATE_DIR/..."
git checkout origin/$BRANCH -- "$UPDATE_DIR/"
echo "  ✓ Updated webroot files from GitHub"
echo ""

# Restore all .env files
if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    echo "Step 7: Restoring .env files..."
    
    while IFS= read -r env_file; do
        rel_path="${env_file#$BACKUP_DIR/}"
        restore_path="$SCRIPT_DIR/$rel_path"
        
        if [ -f "$env_file" ]; then
            mkdir -p "$(dirname "$restore_path")"
            cp "$env_file" "$restore_path"
            echo "  ✓ Restored: $rel_path"
        fi
    done <<< "$(find "$BACKUP_DIR" -type f)"
    
    rm -rf "$BACKUP_DIR"
    echo "  ✓ All .env files restored"
else
    echo "Step 7: No .env files to restore"
fi

echo ""

# Stage the changes
echo "Step 8: Staging updated files..."
git add "$UPDATE_DIR/"

# Unstage any .env files that might have been included
git reset HEAD -- "$UPDATE_DIR/**/*.env" 2>/dev/null || true
git reset HEAD -- "$UPDATE_DIR/**/env.php" 2>/dev/null || true
git reset HEAD -- "$UPDATE_DIR/**/.env.*" 2>/dev/null || true

echo "  ✓ Changes staged (excluding .env files)"
echo ""

# Show summary
echo "======================================"
echo "Update Summary"
echo "======================================"
echo "Updated files:"
git diff --cached --name-only | while read -r file; do
    echo "  ✓ $file"
done

echo ""
echo "✓ Update complete!"
echo ""
echo "Note: Changes have been staged but not committed."
echo "Review the changes and commit when ready:"
echo "  git status"
echo "  git commit -m 'Updated webroot from GitHub'"
echo ""
echo "Your .env files have been preserved and were NOT updated."
echo "======================================"
