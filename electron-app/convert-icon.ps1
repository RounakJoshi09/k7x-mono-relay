# Tally Database Loader - Icon Converter
# This script converts the PNG icon to ICO format for the installer

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Tally Database Loader - Icon Converter" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Check if source icon exists
if (-not (Test-Path "src\assets\icon.png")) {
    Write-Host "ERROR: src\assets\icon.png not found!" -ForegroundColor Red
    Write-Host "Please ensure the icon.png file exists in the src\assets directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Source icon found: src\assets\icon.png" -ForegroundColor Green
Write-Host ""

# Method 1: Try using ImageMagick if available
try {
    Write-Host "Attempting to convert using ImageMagick..." -ForegroundColor Yellow
    magick convert "src\assets\icon.png" -define icon:auto-resize=256,128,64,48,32,16 "src\assets\icon.ico"
    if (Test-Path "src\assets\icon.ico") {
        Write-Host "SUCCESS: Icon converted using ImageMagick!" -ForegroundColor Green
        Write-Host "Created: src\assets\icon.ico" -ForegroundColor Green
        Read-Host "Press Enter to continue"
        exit 0
    }
} catch {
    Write-Host "ImageMagick not available or failed." -ForegroundColor Yellow
}

# Method 2: Try using PowerShell with .NET (basic conversion)
try {
    Write-Host "Attempting to convert using PowerShell..." -ForegroundColor Yellow
    
    # Load System.Drawing assembly
    Add-Type -AssemblyName System.Drawing
    
    # Load the PNG image
    $pngPath = "src\assets\icon.png"
    $icoPath = "src\assets\icon.ico"
    
    $pngImage = [System.Drawing.Image]::FromFile($pngPath)
    
    # Create a new bitmap with the same dimensions
    $bitmap = New-Object System.Drawing.Bitmap($pngImage.Width, $pngImage.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Draw the PNG onto the bitmap
    $graphics.DrawImage($pngImage, 0, 0, $pngImage.Width, $pngImage.Height)
    
    # Save as ICO
    $bitmap.Save($icoPath, [System.Drawing.Imaging.ImageFormat]::Icon)
    
    # Clean up
    $graphics.Dispose()
    $bitmap.Dispose()
    $pngImage.Dispose()
    
    if (Test-Path $icoPath) {
        Write-Host "SUCCESS: Icon converted using PowerShell!" -ForegroundColor Green
        Write-Host "Created: $icoPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "Note: This is a basic conversion. For better quality with multiple sizes," -ForegroundColor Yellow
        Write-Host "consider using ImageMagick or an online converter." -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
        exit 0
    }
} catch {
    Write-Host "PowerShell conversion failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Method 3: Manual instructions
Write-Host "Automatic conversion failed. Manual conversion required:" -ForegroundColor Red
Write-Host ""
Write-Host "Please manually convert src\assets\icon.png to src\assets\icon.ico" -ForegroundColor Yellow
Write-Host ""
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "1. Use an online converter (e.g., convertio.co, cloudconvert.com)" -ForegroundColor White
Write-Host "2. Install ImageMagick and run: magick convert icon.png icon.ico" -ForegroundColor White
Write-Host "3. Use GIMP, Photoshop, or similar image editing software" -ForegroundColor White
Write-Host "4. Use a dedicated icon editor like IcoFX" -ForegroundColor White
Write-Host ""
Write-Host "The ICO file should include multiple sizes: 16x16, 32x32, 48x48, 256x256" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit" 