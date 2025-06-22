# Tally Database Loader - Startup Guide

## Auto-Start with Windows

The Tally Database Loader now supports automatic startup with Windows, ensuring continuous background synchronization even after system restarts.

### Features

1. **Auto-Start with Windows**: Application automatically starts when Windows boots up
2. **Background Sync**: Automatically begins incremental sync if configured with frequency > 0
3. **System Tray**: Runs minimized in system tray for unobtrusive operation
4. **Start Minimized**: Option to start the application minimized to tray

### Configuration

#### Enable Auto-Start

1. Open the Tally Database Loader application
2. Go to **Advanced Settings** tab
3. Check **"Auto-Start with Windows"** option
4. The application will now start automatically with Windows

#### Configure Background Sync

1. Go to **Tally Server** tab
2. Select **"Incremental"** sync mode
3. Set **"Sync Interval"** to desired minutes (e.g., 5 for every 5 minutes)
4. Save configuration

#### Start Minimized

1. In **Advanced Settings** tab
2. Check **"Start Minimized"** option
3. Application will start minimized to system tray

### How It Works

#### On Windows Startup

1. Windows automatically launches the application
2. Application checks for background sync configuration
3. If frequency > 0 and sync mode = "incremental":
   - Starts background sync automatically
   - Hides main window
   - Shows system tray icon
   - Displays notification about background operation

#### Background Operation

- Application runs in system tray
- Syncs every N minutes as configured
- Only syncs when Tally data has changed
- Shows sync status in tray tooltip
- Right-click tray icon for options

#### System Tray Options

- **Show App**: Restore main window
- **Sync Status**: Check current sync status
- **Startup Settings**: Enable/disable auto-start
- **Quit**: Completely exit application

### Registry Changes

The application modifies the Windows Registry to enable auto-start:

**Location**: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
**Key**: `TallyDatabaseLoader`
**Value**: Path to application executable

### Troubleshooting

#### Auto-Start Not Working

1. Check if Windows Defender or antivirus is blocking the application
2. Verify the application has permission to modify registry
3. Run the application as administrator once to set up permissions

#### Background Sync Not Starting

1. Verify sync mode is set to "Incremental"
2. Check that frequency is greater than 0
3. Ensure Tally server is accessible
4. Check application logs for errors

#### Application Not in System Tray

1. Check Windows notification area settings
2. Ensure "Show hidden icons" is enabled
3. Look for the Tally Database Loader icon

### Security Considerations

- The application only modifies user-specific registry keys
- No system-wide changes are made
- Auto-start can be disabled at any time
- Application runs with user privileges only

### Testing

To test the startup functionality:

1. Enable auto-start in the application
2. Restart your computer
3. Check if the application starts automatically
4. Verify background sync begins if configured
5. Check system tray for the application icon

### Manual Testing

Use the provided `start-minimized.bat` file to test minimized startup:

```batch
start-minimized.bat
```

This will start the application minimized to test the background functionality without restarting Windows.
