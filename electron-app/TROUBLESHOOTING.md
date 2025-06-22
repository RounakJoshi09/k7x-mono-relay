# Troubleshooting Guide - Windows Build Issues

## Common Build Errors and Solutions

### 1. Symbolic Link Privilege Error

**Error Message:**

```
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

**Solutions:**

#### Option A: Run as Administrator (Recommended)

1. Right-click on Command Prompt or PowerShell
2. Select "Run as administrator"
3. Navigate to the electron-app directory
4. Run the build script:
   ```bash
   build.bat
   ```

#### Option B: Enable Developer Mode

1. Open Windows Settings
2. Go to "Update & Security" > "For developers"
3. Enable "Developer Mode"
4. Restart your computer
5. Try building again

#### Option C: Use Unpacked Build (No Code Signing)

If you continue to have issues, create an unpacked version:

```bash
npm run pack
```

This creates a working application without requiring code signing.

### 2. Antivirus Software Blocking Build

**Symptoms:**

- Build process hangs or fails
- Files are quarantined
- Permission denied errors

**Solutions:**

1. **Temporarily disable antivirus** during build
2. **Add build directory to exclusions** in your antivirus
3. **Use Windows Defender exclusions**:
   - Add `electron-app/build/` to Windows Defender exclusions
   - Add `electron-app/node_modules/` to exclusions

### 3. Node.js Version Issues

**Error:** Module not found or compatibility issues

**Solutions:**

1. **Use Node.js 18+ LTS** (recommended)
2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```
3. **Delete node_modules and reinstall**:
   ```bash
   rmdir /s node_modules
   npm install
   ```

### 4. TypeScript Compilation Errors

**Error:** TypeScript compilation fails

**Solutions:**

1. **Check TypeScript version**:
   ```bash
   npx tsc --version
   ```
2. **Update TypeScript**:
   ```bash
   npm install typescript@latest --save-dev
   ```
3. **Clear TypeScript cache**:
   ```bash
   npx tsc --build --clean
   ```

### 5. Electron Builder Cache Issues

**Error:** Corrupted electron-builder cache

**Solutions:**

1. **Clear electron-builder cache**:
   ```bash
   npx electron-builder install-app-deps
   ```
2. **Delete cache manually**:
   - Delete `%LOCALAPPDATA%/electron-builder/Cache/`
   - Delete `%LOCALAPPDATA%/electron/Cache/`

### 6. Memory Issues During Build

**Error:** Out of memory or build process crashes

**Solutions:**

1. **Increase Node.js memory limit**:
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   build.bat
   ```
2. **Close other applications** to free up memory
3. **Use 64-bit Node.js** if using 32-bit

## Alternative Build Methods

### Method 1: Development Mode (No Packaging)

```bash
npm run dev
```

This runs the application directly without creating installers.

### Method 2: Unpacked Build

```bash
npm run pack
```

This creates a working application in `build/win-unpacked/` that can be run directly.

### Method 3: Portable Build Only

Edit `package.json` to only build portable version:

```json
"win": {
  "target": [
    {
      "target": "portable",
      "arch": ["x64"]
    }
  ]
}
```

## Environment Setup Checklist

### Required Software

- [ ] **Node.js 18+ LTS** installed
- [ ] **Git** installed (for cloning)
- [ ] **Windows 10/11** (64-bit recommended)

### System Requirements

- [ ] **4GB RAM** minimum (8GB recommended)
- [ ] **2GB free disk space** for build process
- [ ] **Administrator privileges** (for full build)

### Network Requirements

- [ ] **Internet connection** for downloading dependencies
- [ ] **No corporate firewall** blocking npm/electron downloads

## Build Process Steps

### Step 1: Verify Environment

```bash
node --version
npm --version
git --version
```

### Step 2: Clean Previous Builds

```bash
npm run clean
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build TypeScript

```bash
npm run build
```

### Step 5: Create Distribution

```bash
npm run dist:win
```

## Testing the Application

### Before Creating Installers

1. **Test in development mode**:

   ```bash
   npm run dev
   ```

2. **Test unpacked build**:
   ```bash
   npm run pack
   cd build/win-unpacked
   Tally Database Loader.exe
   ```

### After Creating Installers

1. **Test NSIS installer**:

   - Run the `.exe` installer
   - Verify installation completes
   - Test application functionality

2. **Test portable version**:
   - Run the portable `.exe`
   - Verify it works without installation

## Getting Help

### Debug Information

When reporting issues, include:

1. **Windows version**: `winver`
2. **Node.js version**: `node --version`
3. **npm version**: `npm --version`
4. **Error logs**: Copy complete error messages
5. **Build output**: Include build console output

### Common Commands for Debugging

```bash
# Check electron-builder version
npx electron-builder --version

# Check electron version
npx electron --version

# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Verify TypeScript compilation
npx tsc --noEmit
```

## Performance Tips

### Faster Builds

1. **Use SSD** for faster file operations
2. **Close unnecessary applications** during build
3. **Use wired internet** for faster downloads
4. **Exclude antivirus scanning** of build directories

### Smaller Builds

1. **Remove unused dependencies** from package.json
2. **Use .gitignore** to exclude unnecessary files
3. **Optimize extraResources** to only include needed files

## Success Indicators

### Successful Build Output

```
✓ electron-builder 24.6.4
  • loaded configuration  file=package.json
  • writing effective config  file=build/builder-effective-config.yaml
  • packaging       platform=win32 arch=x64 electron=27.1.0 appOutDir=build\win-unpacked
  • building        target=nsis file=build\Tally Database Loader Setup 1.0.0.exe
  • building        target=portable file=build\TallyDatabaseLoader-1.0.0-portable.exe
```

### Expected Files After Build

- `build/Tally Database Loader Setup 1.0.0.exe` (NSIS installer)
- `build/TallyDatabaseLoader-1.0.0-portable.exe` (Portable app)
- `build/win-unpacked/` (Unpacked application)
