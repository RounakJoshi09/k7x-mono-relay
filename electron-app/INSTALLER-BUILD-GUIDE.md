# Tally Database Loader - Self-Contained Installer Build Guide

This guide explains how to create a completely self-contained installer that includes all dependencies and can run on any Windows machine without requiring Node.js or any other prerequisites.

## What This Creates

The build process creates installer packages that include:

- **Complete Electron runtime** (Chromium + Node.js)
- **All application dependencies** (MySQL, PostgreSQL, SQL Server, BigQuery drivers)
- **All application files** (TypeScript compiled code, assets, configurations)
- **Database scripts and reports**
- **Everything needed to run the application**

Target machines will **NOT** need:

- Node.js
- npm
- Any database drivers
- Any other prerequisites

## Prerequisites for Building

### Required Software

1. **Node.js** (v18 or higher)

   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Git** (for version control)

   - Download from: https://git-scm.com/

3. **Windows Build Tools** (optional, for native modules)
   - Run: `npm install --global windows-build-tools`

### Optional Software

1. **ImageMagick** (for icon conversion)

   - Download from: https://imagemagick.org/
   - Used to convert PNG to ICO format

2. **WiX Toolset** (for MSI creation)
   - Download from: https://wixtoolset.org/
   - Required only for MSI installer creation

## Step-by-Step Build Process

### Step 1: Prepare the Environment

1. **Open Command Prompt as Administrator** (recommended)
2. **Navigate to the electron-app directory:**
   ```cmd
   cd path\to\tally-database-loader\electron-app
   ```

### Step 2: Convert Icon (Required)

The installer needs an ICO file. Run the icon converter:

```cmd
powershell -ExecutionPolicy Bypass -File convert-icon.ps1
```

This will attempt to convert `src\assets\icon.png` to `src\assets\icon.ico`.

If automatic conversion fails, manually convert the icon using:

- Online converters (convertio.co, cloudconvert.com)
- ImageMagick: `magick convert icon.png icon.ico`
- Image editing software (GIMP, Photoshop)

### Step 3: Build Self-Contained Installer

Run the comprehensive build script:

```cmd
build-self-contained.bat
```

This script will:

1. Clean previous builds
2. Install all dependencies
3. Build TypeScript files
4. Create NSIS installer (.exe)
5. Create MSI installer (.msi)
6. Create portable executable

### Alternative: Manual Build Commands

If you prefer manual control:

```cmd
# Clean and install
npm run clean
npm install
npm run postinstall

# Build application
npm run build

# Create installers
npm run dist:win-nsis    # Creates .exe installer
npm run dist:win-msi     # Creates .msi installer
npm run pack             # Creates portable version
```

## Output Files

After successful build, you'll find these files in the `build` directory:

### NSIS Installer (.exe)

- **File:** `TallyDatabaseLoader-1.0.0-setup.exe`
- **Size:** ~150-200MB (includes all dependencies)
- **Features:**
  - Standard Windows installer wizard
  - Customizable installation directory
  - Desktop and Start Menu shortcuts
  - Proper uninstallation support
  - Per-machine installation

### MSI Installer (.msi)

- **File:** `TallyDatabaseLoader-1.0.0-setup.msi`
- **Size:** ~150-200MB (includes all dependencies)
- **Features:**
  - Enterprise deployment support
  - Group Policy deployment
  - SCCM integration
  - Silent installation support

### Portable Executable

- **Location:** `build\win-unpacked\Tally Database Loader.exe`
- **Size:** ~150-200MB (includes all dependencies)
- **Features:**
  - No installation required
  - Can run from USB drive
  - Self-contained

## Installation Instructions

### For End Users

1. **Double-click** the `.exe` or `.msi` file
2. **Follow** the installation wizard
3. **Launch** from Start Menu or Desktop shortcut

### For Enterprise Deployment

1. **Group Policy Deployment:**

   ```cmd
   # Deploy via Group Policy
   # Use the .msi file in Computer Configuration > Software Settings > Software Installation
   ```

2. **SCCM Deployment:**

   - Import the .msi file to SCCM
   - Create deployment package
   - Deploy to target machines

3. **Silent Installation:**

   ```cmd
   # Silent install
   msiexec /i TallyDatabaseLoader-1.0.0-setup.msi /quiet

   # Silent install with custom directory
   msiexec /i TallyDatabaseLoader-1.0.0-setup.msi /quiet INSTALLDIR="C:\CustomPath"
   ```

### For Portable Usage

1. **Extract** the portable executable to any folder
2. **Double-click** "Tally Database Loader.exe"
3. **No installation** required

## What's Included in Each Package

### Application Components

- Complete Electron application
- All TypeScript compiled code
- HTML/CSS/JavaScript frontend
- Database connection modules

### Dependencies

- **Database Drivers:**

  - MySQL (mysql2)
  - PostgreSQL (pg, pg-copy-streams)
  - SQL Server (tedious)
  - Google BigQuery (@google-cloud/bigquery)
  - Azure Data Lake (@azure/storage-file-datalake)

- **Utility Libraries:**
  - SSH tunneling (ssh2)
  - YAML parsing (js-yaml)
  - WebSocket support (ws)
  - Configuration storage (electron-store)

### Resources

- Configuration files (config.json, tally-export-config.yaml)
- Database structure scripts
- SQL reports for all platforms
- Platform-specific scripts
- Application icons and assets

## Testing the Installer

### Recommended Testing Scenarios

1. **Clean Machine Test:**

   - Fresh Windows installation
   - No Node.js installed
   - No development tools

2. **Different Windows Versions:**

   - Windows 10 (64-bit)
   - Windows 11 (64-bit)
   - Windows Server 2019/2022

3. **User Permission Levels:**

   - Standard user
   - Administrator
   - Domain user

4. **Installation Methods:**
   - Interactive installation
   - Silent installation
   - Unattended installation

### Testing Checklist

- [ ] Application launches successfully
- [ ] All database connections work
- [ ] Configuration files are accessible
- [ ] Logs are created properly
- [ ] Uninstallation works correctly
- [ ] No leftover files after uninstall
- [ ] Registry entries are cleaned up

## Troubleshooting

### Common Build Issues

1. **"Node.js not found"**

   - Install Node.js v18 or higher
   - Restart command prompt after installation

2. **"npm not available"**

   - Node.js installation includes npm
   - Check PATH environment variable

3. **Build fails with permission errors**

   - Run as administrator
   - Disable antivirus temporarily
   - Check Windows Defender settings

4. **Icon conversion fails**

   - Install ImageMagick
   - Use online converter
   - Manual conversion with image editor

5. **Insufficient disk space**
   - Ensure at least 2GB free space
   - Clean temporary files

### Common Installation Issues

1. **"Application won't start"**

   - Check Windows Event Logs
   - Verify target machine architecture (x64)
   - Ensure sufficient disk space

2. **"Database connection fails"**

   - Verify network connectivity
   - Check firewall settings
   - Ensure database server is accessible

3. **"Configuration not found"**
   - Check application data directory
   - Verify file permissions
   - Reinstall application

## File Structure After Installation

```
C:\Program Files\Tally Database Loader\
├── Tally Database Loader.exe
├── resources\
│   ├── app.asar (packaged application)
│   ├── config.json
│   ├── tally-export-config.yaml
│   ├── database-structure.sql
│   ├── platform\
│   └── reports\
└── locales\

%LOCALAPPDATA%\Tally Database Loader\
├── config.json (user configuration)
├── logs\
└── data\
```

## Security Considerations

1. **Code Signing:**

   - Consider signing the installer for trusted installation
   - Prevents Windows SmartScreen warnings

2. **Antivirus Exclusions:**

   - Add application directory to antivirus exclusions
   - Prevents false positive detections

3. **Network Security:**
   - Configure firewall rules for database connections
   - Use VPN for remote database access

## Performance Optimization

1. **Startup Time:**

   - First launch may be slower (extracting resources)
   - Subsequent launches are faster

2. **Memory Usage:**

   - Application uses ~100-200MB RAM
   - Database operations may use additional memory

3. **Disk Space:**
   - Installation requires ~200MB
   - Logs and data may grow over time

## Support and Maintenance

### Log Files

- **Application Logs:** `%LOCALAPPDATA%\Tally Database Loader\logs\`
- **Installation Logs:** Windows Event Logs
- **Uninstall Logs:** Windows Event Logs

### Updates

- Manual updates: Download and install new version
- Automatic updates: Configure electron-updater (future enhancement)

### Backup

- Configuration files: `%LOCALAPPDATA%\Tally Database Loader\`
- Database connections: Stored in application configuration

## Conclusion

This build process creates a completely self-contained installer that includes all dependencies and can run on any Windows machine without requiring Node.js or any other prerequisites. The resulting installer is suitable for both individual users and enterprise deployment scenarios.
