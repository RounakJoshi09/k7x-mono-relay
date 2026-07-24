@echo off
echo Tally Database Loader - Permission Fix Tool
echo ===========================================
echo.

echo This tool will fix permission issues that prevent the application from saving configuration.
echo.

echo Checking if PowerShell is available...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available on this system.
    echo Please install PowerShell or run the application as Administrator.
    pause
    exit /b 1
)

echo PowerShell is available. Running permission fix...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0fix-permissions.ps1"

echo.
echo Permission fix completed. You can now try running the Tally Database Loader application.
pause 