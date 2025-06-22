@echo off
REM Tally Database Loader - Simple Build Script
REM This script creates a working application without electron-builder packaging

echo =======================================================
echo  Tally Database Loader - Simple Application Builder
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

echo Creating simple application package...
if not exist "build" mkdir build
if not exist "build\app" mkdir build\app

echo Copying application files...
xcopy /E /I /Y "dist" "build\app\dist"
xcopy /E /I /Y "src\renderer" "build\app\src\renderer"
xcopy /E /I /Y "core" "build\app\core"
xcopy /E /I /Y "node_modules" "build\app\node_modules"

echo Copying configuration files...
copy "package.json" "build\app\"
copy "..\config.json" "build\app\"
copy "..\tally-export-config.yaml" "build\app\"
copy "..\tally-export-config-incremental.yaml" "build\app\"
copy "..\database-structure.sql" "build\app\"
copy "..\database-structure-incremental.sql" "build\app\"

echo Creating launcher script...
echo @echo off > "build\app\run.bat"
echo echo Starting Tally Database Loader... >> "build\app\run.bat"
echo node_modules\.bin\electron . >> "build\app\run.bat"
echo pause >> "build\app\run.bat"

echo Creating README...
echo Tally Database Loader - Simple Package > "build\app\README.txt"
echo. >> "build\app\README.txt"
echo This is a simple package of the Tally Database Loader application. >> "build\app\README.txt"
echo. >> "build\app\README.txt"
echo To run the application: >> "build\app\README.txt"
echo 1. Double-click run.bat >> "build\app\README.txt"
echo 2. Or run: node_modules\.bin\electron . >> "build\app\README.txt"
echo. >> "build\app\README.txt"
echo Note: This package requires Node.js to be installed on the target system. >> "build\app\README.txt"

echo.
echo =======================================================
echo  Simple build completed successfully!
echo =======================================================
echo.
echo The application has been created in the 'build\app' directory.
echo.
echo To run the application:
echo 1. Navigate to build\app
echo 2. Double-click run.bat
echo 3. Or run: node_modules\.bin\electron .
echo.
echo To create a proper installer later, you can:
echo 1. Run as administrator: build.bat
echo 2. Or use: npm run dist:win
echo.
pause 