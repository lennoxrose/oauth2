@echo off
setlocal enabledelayedexpansion

::if your are reading this means you are look at the code of a developer tool of course you can use it yourself but its originaly made for the Developers of OAuth2 Admin Dashboard

:: Cache Version Updater for OAuth2 Admin Dashboard
:: This script updates the cache version across all files

echo ================================================
echo    Cache Version Updater
echo ================================================
echo.

:: Get current version from sidebar.js
set "sidebar_file=..\webroot\admin\components\sidebar.js"

if not exist "%sidebar_file%" (
    echo ERROR: Could not find sidebar.js
    echo Expected location: %sidebar_file%
    pause
    exit /b 1
)

:: Extract current version
for /f "tokens=4" %%a in ('findstr /c:"const SCRIPT_VERSION = " "%sidebar_file%"') do (
    set "current_version=%%a"
    set "current_version=!current_version:;=!"
)

echo Current version: %current_version%
echo.

:: Ask for new version
set /p "new_version=Enter new version (or press Enter to auto-increment to %current_version%+1): "

if "%new_version%"=="" (
    set /a new_version=%current_version%+1
    echo Auto-incrementing to version: !new_version!
)

echo.
echo Updating from version %current_version% to version %new_version%
echo.
set /p "confirm=Continue? (Y/N): "

if /i not "%confirm%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Starting update...
echo.

:: Update sidebar.js
echo [1/10] Updating sidebar.js...
powershell -Command "(Get-Content '%sidebar_file%') -replace 'const SCRIPT_VERSION = %current_version%;', 'const SCRIPT_VERSION = %new_version%;' | Set-Content '%sidebar_file%'"

:: Update all HTML files
echo [2/10] Updating embeds/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\embeds\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\embeds\index.html'"

echo [3/10] Updating emojis/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\emojis\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\emojis\index.html'"

echo [4/10] Updating permissions/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\permissions\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\permissions\index.html'"

echo [5/10] Updating pullback/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\pullback\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\pullback\index.html'"

echo [6/10] Updating settings/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\settings\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\settings\index.html'"

echo [7/10] Updating sync/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\sync\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\sync\index.html'"

echo [8/10] Updating users/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\users\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\users\index.html'"

echo [9/10] Updating dashboard/index.html...
powershell -Command "(Get-Content '..\webroot\admin\dashboard\index.html') -replace 'sidebar.js\?v=%current_version%', 'sidebar.js?v=%new_version%' -replace 'permissions.js\?v=%current_version%', 'permissions.js?v=%new_version%' | Set-Content '..\webroot\admin\dashboard\index.html'"

echo [10/10] Done!
echo.
echo ================================================
echo Successfully updated cache version:
echo   %current_version% --^> %new_version%
echo ================================================
echo.
echo Files updated:
echo   - sidebar.js
echo   - 8 HTML pages
echo.
echo Next steps:
echo   1. Review the changes
echo   2. Deploy to your Docker container
echo.
pause
