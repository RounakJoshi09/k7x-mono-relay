# Configuration Changes for Default Values

## Overview

This document explains the changes made to ensure that new installations of the Tally Database Loader application always start with clean default configuration values instead of the developer's personal settings.

## Changes Made

### 1. New Default Configuration File

- **File**: `config-default.json`
- **Purpose**: Contains clean default values for new installations
- **Location**: Root of electron-app directory

### 2. Updated Build Configuration

- **File**: `package.json`
- **Change**: Modified `extraResources` section to include `config-default.json` instead of `config.json`
- **Impact**: New builds will bundle the default config instead of personal settings

### 3. Enhanced Configuration Loading

- **File**: `src/core-bridge.ts`
- **Changes**:
  - Updated `getConfigPath()` to look for `config-default.json` in resources
  - Enhanced `ensureConfigExists()` to copy default config from resources
  - Added fallback to hardcoded defaults if resources file is missing
  - Added `resetToDefaults()` method for manual reset functionality

### 4. New Reset Functionality

- **Files**: `src/main.ts`, `src/preload.ts`
- **Features**:
  - Added IPC handler for resetting configuration
  - Added menu item "Reset to Defaults" under File menu
  - Exposed reset functionality to renderer process

## Default Configuration Values

The default configuration includes:

- **Database**: MySQL on localhost:3306
- **SSH Tunnel**: Disabled by default
- **Tally**: localhost:9000
- **Dates**: Set to "auto" for automatic detection
- **All passwords**: Empty strings
- **All sensitive data**: Removed

## Benefits

1. **Clean Installations**: New users get a clean slate with sensible defaults
2. **Security**: No personal credentials or connection details are bundled
3. **Consistency**: All installations start with the same configuration
4. **User Control**: Users can reset to defaults anytime via menu

## Migration Notes

- Existing users' configurations are preserved in their user data directory
- The application automatically creates user-specific config files
- Personal `config.json` is no longer bundled with the application
- Developers should use `config-default.json` for testing default behavior

## Testing

To test the changes:

1. Build the application: `npm run dist`
2. Install on a fresh system
3. Verify that the configuration shows default values
4. Test the "Reset to Defaults" menu option
