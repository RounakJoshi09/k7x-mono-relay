import fs from "fs";
import util from "util";
import process from "process";
import path from "path";
import os from "os";
import { utility } from "./utility.mjs";

interface LogLevel {
  ERROR: string;
  WARN: string;
  INFO: string;
  DEBUG: string;
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  appVersion: string;
  userAgent?: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

interface LogEntry {
  timestamp: string;
  level: string;
  sessionId: string;
  functionName: string;
  message: string;
  error?: any;
  context?: any;
  systemInfo?: SystemInfo;
  stackTrace?: string;
}

class _logger {
  private streamMessage: fs.WriteStream;
  private streamError: fs.WriteStream;
  private streamDebug: fs.WriteStream;
  private sessionId: string;
  private logDir: string;
  private systemInfo: SystemInfo;

  private readonly LOG_LEVELS: LogLevel = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
  };

  constructor() {
    // Generate unique session ID
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create logs directory with timestamp
    const timestamp = utility.Date.format(new Date(), "yyyy-MM-dd");
    this.logDir = path.join(".", "logs", timestamp);

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Remove old log files from current directory (backward compatibility)
    this.cleanupOldLogs();

    // Initialize streams with timestamped filenames
    const timePrefix = utility.Date.format(new Date(), "HHmmss");
    this.streamMessage = fs.createWriteStream(
      path.join(
        this.logDir,
        `import-${timePrefix}-${this.sessionId.substr(-6)}.log`
      ),
      { encoding: "utf-8" }
    );
    this.streamError = fs.createWriteStream(
      path.join(
        this.logDir,
        `error-${timePrefix}-${this.sessionId.substr(-6)}.log`
      ),
      { encoding: "utf-8" }
    );
    this.streamDebug = fs.createWriteStream(
      path.join(
        this.logDir,
        `debug-${timePrefix}-${this.sessionId.substr(-6)}.log`
      ),
      { encoding: "utf-8" }
    );

    // Collect system information
    this.systemInfo = this.collectSystemInfo();

    // Log session start
    this.logSystemInfo();

    // Setup cleanup on process exit
    process.on("exit", () => this.closeStreams());
    process.on("SIGINT", () => this.closeStreams());
    process.on("SIGTERM", () => this.closeStreams());
  }

  private cleanupOldLogs(): void {
    try {
      // Remove old files from current directory
      ["./import-log.txt", "./error-log.txt"].forEach((file) => {
        if (fs.existsSync(file)) {
          fs.rmSync(file);
        }
      });
    } catch (err) {
      console.warn("Could not cleanup old log files:", err);
    }
  }

  private collectSystemInfo(): SystemInfo {
    const memoryUsage = process.memoryUsage();
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      appVersion: process.env.npm_package_version || "1.0.0",
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: memoryUsage.heapUsed,
      },
    };
  }

  private logSystemInfo(): void {
    const systemLog: LogEntry = {
      timestamp: utility.Date.format(new Date(), "yyyy-MM-dd HH:mm:ss.fff"),
      level: this.LOG_LEVELS.INFO,
      sessionId: this.sessionId,
      functionName: "system.startup",
      message: "Application started",
      systemInfo: this.systemInfo,
    };

    this.writeToStream(this.streamMessage, systemLog);
    this.writeToStream(this.streamDebug, systemLog);
  }

  private writeToStream(stream: fs.WriteStream, logEntry: LogEntry): void {
    try {
      const logLine =
        JSON.stringify(logEntry, null, 2) + "\n" + "-".repeat(100) + "\n";
      stream.write(logLine);
    } catch (err) {
      console.error("Failed to write to log stream:", err);
    }
  }

  private formatSimpleLog(
    level: string,
    functionName: string,
    message: string,
    ...params: any[]
  ): string {
    const timestamp = utility.Date.format(
      new Date(),
      "yyyy-MM-dd HH:mm:ss.fff"
    );
    const formattedMessage = util.format(message, ...params);
    return `[${timestamp}] [${level}] [${this.sessionId.substr(
      -6
    )}] ${functionName}: ${formattedMessage}`;
  }

  logMessage(message: string, ...params: any[]): void {
    const formattedMessage = this.formatSimpleLog(
      this.LOG_LEVELS.INFO,
      "general",
      message,
      ...params
    );

    console.log(formattedMessage); // graphical console
    this.streamMessage.write(formattedMessage + "\r\n");

    if (process.send) {
      // GUI thread based invoke
      process.send(formattedMessage + "\r\n");
    }
  }

  logInfo(functionName: string, message: string, context?: any): void {
    const logEntry: LogEntry = {
      timestamp: utility.Date.format(new Date(), "yyyy-MM-dd HH:mm:ss.fff"),
      level: this.LOG_LEVELS.INFO,
      sessionId: this.sessionId,
      functionName,
      message,
      context,
    };

    const simpleLog = this.formatSimpleLog(
      this.LOG_LEVELS.INFO,
      functionName,
      message
    );
    console.log(simpleLog);

    this.writeToStream(this.streamMessage, logEntry);
    this.writeToStream(this.streamDebug, logEntry);

    if (process.send) {
      process.send(simpleLog + "\r\n");
    }
  }

  logWarning(functionName: string, message: string, context?: any): void {
    const logEntry: LogEntry = {
      timestamp: utility.Date.format(new Date(), "yyyy-MM-dd HH:mm:ss.fff"),
      level: this.LOG_LEVELS.WARN,
      sessionId: this.sessionId,
      functionName,
      message,
      context,
    };

    const simpleLog = this.formatSimpleLog(
      this.LOG_LEVELS.WARN,
      functionName,
      message
    );
    console.warn(simpleLog);

    this.writeToStream(this.streamMessage, logEntry);
    this.writeToStream(this.streamError, logEntry);
    this.writeToStream(this.streamDebug, logEntry);

    if (process.send) {
      process.send(simpleLog + "\r\n");
    }
  }

  logError(fnInfo: string, err: any, context?: any): void {
    const logEntry: LogEntry = {
      timestamp: utility.Date.format(new Date(), "yyyy-MM-dd HH:mm:ss.fff"),
      level: this.LOG_LEVELS.ERROR,
      sessionId: this.sessionId,
      functionName: fnInfo.endsWith(")") ? fnInfo : fnInfo + "()",
      message: this.extractErrorMessage(err),
      error: this.serializeError(err),
      context,
      systemInfo: this.collectSystemInfo(),
      stackTrace: this.extractStackTrace(err),
    };

    // Enhanced console error output
    const errorDetails = this.formatErrorForConsole(logEntry);
    console.error(errorDetails);

    // Write to all relevant streams
    this.writeToStream(this.streamError, logEntry);
    this.writeToStream(this.streamDebug, logEntry);

    if (process.send) {
      process.send(`ERROR: ${logEntry.functionName}: ${logEntry.message}\r\n`);
    }
  }

  logDebug(functionName: string, message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: utility.Date.format(new Date(), "yyyy-MM-dd HH:mm:ss.fff"),
      level: this.LOG_LEVELS.DEBUG,
      sessionId: this.sessionId,
      functionName,
      message,
      context: data,
    };

    this.writeToStream(this.streamDebug, logEntry);
  }

  private extractErrorMessage(err: any): string {
    if (typeof err === "string") {
      return err;
    }
    if (err && err.message) {
      return err.message;
    }
    if (err && err.toString) {
      return err.toString();
    }
    return "Unknown error occurred";
  }

  private serializeError(err: any): any {
    if (typeof err === "string") {
      return { message: err, type: "string" };
    }

    if (!err) {
      return { message: "Null or undefined error", type: "null" };
    }

    const serialized: any = {
      type: err.constructor?.name || "Unknown",
      message: err.message || "",
      name: err.name || "",
    };

    // Capture all enumerable properties
    Object.getOwnPropertyNames(err).forEach((key) => {
      try {
        const value = err[key];
        if (value !== undefined) {
          serialized[key] = typeof value === "function" ? "[Function]" : value;
        }
      } catch (e) {
        serialized[key] = "[Error accessing property]";
      }
    });

    // Special handling for common error types
    if (err.code) serialized.code = err.code;
    if (err.errno) serialized.errno = err.errno;
    if (err.syscall) serialized.syscall = err.syscall;
    if (err.hostname) serialized.hostname = err.hostname;
    if (err.port) serialized.port = err.port;
    if (err.address) serialized.address = err.address;

    return serialized;
  }

  private extractStackTrace(err: any): string | undefined {
    if (err && err.stack) {
      return err.stack;
    }

    // Try to get current stack trace if error doesn't have one
    const stack = new Error().stack;
    if (stack) {
      // Remove the first few lines which are from this logging function
      const lines = stack.split("\n");
      return lines.slice(3).join("\n");
    }

    return undefined;
  }

  private formatErrorForConsole(logEntry: LogEntry): string {
    let output = `\n${"=".repeat(80)}\n`;
    output += `ERROR OCCURRED: ${logEntry.timestamp}\n`;
    output += `Session ID: ${logEntry.sessionId}\n`;
    output += `Function: ${logEntry.functionName}\n`;
    output += `Message: ${logEntry.message}\n`;

    if (logEntry.error) {
      output += `Error Type: ${logEntry.error.type || "Unknown"}\n`;
      if (logEntry.error.code) output += `Error Code: ${logEntry.error.code}\n`;
      if (logEntry.error.errno)
        output += `System Error: ${logEntry.error.errno}\n`;
    }

    if (logEntry.context) {
      output += `Context: ${JSON.stringify(logEntry.context, null, 2)}\n`;
    }

    if (logEntry.stackTrace) {
      output += `Stack Trace:\n${logEntry.stackTrace}\n`;
    }

    output += `${"=".repeat(80)}\n`;
    return output;
  }

  // Method to get current log file paths (useful for external log management)
  getLogFilePaths(): {
    message: string;
    error: string;
    debug: string;
    directory: string;
  } {
    return {
      message: this.streamMessage.path as string,
      error: this.streamError.path as string,
      debug: this.streamDebug.path as string,
      directory: this.logDir,
    };
  }

  closeStreams(): void {
    try {
      this.streamMessage.close();
      this.streamError.close();
      this.streamDebug.close();
    } catch (err) {
      console.error("Error closing log streams:", err);
    }
  }
}

let logger = new _logger();

export { logger };
