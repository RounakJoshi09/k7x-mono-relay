# Tally Database Loader - Simple Self-Contained Installer Builder
# This script creates a self-contained installer with better progress reporting

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Tally Database Loader - Simple Installer Builder" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { 
    Remove-Item -Recurse -Force "dist" 
    Write-Host "✓ Removed dist directory" -ForegroundColor Green
}
if (Test-Path "build") { 
    Remove-Item -Recurse -Force "build" 
    Write-Host "✓ Removed build directory" -ForegroundColor Green
}
if (Test-Path "node_modules") { 
    Remove-Item -Recurse -Force "node_modules" 
    Write-Host "✓ Removed node_modules directory" -ForegroundColor Green
}
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "Progress: Installing npm packages..." -ForegroundColor Cyan
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Install electron-builder app dependencies
Write-Host "Installing electron-builder app dependencies..." -ForegroundColor Yellow
npm run postinstall --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install electron-builder app dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Electron-builder app dependencies installed" -ForegroundColor Green
Write-Host ""

# Build TypeScript
Write-Host "Building TypeScript files..." -ForegroundColor Yellow
npm run build --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build TypeScript files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ TypeScript build completed" -ForegroundColor Green
Write-Host ""

# Check administrator status
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠ WARNING: Not running as administrator" -ForegroundColor Yellow
    Write-Host "   Some installer features may not work properly" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Creating self-contained installer packages..." -ForegroundColor Yellow
Write-Host "This will include ALL dependencies - no Node.js needed on target machines!" -ForegroundColor Cyan
Write-Host ""

# Build NSIS installer
Write-Host "Step 1/3: Creating NSIS installer (.exe)..." -ForegroundColor Yellow
Write-Host "   This may take 3-5 minutes..." -ForegroundColor Gray
npm run dist:win-nsis --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create NSIS installer" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Temporarily disable Windows Defender" -ForegroundColor White
    Write-Host "3. Ensure you have at least 2GB free disk space" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ NSIS installer created successfully" -ForegroundColor Green
Write-Host ""

# Build MSI installer
Write-Host "Step 2/3: Creating MSI installer (.msi)..." -ForegroundColor Yellow
Write-Host "   This may take 2-3 minutes..." -ForegroundColor Gray
npm run dist:win-msi --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Failed to create MSI installer" -ForegroundColor Yellow
    Write-Host "   NSIS installer was created successfully" -ForegroundColor Green
} else {
    Write-Host "✓ MSI installer created successfully" -ForegroundColor Green
}
Write-Host ""

# Build portable version
Write-Host "Step 3/3: Creating portable executable..." -ForegroundColor Yellow
Write-Host "   This may take 1-2 minutes..." -ForegroundColor Gray
npm run pack --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Failed to create portable version" -ForegroundColor Yellow
} else {
    Write-Host "✓ Portable executable created successfully" -ForegroundColor Green
}
Write-Host ""

# Success message
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check what was created
Write-Host "Created installer packages:" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "build\TallyDatabaseLoader-1.0.0-setup.exe") {
    $size = (Get-Item "build\TallyDatabaseLoader-1.0.0-setup.exe").Length / 1MB
    Write-Host "✓ NSIS Installer: build\TallyDatabaseLoader-1.0.0-setup.exe ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ NSIS Installer: Not found" -ForegroundColor Red
}

if (Test-Path "build\TallyDatabaseLoader-1.0.0-setup.msi") {
    $size = (Get-Item "build\TallyDatabaseLoader-1.0.0-setup.msi").Length / 1MB
    Write-Host "✓ MSI Installer: build\TallyDatabaseLoader-1.0.0-setup.msi ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ MSI Installer: Not found" -ForegroundColor Red
}

if (Test-Path "build\win-unpacked\Tally Database Loader.exe") {
    Write-Host "✓ Portable: build\win-unpacked\Tally Database Loader.exe" -ForegroundColor Green
} else {
    Write-Host "✗ Portable: Not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  INSTALLER FEATURES:" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "✓ Complete Electron runtime included" -ForegroundColor White
Write-Host "✓ All Node.js dependencies included" -ForegroundColor White
Write-Host "✓ All database drivers included" -ForegroundColor White
Write-Host "✓ Configuration files included" -ForegroundColor White
Write-Host "✓ SQL scripts and reports included" -ForegroundColor White
Write-Host "✓ NO prerequisites needed on target machines" -ForegroundColor Green
Write-Host ""

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  NEXT STEPS:" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "1. Test the installer on a clean machine" -ForegroundColor White
Write-Host "2. Verify all database connections work" -ForegroundColor White
Write-Host "3. Test uninstallation process" -ForegroundColor White
Write-Host "4. Deploy to your target machines" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue" 