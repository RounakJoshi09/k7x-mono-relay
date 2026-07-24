# Permission Issues and Solutions

## Overview

The Tally Database Loader application may encounter permission errors when trying to save configuration files on Windows systems. This document explains the common causes and provides solutions.

## Common Error

```
Failed to start sync: Error invoking remote method 'start-sync': Error: Failed to save configuration: Error: EPERM: operation not permitted, open 'C:\Users\admin\AppData\Roaming\tally-database-loader-app\config.json'
```

## Causes

1. **Windows User Account Control (UAC)**: The application doesn't have permission to write to the AppData directory
2. **Antivirus Software**: Security software blocking file operations
3. **File System Permissions**: Insufficient permissions on the target directory
4. **Read-only File System**: The directory is marked as read-only
5. **Application Running as Different User**: The application was installed by a different user account

## Solutions

### Solution 1: Automatic Fallback (Recommended)

The application now includes automatic fallback mechanisms that will try multiple locations:

1. **Primary Path**: `%APPDATA%\tally-database-loader-app\config.json`
2. **Documents Folder**: `%USERPROFILE%\Documents\Tally Database Loader\config.json`
3. **Desktop**: `%USERPROFILE%\Desktop\Tally Database Loader\config.json`
4. **Application Directory**: `.\config.json` (in the application folder)
5. **Temp Directory**: `%TEMP%\tally-database-loader\config.json`

The application will automatically use the first writable location.

### Solution 2: Manual Permission Fix

Run the provided PowerShell script to fix permissions:

```powershell
# Navigate to the application directory
cd "path\to\tally-database-loader\electron-app"

# Run the permission fix script
.\fix-permissions.ps1
```

### Solution 3: Run as Administrator

1. Right-click on the Tally Database Loader executable
2. Select "Run as Administrator"
3. Try the operation again

### Solution 4: Manual Directory Creation

1. Open File Explorer
2. Navigate to `C:\Users\[YourUsername]\AppData\Roaming\`
3. Create a folder named `tally-database-loader-app`
4. Right-click the folder → Properties → Security
5. Click "Edit" → "Add" → Enter your username → "OK"
6. Select "Full Control" → "OK"

### Solution 5: Antivirus Exclusions

Add the following paths to your antivirus exclusions:

- `C:\Users\[YourUsername]\AppData\Roaming\tally-database-loader-app\`
- `C:\Users\[YourUsername]\Documents\Tally Database Loader\`
- The application installation directory

## Verification

After applying any solution, verify the fix by:

1. Starting the Tally Database Loader application
2. Going to the Configuration tab
3. Making a small change to any setting
4. Clicking "Save Configuration"
5. If successful, you should see "Configuration saved successfully" in the logs

## Logging

The application provides detailed logging about configuration operations. Check the logs for messages like:

- `Configuration saved successfully`
- `Configuration saved to fallback path: [path]`
- `Found configuration in fallback location: [path]`

## Troubleshooting

### If the application still can't save configuration:

1. **Check Application Logs**: Look for detailed error messages in the application logs
2. **Verify File Permissions**: Ensure the user has write access to the target directory
3. **Disable Antivirus Temporarily**: Test if antivirus is blocking the operation
4. **Use Alternative Location**: The application will automatically use fallback locations
5. **Contact Support**: If all else fails, contact support with the error logs

### Common Error Messages:

- `EPERM: operation not permitted` → Permission issue (use solutions above)
- `ENOENT: no such file or directory` → Directory doesn't exist (application will create it)
- `EACCES: permission denied` → Access denied (run as administrator or fix permissions)

## Prevention

To prevent future permission issues:

1. **Install for Current User**: Install the application for the current user only
2. **Run as Standard User**: Avoid running as administrator for normal operations
3. **Regular Updates**: Keep the application updated to the latest version
4. **Proper Installation**: Use the official installer rather than portable versions

## Technical Details

The application uses Electron's `app.getPath("userData")` which typically resolves to:

- Windows: `%APPDATA%\[app-name]\`
- macOS: `~/Library/Application Support/[app-name]/`
- Linux: `~/.config/[app-name]/`

The enhanced error handling now includes fallback paths and better error reporting to help users resolve permission issues automatically.
