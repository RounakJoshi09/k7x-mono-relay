# Enhanced Logging and Error Handling Guide

## Overview

This guide explains the comprehensive logging and error handling system implemented in the Tally Database Loader application. The new system provides detailed error logging, external log shipping capabilities, and better monitoring for distributed applications.

## What's Changed

### Before (Issues)

- ❌ Only basic error messages logged
- ❌ Single error flag prevented multiple error logging
- ❌ No context or system information
- ❌ No stack traces
- ❌ Logs only stored locally in `error-log.txt`
- ❌ No way to monitor distributed applications

### After (Enhanced)

- ✅ Detailed error information with full context
- ✅ Multiple errors can be logged
- ✅ System information and stack traces included
- ✅ Structured logging with JSON format
- ✅ Organized log files with timestamps
- ✅ External log shipping capabilities
- ✅ Remote monitoring and alerting support

## New Logging System Features

### 1. Enhanced Logger (`core/logger.mts`)

The new logger provides multiple log levels and rich context:

```typescript
// Info logging with context
logger.logInfo('function.name', 'Operation started', { userId: 'user123', operation: 'sync' });

// Warning logging
logger.logWarning('function.name', 'Connection slow', { responseTime: '5000ms' });

// Error logging with context
logger.logError('function.name', error, {
  operation: 'database.connect',
  connectionString: 'mysql://...',
  retryAttempt: 3
});

// Debug logging (only written to debug log)
logger.logDebug('function.name', 'Debug information', { debugData: {...} });
```

### 2. Log Organization

Logs are now organized in timestamped directories:

```
logs/
├── 2024-01-15/
│   ├── import-142330-abc123.log     # General application logs
│   ├── error-142330-abc123.log      # Error logs only
│   └── debug-142330-abc123.log      # Debug logs
├── 2024-01-16/
│   └── ...
└── ...
```

### 3. Error Context and Details

Each error log includes:

```json
{
  "timestamp": "2024-01-15 14:23:30.123",
  "level": "ERROR",
  "sessionId": "1705317810123-abc123def",
  "functionName": "database.bulkLoad",
  "message": "Connection timeout",
  "error": {
    "type": "Error",
    "message": "Connection timeout",
    "code": "ETIMEDOUT",
    "errno": -110,
    "stack": "Error: Connection timeout\n    at ..."
  },
  "context": {
    "tableName": "ledger_entries",
    "recordCount": 15420,
    "operation": "DATABASE_BULK_LOAD"
  },
  "systemInfo": {
    "platform": "win32",
    "arch": "x64",
    "nodeVersion": "v18.17.0",
    "memory": {
      "total": 8589934592,
      "free": 4294967296,
      "used": 45234176
    }
  },
  "stackTrace": "Error: Connection timeout\n    at Database.connect ..."
}
```

## External Log Management Options

### 1. Webhook Integration

Ship logs to external services like Slack, Discord, or custom endpoints:

```json
{
  "enabled": true,
  "method": "webhook",
  "endpoint": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "apiKey": "your-api-key"
}
```

Example Slack webhook payload:

```json
{
  "text": "🚨 Critical Error in Tally Database Loader",
  "attachments": [
    {
      "color": "danger",
      "fields": [
        {
          "title": "Function",
          "value": "database.bulkLoad",
          "short": true
        },
        {
          "title": "Error",
          "value": "Connection timeout",
          "short": true
        },
        {
          "title": "User",
          "value": "CompanyABC",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "2024-01-15 14:23:30",
          "short": true
        }
      ]
    }
  ]
}
```

### 2. Email Notifications

Get email alerts for critical errors:

```json
{
  "method": "email",
  "email": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "fromEmail": "your-email@gmail.com",
    "toEmails": ["admin@yourcompany.com", "support@yourcompany.com"]
  }
}
```

### 3. Cloud Logging Services

#### AWS CloudWatch

```json
{
  "cloudServices": {
    "awsCloudWatch": {
      "region": "us-east-1",
      "logGroupName": "/tally-database-loader/errors",
      "accessKeyId": "your-aws-access-key",
      "secretAccessKey": "your-aws-secret-key"
    }
  }
}
```

#### Azure Application Insights

```json
{
  "cloudServices": {
    "azureApplicationInsights": {
      "instrumentationKey": "your-app-insights-key"
    }
  }
}
```

#### Google Cloud Logging

```json
{
  "cloudServices": {
    "googleCloudLogging": {
      "projectId": "your-gcp-project-id",
      "keyFilename": "path/to/service-account.json"
    }
  }
}
```

### 4. File Upload to Your Server

Upload log files to your own server:

```json
{
  "method": "file-upload",
  "fileUpload": {
    "endpoint": "https://your-server.com/upload",
    "method": "POST",
    "authHeader": "Bearer your-upload-token"
  }
}
```

### 5. Syslog Integration

Send logs to centralized syslog servers:

```json
{
  "method": "syslog",
  "syslog": {
    "host": "logs.yourcompany.com",
    "port": 514,
    "protocol": "udp",
    "facility": "local0"
  }
}
```

## Configuration

### Setting Up External Logging

1. **Edit Configuration File** (`log-config.json`):

   ```json
   {
     "enabled": true,
     "method": "webhook",
     "endpoint": "https://your-endpoint.com/logs",
     "apiKey": "your-api-key",
     "batchSize": 50,
     "retryAttempts": 3
   }
   ```

2. **Configure Filters** (optional):

   ```json
   {
     "filters": {
       "minimumLevel": "WARN",
       "excludePatterns": [
         "Connection timeout",
         "Network temporarily unavailable"
       ],
       "excludeFunctions": ["debug.*", "test.*"]
     }
   }
   ```

3. **Set Up Privacy Controls**:
   ```json
   {
     "privacy": {
       "excludeUserData": true,
       "hashSensitiveData": true,
       "excludeFields": ["password", "token", "apiKey"]
     }
   }
   ```

### Log Retention Settings

```json
{
  "retention": {
    "localLogDays": 30,
    "remoteLogDays": 90,
    "maxLogSizeMB": 100
  }
}
```

## Using Enhanced Error Handling in Code

### 1. Basic Error Logging with Context

```typescript
import { logger } from './core/logger.mjs';

try {
  // Your operation
  await someOperation();
} catch (error) {
  logger.logError('YourClass.methodName', error, {
    operation: 'SPECIFIC_OPERATION',
    userId: currentUser.id,
    additionalContext: {...}
  });
  throw error; // Re-throw if needed
}
```

### 2. Using Error Handling Wrappers

```typescript
import {
  withErrorHandling,
  withDatabaseErrorHandling,
} from "./core/error-handler.mjs";

// Wrap any function with automatic error handling
const safeFunction = withErrorHandling(async (param1, param2) => {
  // Your logic here
  return result;
}, "YourClass.methodName");

// Database-specific error handling
const safeDatabaseOperation = withDatabaseErrorHandling(
  async (tableName, data) => {
    // Database operation
    return result;
  },
  "bulkInsert",
  "table_name"
);
```

### 3. Retry with Exponential Backoff

```typescript
import { withRetry } from "./core/error-handler.mjs";

const result = await withRetry(
  () => unreliableOperation(),
  "operation.name",
  3, // max retries
  1000 // base delay in ms
);
```

### 4. Performance Monitoring

```typescript
import { withPerformanceMonitoring } from "./core/error-handler.mjs";

const monitoredFunction = withPerformanceMonitoring(
  async () => {
    // Your operation
  },
  "operation.name",
  5000 // warning threshold in ms
);
```

## Monitoring Distributed Applications

### 1. Instance Identification

Each application instance gets a unique ID stored in `.instance-id` file:

- Format: `tally-{timestamp}-{random}`
- Persists across application restarts
- Helps track which instance reported errors

### 2. Session Tracking

Each application session gets a unique session ID:

- Generated on startup
- Included in all log entries
- Helps correlate related errors

### 3. Real-time Monitoring

Set up webhooks for real-time error notifications:

```bash
# Example: Setting up a simple webhook receiver
curl -X POST https://your-endpoint.com/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "logs": [...],
    "metadata": {
      "shipped_at": "2024-01-15T14:23:30.123Z",
      "source": "tally-database-loader"
    }
  }'
```

### 4. Log Analytics

Query shipped logs for insights:

```sql
-- Example: Find most common errors
SELECT
  error_message,
  COUNT(*) as error_count,
  MAX(timestamp) as last_occurrence
FROM error_logs
WHERE timestamp > NOW() - INTERVAL 7 DAY
GROUP BY error_message
ORDER BY error_count DESC;

-- Example: Find problematic instances
SELECT
  instance_id,
  COUNT(*) as error_count,
  COUNT(DISTINCT session_id) as session_count
FROM error_logs
WHERE timestamp > NOW() - INTERVAL 1 DAY
GROUP BY instance_id
ORDER BY error_count DESC;
```

## Best Practices

### 1. Error Context

Always provide relevant context when logging errors:

```typescript
logger.logError('function.name', error, {
  operation: 'SPECIFIC_OPERATION',
  userId: user?.id,
  resourceId: resource.id,
  parameters: { param1, param2 },
  systemState: {...}
});
```

### 2. Log Levels

Use appropriate log levels:

- `ERROR`: Unexpected errors that affect functionality
- `WARN`: Issues that might cause problems
- `INFO`: General information about application flow
- `DEBUG`: Detailed information for debugging

### 3. Privacy

Be careful not to log sensitive information:

```typescript
// ❌ Don't do this
logger.logError("auth.login", error, { password: userPassword });

// ✅ Do this instead
logger.logError("auth.login", error, {
  username: username,
  passwordLength: userPassword.length,
  hasSpecialChars: /[!@#$%^&*]/.test(userPassword),
});
```

### 4. Performance

Use debug logging for detailed information:

```typescript
// Only written to debug log, not shipped externally by default
logger.logDebug("function.name", "Detailed debug info", largeDataObject);
```

## Troubleshooting

### Common Issues

1. **Logs not shipping externally**

   - Check `log-config.json` has `"enabled": true`
   - Verify endpoint URL and API key
   - Check network connectivity

2. **Too many logs being generated**

   - Adjust filters in configuration
   - Increase `minimumLevel` to reduce log volume
   - Use `excludePatterns` to filter out noise

3. **Missing context in errors**

   - Update existing catch blocks to include context
   - Use error handling wrappers for automatic context

4. **Performance impact**
   - External shipping is asynchronous and batched
   - Local logging is optimized for performance
   - Adjust `batchSize` if needed

### Log File Locations

- **Local logs**: `./logs/{date}/`
- **Configuration**: `./log-config.json`
- **Instance ID**: `./.instance-id`

## Migration from Old System

To migrate from the old logging system:

1. **Update catch blocks** to use new logger methods
2. **Add context** to error logging calls
3. **Configure external shipping** in `log-config.json`
4. **Test error handling** with the new system
5. **Monitor log volume** and adjust filters as needed

The old `error-log.txt` and `import-log.txt` files will be automatically cleaned up by the new system.

## Support

For questions or issues with the enhanced logging system:

1. Check the debug logs for detailed information
2. Verify configuration in `log-config.json`
3. Test with a simple webhook endpoint first
4. Monitor log shipping in the debug logs

The enhanced logging system provides comprehensive error tracking and external monitoring capabilities, making it much easier to support distributed applications and quickly identify issues in production environments.
