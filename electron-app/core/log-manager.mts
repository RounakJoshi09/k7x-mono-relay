import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { logger } from "./logger.mjs";

interface LogShippingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  method: "webhook" | "email" | "file-upload" | "syslog";
  batchSize?: number;
  retryAttempts?: number;
  compressLogs?: boolean;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromEmail: string;
  toEmails: string[];
}

interface RemoteLogEntry {
  applicationName: string;
  version: string;
  instanceId: string;
  userId?: string;
  deviceInfo: any;
  logData: any;
  timestamp: string;
}

class LogManager {
  private config: LogShippingConfig;
  private emailConfig?: EmailConfig;
  private pendingLogs: RemoteLogEntry[] = [];
  private logBuffer: any[] = [];
  private readonly MAX_LOG_AGE_DAYS = 30;
  private readonly MAX_LOG_SIZE_MB = 100;

  constructor() {
    this.config = this.loadLogShippingConfig();
    this.setupPeriodicCleanup();
    this.setupPeriodicShipping();
  }

  private loadLogShippingConfig(): LogShippingConfig {
    try {
      const configPath = "./log-config.json";
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return {
          enabled: config.enabled || false,
          endpoint: config.endpoint,
          apiKey: config.apiKey,
          method: config.method || "webhook",
          batchSize: config.batchSize || 50,
          retryAttempts: config.retryAttempts || 3,
          compressLogs: config.compressLogs || true,
        };
      }
    } catch (err) {
      logger.logWarning(
        "LogManager.loadLogShippingConfig",
        "Failed to load log shipping config",
        { error: err }
      );
    }

    return {
      enabled: false,
      method: "webhook",
      batchSize: 50,
      retryAttempts: 3,
      compressLogs: true,
    };
  }

  // Create default log shipping configuration file
  createDefaultLogConfig(): void {
    const defaultConfig = {
      enabled: false,
      method: "webhook",
      endpoint: "https://your-log-server.com/api/logs",
      apiKey: "your-api-key-here",
      batchSize: 50,
      retryAttempts: 3,
      compressLogs: true,
      email: {
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        username: "your-email@gmail.com",
        password: "your-app-password",
        fromEmail: "your-email@gmail.com",
        toEmails: ["admin@yourcompany.com"],
      },
    };

    try {
      fs.writeFileSync(
        "./log-config.json",
        JSON.stringify(defaultConfig, null, 2)
      );
      logger.logInfo(
        "LogManager.createDefaultLogConfig",
        "Created default log configuration file"
      );
    } catch (err) {
      logger.logError("LogManager.createDefaultLogConfig", err);
    }
  }

  // Ship error logs to external service
  async shipErrorLog(logEntry: any, userContext?: any): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const remoteLogEntry: RemoteLogEntry = {
      applicationName: "Tally Database Loader",
      version: process.env.npm_package_version || "1.0.0",
      instanceId: await this.getInstanceId(),
      userId: userContext?.userId,
      deviceInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
      logData: logEntry,
      timestamp: new Date().toISOString(),
    };

    this.logBuffer.push(remoteLogEntry);

    // Ship immediately for errors, batch for others
    if (
      logEntry.level === "ERROR" ||
      this.logBuffer.length >= (this.config.batchSize || 50)
    ) {
      await this.flushLogBuffer();
    }
  }

  private async flushLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToShip = [...this.logBuffer];
    this.logBuffer = [];

    try {
      switch (this.config.method) {
        case "webhook":
          await this.shipViaWebhook(logsToShip);
          break;
        case "email":
          await this.shipViaEmail(logsToShip);
          break;
        case "file-upload":
          await this.shipViaFileUpload(logsToShip);
          break;
        case "syslog":
          await this.shipViaSyslog(logsToShip);
          break;
      }

      logger.logDebug(
        "LogManager.flushLogBuffer",
        `Successfully shipped ${logsToShip.length} log entries`
      );
    } catch (err) {
      logger.logWarning("LogManager.flushLogBuffer", "Failed to ship logs", {
        error: err,
        logCount: logsToShip.length,
      });

      // Add failed logs back to buffer for retry (up to retry limit)
      this.logBuffer.unshift(...logsToShip);
      if (this.logBuffer.length > 1000) {
        // Prevent memory issues
        this.logBuffer = this.logBuffer.slice(0, 1000);
      }
    }
  }

  private async shipViaWebhook(logs: RemoteLogEntry[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error("Webhook endpoint not configured");
    }

    const payload = JSON.stringify({
      logs: logs,
      metadata: {
        shipped_at: new Date().toISOString(),
        source: "tally-database-loader",
      },
    });

    return new Promise((resolve, reject) => {
      const url = new URL(this.config.endpoint!);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "TallyDatabaseLoader/1.0",
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
      };

      const client = url.protocol === "https:" ? https : http;
      const req = client.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  private async shipViaEmail(logs: RemoteLogEntry[]): Promise<void> {
    // Note: For production use, you'd want to use a proper email library like nodemailer
    // This is a basic implementation
    logger.logInfo(
      "LogManager.shipViaEmail",
      "Email shipping not fully implemented - would send logs via email"
    );

    // Create a summary for email
    const errorLogs = logs.filter((log) => log.logData.level === "ERROR");
    if (errorLogs.length > 0) {
      const summary = {
        errorCount: errorLogs.length,
        totalLogs: logs.length,
        timestamp: new Date().toISOString(),
        recentErrors: errorLogs.slice(0, 5).map((log) => ({
          function: log.logData.functionName,
          message: log.logData.message,
          timestamp: log.logData.timestamp,
        })),
      };

      logger.logDebug(
        "LogManager.shipViaEmail",
        "Email summary prepared",
        summary
      );
    }
  }

  private async shipViaFileUpload(logs: RemoteLogEntry[]): Promise<void> {
    // Create a temporary log file and upload it
    const tempFile = path.join(
      process.cwd(),
      "logs",
      `upload-${Date.now()}.json`
    );

    try {
      fs.writeFileSync(tempFile, JSON.stringify(logs, null, 2));

      // Here you would implement file upload to your server
      logger.logInfo(
        "LogManager.shipViaFileUpload",
        "File upload shipping not fully implemented"
      );

      // Cleanup
      fs.unlinkSync(tempFile);
    } catch (err) {
      logger.logError("LogManager.shipViaFileUpload", err);
    }
  }

  private async shipViaSyslog(logs: RemoteLogEntry[]): Promise<void> {
    // Implement syslog shipping
    logger.logInfo(
      "LogManager.shipViaSyslog",
      "Syslog shipping not fully implemented"
    );
  }

  private async getInstanceId(): Promise<string> {
    // Generate or retrieve a unique instance ID for this installation
    const instanceFile = path.join(process.cwd(), ".instance-id");

    try {
      if (fs.existsSync(instanceFile)) {
        return fs.readFileSync(instanceFile, "utf8").trim();
      } else {
        const instanceId = `tally-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        fs.writeFileSync(instanceFile, instanceId);
        return instanceId;
      }
    } catch (err) {
      return `temp-${Date.now()}`;
    }
  }

  // Cleanup old log files
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  private setupPeriodicShipping(): void {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogBuffer();
      }
    }, 5 * 60 * 1000); // Ship every 5 minutes
  }

  private cleanupOldLogs(): void {
    try {
      const logsDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logsDir)) {
        return;
      }

      const now = Date.now();
      const maxAge = this.MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

      fs.readdirSync(logsDir).forEach((dir) => {
        const dirPath = path.join(logsDir, dir);
        const stat = fs.statSync(dirPath);

        if (stat.isDirectory() && now - stat.mtime.getTime() > maxAge) {
          fs.rmSync(dirPath, { recursive: true });
          logger.logInfo(
            "LogManager.cleanupOldLogs",
            `Removed old log directory: ${dir}`
          );
        }
      });
    } catch (err) {
      logger.logWarning(
        "LogManager.cleanupOldLogs",
        "Failed to cleanup old logs",
        { error: err }
      );
    }
  }

  // Get log analytics for monitoring
  getLogAnalytics(): any {
    try {
      const logPaths = logger.getLogFilePaths();
      const stats = {
        errorLogSize: 0,
        messageLogSize: 0,
        debugLogSize: 0,
        totalErrors: 0,
        lastErrorTime: null,
      };

      // Get file sizes
      if (fs.existsSync(logPaths.error)) {
        stats.errorLogSize = fs.statSync(logPaths.error).size;
      }
      if (fs.existsSync(logPaths.message)) {
        stats.messageLogSize = fs.statSync(logPaths.message).size;
      }
      if (fs.existsSync(logPaths.debug)) {
        stats.debugLogSize = fs.statSync(logPaths.debug).size;
      }

      return stats;
    } catch (err) {
      logger.logError("LogManager.getLogAnalytics", err);
      return null;
    }
  }

  // Manual log shipping trigger
  async shipLogsNow(): Promise<void> {
    await this.flushLogBuffer();
  }

  // Get current configuration
  getConfig(): LogShippingConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<LogShippingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    try {
      const configPath = "./log-config.json";
      let existingConfig = {};

      if (fs.existsSync(configPath)) {
        existingConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      const updatedConfig = { ...existingConfig, ...newConfig };
      fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

      logger.logInfo("LogManager.updateConfig", "Log configuration updated");
    } catch (err) {
      logger.logError("LogManager.updateConfig", err);
    }
  }
}

// Export singleton instance
const logManager = new LogManager();
export { logManager, LogManager };
