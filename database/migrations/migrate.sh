#!/bin/bash

# Database Migration Script
# Runs all .sql files in date order (DD-MM-YYYY format)

echo "======================================"
echo "Database Migration Script"
echo "======================================"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Check if .env file exists in migrations directory
if [ -f ".env" ]; then
    echo "Found .env file, loading database credentials..."
    
    # Load .env file
    export $(grep -v '^#' .env | xargs)
    
    DB_HOST=${DB_HOST:-localhost}
    DB_USER=${DB_USER}
    DB_PASS=${DB_PASS}
    DB_NAME=${DB_NAME}
else
    echo "Error: .env file not found in migrations directory"
    echo "Please create a .env file with the following format:"
    echo "DB_HOST=localhost"
    echo "DB_USER=your_user"
    echo "DB_PASS=your_password"
    echo "DB_NAME=oauth2_api"
    echo ""
    echo "Or provide database credentials manually:"
    read -p "Database Host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database User: " DB_USER
    read -sp "Database Password: " DB_PASS
    echo ""
    
    read -p "Database Name: " DB_NAME
fi

echo ""
echo "Using database: $DB_NAME on $DB_HOST"
echo ""

# Function to convert DD-MM-YYYY to YYYYMMDD for sorting
convert_date() {
    local filename="$1"
    # Extract date part (DD-MM-YYYY)
    if [[ $filename =~ ^([0-9]{2})-([0-9]{2})-([0-9]{4})- ]]; then
        local day="${BASH_REMATCH[1]}"
        local month="${BASH_REMATCH[2]}"
        local year="${BASH_REMATCH[3]}"
        echo "${year}${month}${day}"
    else
        echo "00000000" # Put invalid format files at the beginning
    fi
}

# Find all .sql files and sort them by date
echo "Scanning for migration files..."
SQL_FILES=()

while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    SQL_FILES+=("$filename")
done < <(find . -maxdepth 1 -name "*.sql" -type f -print0)

# Sort files by date
IFS=$'\n' SORTED_FILES=($(
    for file in "${SQL_FILES[@]}"; do
        sortkey=$(convert_date "$file")
        echo "$sortkey|$file"
    done | sort -t'|' -k1,1 | cut -d'|' -f2
))

if [ ${#SORTED_FILES[@]} -eq 0 ]; then
    echo "No migration files found in this directory."
    exit 0
fi

echo "Found ${#SORTED_FILES[@]} migration file(s):"
echo ""

for file in "${SORTED_FILES[@]}"; do
    echo "  - $file"
done

echo ""
read -p "Do you want to run these migrations? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "======================================"
echo "Running Migrations"
echo "======================================"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_FILES=()

# Run each migration file in order
for file in "${SORTED_FILES[@]}"; do
    echo "Running: $file"
    echo "--------------------------------------"
    
    # Run migration
    OUTPUT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$file" 2>&1)
    EXIT_CODE=$?
    
    # Print output if not empty
    if [ -n "$OUTPUT" ]; then
        echo "$OUTPUT"
    fi
    
    # Check exit code
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✓ Success: $file"
        ((SUCCESS_COUNT++))
    else
        echo "✗ Failed: $file (exit code: $EXIT_CODE)"
        ((FAIL_COUNT++))
        FAILED_FILES+=("$file")
    fi
    
    echo ""
done

echo "======================================"
echo "Migration Summary"
echo "======================================"
echo "Total files: ${#SORTED_FILES[@]}"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"

if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo "Failed migrations:"
    for file in "${FAILED_FILES[@]}"; do
        echo "  ✗ $file"
    done
fi

echo "======================================"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✓ All migrations completed successfully!"
    exit 0
else
    echo "⚠ Some migrations failed. Please review the errors above."
    exit 1
fi
