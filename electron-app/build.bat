@echo off
REM Tally Database Loader - Build Script
REM This script automates the build and packaging process for Windows

echo =======================================================
echo  Tally Database Loader - Desktop Application Builder
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

echo Node.js and npm are available
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

echo Building TypeScript files...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build TypeScript files
    pause
    exit /b 1
)
echo TypeScript build completed
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Not running as administrator
    echo This may cause issues with code signing and symbolic links
    echo If you encounter build errors, try running this script as administrator
    echo.
)

echo Creating Windows distribution packages...
echo This may take several minutes...
call npm run dist:win
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create distribution packages
    echo.
    echo Possible solutions:
    echo 1. Run this script as administrator
    echo 2. Disable Windows Defender temporarily
    echo 3. Check if antivirus is blocking the build process
    echo 4. Try running: npm run pack (creates unpacked version)
    echo.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo  Build completed successfully!
echo =======================================================
echo.
echo The following packages have been created in the 'build' directory:
echo - NSIS Installer (.exe) - for standard Windows installation
echo - Portable Executable (.exe) - for portable usage
echo.
echo To test the application in development mode, run:
echo   npm run dev
echo.
echo To start the built application, run:
echo   npm start
echo.
echo To create an unpacked version (for testing), run:
echo   npm run pack
echo.
pause 