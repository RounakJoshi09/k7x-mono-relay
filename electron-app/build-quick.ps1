# Tally Database Loader - Quick Installer Builder
# This script creates a self-contained installer quickly

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Tally Database Loader - Quick Installer Builder" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the electron-app directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Quick clean (only if build exists)
if (Test-Path "build") {
    Write-Host "Removing previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "build"
    Write-Host "✓ Previous build removed" -ForegroundColor Green
    Write-Host ""
}

# Install dependencies (skip if node_modules exists)
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
    Write-Host ""
}

# Build TypeScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build TypeScript" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ TypeScript built" -ForegroundColor Green
Write-Host ""

# Create NSIS installer (most reliable)
Write-Host "Creating NSIS installer..." -ForegroundColor Yellow
Write-Host "This will take 3-5 minutes and create a self-contained installer." -ForegroundColor Cyan
Write-Host "The installer will include ALL dependencies - no Node.js needed on target machines!" -ForegroundColor Cyan
Write-Host ""
npm run dist:win-nsis
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create installer" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Temporarily disable Windows Defender" -ForegroundColor White
    Write-Host "3. Ensure you have at least 2GB free disk space" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Installer Created!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check what was created
if (Test-Path "build\TallyDatabaseLoader-1.0.0-setup.exe") {
    $size = (Get-Item "build\TallyDatabaseLoader-1.0.0-setup.exe").Length / 1MB
    Write-Host "✓ Installer created: build\TallyDatabaseLoader-1.0.0-setup.exe" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($size, 1)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This installer includes:" -ForegroundColor Yellow
    Write-Host "• Complete Electron runtime" -ForegroundColor White
    Write-Host "• All Node.js dependencies" -ForegroundColor White
    Write-Host "• All database drivers" -ForegroundColor White
    Write-Host "• Configuration files" -ForegroundColor White
    Write-Host "• SQL scripts and reports" -ForegroundColor White
    Write-Host "• Everything needed to run the application" -ForegroundColor White
    Write-Host ""
    Write-Host "Target machines need NO prerequisites!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To install:" -ForegroundColor Yellow
    Write-Host "1. Double-click the .exe file" -ForegroundColor White
    Write-Host "2. Follow the installation wizard" -ForegroundColor White
    Write-Host "3. Launch from Start Menu or Desktop shortcut" -ForegroundColor White
} else {
    Write-Host "✗ Installer not found in expected location" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to continue" 