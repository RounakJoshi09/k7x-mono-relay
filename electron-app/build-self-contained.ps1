# Tally Database Loader - Self-Contained Installer Builder (PowerShell)
# This script creates a completely self-contained installer that includes all dependencies
# No Node.js or any other prerequisites required on target machines

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Tally Database Loader - Self-Contained Installer Builder" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm is not available" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: npm is not available" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Prerequisites check completed" -ForegroundColor Green
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
Write-Host "npm version: $npmVersion" -ForegroundColor Cyan
Write-Host ""

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    Write-Host "Please run this script from the electron-app directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Clear previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
Write-Host "Clean completed" -ForegroundColor Green
Write-Host ""

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Installing electron-builder app dependencies..." -ForegroundColor Yellow
npm run postinstall
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install electron-builder app dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Electron-builder app dependencies installed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Building TypeScript files..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build TypeScript files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "TypeScript build completed" -ForegroundColor Green
Write-Host ""

Write-Host "Verifying build..." -ForegroundColor Yellow
npm run verify
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build verification failed" -ForegroundColor Red
    Write-Host "Please fix the issues above before building the installer" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Build verification completed" -ForegroundColor Green
Write-Host ""

# Check if running as administrator (recommended for installer builds)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as administrator" -ForegroundColor Yellow
    Write-Host "Installer builds may fail. Consider running as administrator." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Creating self-contained installer packages..." -ForegroundColor Yellow
Write-Host "This will create packages that include ALL dependencies (Node.js, Electron, etc.)" -ForegroundColor Cyan
Write-Host "The target machines will NOT need Node.js or any other prerequisites." -ForegroundColor Cyan
Write-Host ""
Write-Host "Building process may take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

# Build NSIS installer (recommended for Windows)
Write-Host "Creating NSIS installer (.exe)..." -ForegroundColor Yellow
npm run dist:win-nsis
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create NSIS installer" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible solutions:" -ForegroundColor Yellow
    Write-Host "1. Run this script as administrator" -ForegroundColor White
    Write-Host "2. Disable Windows Defender temporarily" -ForegroundColor White
    Write-Host "3. Check if antivirus is blocking the build process" -ForegroundColor White
    Write-Host "4. Ensure sufficient disk space (at least 2GB free)" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Build MSI installer (for enterprise deployment)
Write-Host "Creating MSI installer (.msi)..." -ForegroundColor Yellow
npm run dist:win-msi
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Failed to create MSI installer" -ForegroundColor Yellow
    Write-Host "NSIS installer was created successfully" -ForegroundColor Green
    Write-Host ""
}

# Build portable version
Write-Host "Creating portable executable..." -ForegroundColor Yellow
npm run pack
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Failed to create portable version" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Self-Contained Installer Creation Completed!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The following self-contained packages have been created:" -ForegroundColor Cyan
Write-Host ""
Write-Host "NSIS Installer (.exe):" -ForegroundColor Yellow
Write-Host "- Location: build\TallyDatabaseLoader-1.0.0-setup.exe" -ForegroundColor White
Write-Host "- Features: Standard Windows installer with all dependencies included" -ForegroundColor White
Write-Host "- Target machines: NO Node.js or other prerequisites required" -ForegroundColor White
Write-Host ""
Write-Host "MSI Installer (.msi):" -ForegroundColor Yellow
Write-Host "- Location: build\TallyDatabaseLoader-1.0.0-setup.msi" -ForegroundColor White
Write-Host "- Features: Enterprise deployment with all dependencies included" -ForegroundColor White
Write-Host "- Target machines: NO Node.js or other prerequisites required" -ForegroundColor White
Write-Host ""
Write-Host "Portable Executable:" -ForegroundColor Yellow
Write-Host "- Location: build\win-unpacked\Tally Database Loader.exe" -ForegroundColor White
Write-Host "- Features: Portable version with all dependencies included" -ForegroundColor White
Write-Host "- Target machines: NO Node.js or other prerequisites required" -ForegroundColor White
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  What's Included in Each Package:" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "- Complete Electron runtime" -ForegroundColor White
Write-Host "- All Node.js dependencies" -ForegroundColor White
Write-Host "- All application files and resources" -ForegroundColor White
Write-Host "- Database drivers (MySQL, PostgreSQL, SQL Server, BigQuery)" -ForegroundColor White
Write-Host "- Configuration files" -ForegroundColor White
Write-Host "- SQL scripts and reports" -ForegroundColor White
Write-Host "- Everything needed to run the application" -ForegroundColor White
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Installation Instructions:" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "For End Users:" -ForegroundColor Yellow
Write-Host "1. Double-click the .exe or .msi file" -ForegroundColor White
Write-Host "2. Follow the installation wizard" -ForegroundColor White
Write-Host "3. Launch from Start Menu or Desktop shortcut" -ForegroundColor White
Write-Host ""
Write-Host "For Enterprise Deployment:" -ForegroundColor Yellow
Write-Host "1. Use Group Policy to deploy the .msi file" -ForegroundColor White
Write-Host "2. Use SCCM or similar tools for automated deployment" -ForegroundColor White
Write-Host "3. Silent installation: msiexec /i TallyDatabaseLoader-1.0.0-setup.msi /quiet" -ForegroundColor White
Write-Host ""
Write-Host "For Portable Usage:" -ForegroundColor Yellow
Write-Host "1. Extract the portable executable to any folder" -ForegroundColor White
Write-Host "2. Double-click 'Tally Database Loader.exe'" -ForegroundColor White
Write-Host "3. No installation required" -ForegroundColor White
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Testing Recommendations:" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "1. Test on a clean Windows machine (no Node.js installed)" -ForegroundColor White
Write-Host "2. Test on Windows 10 and Windows 11" -ForegroundColor White
Write-Host "3. Test both 32-bit and 64-bit systems" -ForegroundColor White
Write-Host "4. Test with different user permission levels" -ForegroundColor White
Write-Host "5. Test uninstallation process" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue" 