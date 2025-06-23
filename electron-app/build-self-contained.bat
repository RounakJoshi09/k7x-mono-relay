@echo off
REM Tally Database Loader - Self-Contained Installer Builder
REM This script creates a completely self-contained installer that includes all dependencies
REM No Node.js or any other prerequisites required on target machines

echo =======================================================
echo  Tally Database Loader - Self-Contained Installer Builder
echo =======================================================
echo.

REM Check if Node.js is installed
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo Prerequisites check completed
echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the electron-app directory
    pause
    exit /b 1
)

REM Clear previous builds
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"
if exist "node_modules" rmdir /s /q "node_modules"
echo Clean completed
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully
echo.

echo Installing electron-builder app dependencies...
call npm run postinstall
if %errorlevel% neq 0 (
    echo ERROR: Failed to install electron-builder app dependencies
    pause
    exit /b 1
)
echo Electron-builder app dependencies installed successfully
echo.

echo Building TypeScript files...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build TypeScript files
    pause
    exit /b 1
)
echo TypeScript build completed
echo.

REM Check if running as administrator (recommended for installer builds)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Not running as administrator
    echo Installer builds may fail. Consider running as administrator.
    echo.
)

echo Creating self-contained installer packages...
echo This will create packages that include ALL dependencies (Node.js, Electron, etc.)
echo The target machines will NOT need Node.js or any other prerequisites.
echo.
echo Building process may take 5-10 minutes...
echo.

REM Build NSIS installer (recommended for Windows)
echo Creating NSIS installer (.exe)...
call npm run dist:win-nsis
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create NSIS installer
    echo.
    echo Possible solutions:
    echo 1. Run this script as administrator
    echo 2. Disable Windows Defender temporarily
    echo 3. Check if antivirus is blocking the build process
    echo 4. Ensure sufficient disk space (at least 2GB free)
    echo.
    pause
    exit /b 1
)

REM Build MSI installer (for enterprise deployment)
echo Creating MSI installer (.msi)...
call npm run dist:win-msi
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Failed to create MSI installer
    echo NSIS installer was created successfully
    echo.
)

REM Build portable version
echo Creating portable executable...
call npm run pack
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Failed to create portable version
    echo.
)

echo.
echo =======================================================
echo  Self-Contained Installer Creation Completed!
echo =======================================================
echo.
echo The following self-contained packages have been created:
echo.
echo NSIS Installer (.exe):
echo - Location: build\TallyDatabaseLoader-1.0.0-setup.exe
echo - Features: Standard Windows installer with all dependencies included
echo - Target machines: NO Node.js or other prerequisites required
echo.
echo MSI Installer (.msi):
echo - Location: build\TallyDatabaseLoader-1.0.0-setup.msi
echo - Features: Enterprise deployment with all dependencies included
echo - Target machines: NO Node.js or other prerequisites required
echo.
echo Portable Executable:
echo - Location: build\win-unpacked\Tally Database Loader.exe
echo - Features: Portable version with all dependencies included
echo - Target machines: NO Node.js or other prerequisites required
echo.
echo =======================================================
echo  What's Included in Each Package:
echo =======================================================
echo - Complete Electron runtime
echo - All Node.js dependencies
echo - All application files and resources
echo - Database drivers (MySQL, PostgreSQL, SQL Server, BigQuery)
echo - Configuration files
echo - SQL scripts and reports
echo - Everything needed to run the application
echo.
echo =======================================================
echo  Installation Instructions:
echo =======================================================
echo.
echo For End Users:
echo 1. Double-click the .exe or .msi file
echo 2. Follow the installation wizard
echo 3. Launch from Start Menu or Desktop shortcut
echo.
echo For Enterprise Deployment:
echo 1. Use Group Policy to deploy the .msi file
echo 2. Use SCCM or similar tools for automated deployment
echo 3. Silent installation: msiexec /i TallyDatabaseLoader-1.0.0-setup.msi /quiet
echo.
echo For Portable Usage:
echo 1. Extract the portable executable to any folder
echo 2. Double-click "Tally Database Loader.exe"
echo 3. No installation required
echo.
echo =======================================================
echo  Testing Recommendations:
echo =======================================================
echo 1. Test on a clean Windows machine (no Node.js installed)
echo 2. Test on Windows 10 and Windows 11
echo 3. Test both 32-bit and 64-bit systems
echo 4. Test with different user permission levels
echo 5. Test uninstallation process
echo.
pause 