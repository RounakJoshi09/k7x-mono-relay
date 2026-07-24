# Fix Permissions for Tally Database Loader
# This script helps resolve permission issues that prevent the application from saving configuration

Write-Host "Tally Database Loader - Permission Fix Tool" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: This script is not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some permission fixes may require elevated privileges" -ForegroundColor Yellow
    Write-Host ""
}

# Define the paths that need permission fixes
$paths = @(
    "$env:LOCALAPPDATA\tally-database-loader-app",
    "$env:APPDATA\tally-database-loader-app",
    "$env:USERPROFILE\Documents\Tally Database Loader",
    "$env:USERPROFILE\Desktop\Tally Database Loader",
    "$env:TEMP\tally-database-loader"
)

Write-Host "Checking and fixing permissions for the following paths:" -ForegroundColor Cyan
foreach ($path in $paths) {
    Write-Host "  - $path" -ForegroundColor White
}
Write-Host ""

# Function to fix permissions for a path
function Fix-PathPermissions {
    param([string]$Path)
    
    try {
        # Create directory if it doesn't exist
        if (-not (Test-Path $Path)) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
            Write-Host "✅ Created directory: $Path" -ForegroundColor Green
        }
        
        # Get current user
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        
        # Set full control permissions for current user
        $acl = Get-Acl $Path
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $Path -AclObject $acl
        
        Write-Host "✅ Fixed permissions for: $Path" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to fix permissions for $Path : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fix permissions for all paths
$successCount = 0
foreach ($path in $paths) {
    if (Fix-PathPermissions -Path $path) {
        $successCount++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Successfully fixed permissions for $successCount out of $($paths.Count) paths" -ForegroundColor White

if ($successCount -eq $paths.Count) {
    Write-Host "✅ All permission fixes completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now try running the Tally Database Loader application again." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some permission fixes failed. You may need to run this script as Administrator." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor White
    Write-Host "  1. Right-click on PowerShell" -ForegroundColor White
    Write-Host "  2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "  3. Navigate to this directory and run this script again" -ForegroundColor White
}

Write-Host ""
Write-Host "Additional troubleshooting steps:" -ForegroundColor Cyan
Write-Host "  1. Make sure the application is not currently running" -ForegroundColor White
Write-Host "  2. Check Windows Defender or antivirus software isn't blocking the application" -ForegroundColor White
Write-Host "  3. Try running the application as Administrator" -ForegroundColor White
Write-Host "  4. If issues persist, check the application logs for more details" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 