# Sync Troubleshooting Guide

This guide helps you diagnose and fix sync issues in the Tally Database Loader application.

## Quick Diagnostic Steps

### 1. Check Application Logs

- Open the application
- Go to the Logs tab
- Look for any error messages or warnings
- Check the console output for detailed error information

### 2. Run Core Module Test

```bash
npm run test:core
```

This will test if the core modules can be loaded properly.

### 3. Check Configuration

- Verify all database connection details are correct
- Ensure Tally server details are accurate
- Check that the company name is specified for incremental sync

## Common Issues and Solutions

### Issue: "Sync Failed" with no detailed error message

**Symptoms:**

- Toast shows "Sync Failed"
- No errors in logs
- Sync process starts but immediately fails

**Possible Causes:**

1. Core modules not properly built or packaged
2. Module resolution issues in packaged app
3. Missing dependencies
4. File permission issues

**Solutions:**

#### 1. Rebuild the Application

```bash
# Clean previous builds
npm run clean

# Rebuild everything
npm run build

# Create new installer
npm run dist:win-msi
```

#### 2. Check Core Module Files

After building, verify these files exist:

- `dist/core/dist/index.mjs`
- `dist/core/dist/tally.mjs`
- `dist/core/dist/database.mjs`
- `dist/core/dist/logger.mjs`

#### 3. Test Core Modules

```bash
npm run test:core
```

#### 4. Check File Permissions

Ensure the application has read/write permissions to:

- Application directory
- User data directory
- Log files directory

### Issue: Module Loading Errors

**Symptoms:**

- Error messages mentioning "Cannot find module"
- Import/export errors
- ES module resolution issues

**Solutions:**

#### 1. Check TypeScript Configuration

Ensure `core/tsconfig.json` has correct settings:

```json
{
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "module": "NodeNext",
    "outDir": "./dist"
  }
}
```

#### 2. Verify Import Statements

Check that all imports in core modules use `.mjs` extension:

```typescript
import { logger } from "./logger.mjs";
import { database } from "./database.mjs";
```

#### 3. Check Package.json Dependencies

Ensure all required dependencies are listed in `package.json`:

- `mysql2`
- `pg`
- `tedious`
- `@google-cloud/bigquery`
- `ssh2`
- `ws`

### Issue: Database Connection Failures

**Symptoms:**

- Database connection test fails
- Sync fails with database-related errors

**Solutions:**

#### 1. Test Database Connection

- Use the "Test Database Connection" button in the UI
- Check if the database server is accessible
- Verify credentials are correct

#### 2. Check Network Connectivity

- Ensure the application can reach the database server
- Check firewall settings
- Verify port numbers are correct

#### 3. Database Server Issues

- Ensure the database server is running
- Check if the database exists
- Verify user permissions

### Issue: Tally Connection Failures

**Symptoms:**

- Tally connection test fails
- Sync fails with Tally-related errors

**Solutions:**

#### 1. Test Tally Connection

- Use the "Test Tally Connection" button in the UI
- Ensure Tally Prime is running
- Check if Tally is configured for remote access

#### 2. Tally Configuration

- Verify Tally server address and port
- Check if Tally is in multi-user mode
- Ensure the company is open in Tally

#### 3. Network Issues

- Check if the application can reach the Tally server
- Verify firewall settings
- Test with telnet: `telnet <tally-server> <port>`

## Advanced Debugging

### 1. Enable Verbose Logging

The application now includes enhanced logging. Check the logs for:

- Core path resolution
- Module loading attempts
- Process execution details
- Error stack traces

### 2. Check Process Output

The enhanced error handling now captures:

- STDOUT from the sync process
- STDERR from the sync process
- Process exit codes and signals

### 3. Manual Core Module Test

Run the test script to verify core modules:

```bash
node test-core-modules.js
```

### 4. Check Application Resources

In the packaged app, verify resources are accessible:

- Core modules in `resources/core/`
- Configuration files in `resources/`
- SQL scripts and reports

## Environment-Specific Issues

### Windows Issues

- **Antivirus Interference**: Temporarily disable antivirus during testing
- **User Account Control**: Run as administrator if needed
- **File Permissions**: Check folder permissions

### Network Issues

- **Corporate Firewalls**: Ensure required ports are open
- **Proxy Settings**: Configure proxy if needed
- **DNS Resolution**: Verify hostname resolution

### Database-Specific Issues

#### MySQL

- Check if MySQL server is running
- Verify user permissions
- Test connection with MySQL client

#### PostgreSQL

- Ensure PostgreSQL service is running
- Check pg_hba.conf for connection permissions
- Verify database exists

#### SQL Server

- Check SQL Server service status
- Verify SQL Server Browser service
- Test with SQL Server Management Studio

#### BigQuery

- Verify service account credentials
- Check project permissions
- Ensure dataset exists

## Getting Help

If you're still experiencing issues:

1. **Collect Information:**

   - Application version
   - Operating system
   - Database type and version
   - Tally Prime version
   - Error messages and logs

2. **Run Diagnostic Tests:**

   ```bash
   npm run test:core
   ```

3. **Check Logs:**

   - Application logs in the UI
   - Console output
   - Error log files

4. **Provide Details:**
   - Exact error messages
   - Steps to reproduce
   - Configuration details (without sensitive data)

## Prevention

To avoid sync issues:

1. **Regular Testing:**

   - Test database connections regularly
   - Verify Tally connectivity
   - Run test syncs periodically

2. **Configuration Management:**

   - Keep configurations backed up
   - Document configuration changes
   - Use consistent naming conventions

3. **Monitoring:**

   - Monitor sync logs regularly
   - Set up alerts for sync failures
   - Track sync performance metrics

4. **Updates:**
   - Keep the application updated
   - Update database drivers
   - Maintain Tally Prime updates
