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

echo Creating Windows distribution packages...
call npm run dist:win
if %errorlevel% neq 0 (
    echo ERROR: Failed to create distribution packages
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
echo - MSI Installer (.msi) - for enterprise deployment
echo.
echo To test the application in development mode, run:
echo   npm run dev
echo.
echo To start the built application, run:
echo   npm start
echo.
pause 