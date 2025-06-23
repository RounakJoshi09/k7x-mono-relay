import fs from "fs";
import path from "path";
import { logger } from "./logger.mjs";

interface LogEntry {
  timestamp: string;
  level: string;
  sessionId: string;
  functionName: string;
  message: string;
  error?: any;
  context?: any;
  systemInfo?: any;
  stackTrace?: string;
}

interface LogAnalytics {
  totalEntries: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  topErrors: Array<{ message: string; count: number; lastOccurrence: string }>;
  topFunctions: Array<{
    functionName: string;
    count: number;
    errorCount: number;
  }>;
  timeRange: { oldest: string; newest: string };
  fileSizes: { [key: string]: number };
}

class LocalLogViewer {
  private logsDirectory: string;

  constructor() {
    this.logsDirectory = path.join(process.cwd(), "logs");
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDirectory)) {
      fs.mkdirSync(this.logsDirectory, { recursive: true });
    }
  }

  // Get all available log dates
  getAvailableLogDates(): string[] {
    try {
      const entries = fs.readdirSync(this.logsDirectory);
      return entries
        .filter((entry) => {
          const fullPath = path.join(this.logsDirectory, entry);
          return (
            fs.statSync(fullPath).isDirectory() &&
            /^\d{4}-\d{2}-\d{2}$/.test(entry)
          );
        })
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      logger.logWarning(
        "LocalLogViewer.getAvailableLogDates",
        "Failed to read logs directory",
        { error }
      );
      return [];
    }
  }

  // Get log files for a specific date
  getLogFilesForDate(date: string): { [type: string]: string[] } {
    const dateDir = path.join(this.logsDirectory, date);
    const result: { [type: string]: string[] } = {
      import: [],
      error: [],
      debug: [],
    };

    try {
      if (!fs.existsSync(dateDir)) {
        return result;
      }

      const files = fs.readdirSync(dateDir);
      files.forEach((file) => {
        if (file.startsWith("import-") && file.endsWith(".log")) {
          result.import.push(path.join(dateDir, file));
        } else if (file.startsWith("error-") && file.endsWith(".log")) {
          result.error.push(path.join(dateDir, file));
        } else if (file.startsWith("debug-") && file.endsWith(".log")) {
          result.debug.push(path.join(dateDir, file));
        }
      });
    } catch (error) {
      logger.logWarning(
        "LocalLogViewer.getLogFilesForDate",
        "Failed to read date directory",
        { date, error }
      );
    }

    return result;
  }

  // Parse a log file and extract log entries
  parseLogFile(filePath: string): LogEntry[] {
    const entries: LogEntry[] = [];

    try {
      if (!fs.existsSync(filePath)) {
        return entries;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      let currentEntry = "";
      let inEntry = false;

      for (const line of lines) {
        if (line.trim() === "-".repeat(100)) {
          if (inEntry && currentEntry.trim()) {
            try {
              const parsed = JSON.parse(currentEntry.trim());
              entries.push(parsed);
            } catch (parseError) {
              // Skip malformed entries
            }
          }
          currentEntry = "";
          inEntry = false;
        } else if (line.trim().startsWith("{")) {
          inEntry = true;
          currentEntry = line;
        } else if (inEntry) {
          currentEntry += "\n" + line;
        }
      }

      // Handle last entry if file doesn't end with separator
      if (inEntry && currentEntry.trim()) {
        try {
          const parsed = JSON.parse(currentEntry.trim());
          entries.push(parsed);
        } catch (parseError) {
          // Skip malformed entries
        }
      }
    } catch (error) {
      logger.logError("LocalLogViewer.parseLogFile", error, { filePath });
    }

    return entries;
  }

  // Get all log entries for a specific date
  getAllEntriesForDate(date: string): LogEntry[] {
    const files = this.getLogFilesForDate(date);
    const allEntries: LogEntry[] = [];

    // Parse all file types
    Object.values(files).forEach((fileList) => {
      fileList.forEach((filePath) => {
        const entries = this.parseLogFile(filePath);
        allEntries.push(...entries);
      });
    });

    // Sort by timestamp
    allEntries.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return allEntries;
  }

  // Generate analytics for log entries
  generateAnalytics(entries: LogEntry[]): LogAnalytics {
    const analytics: LogAnalytics = {
      totalEntries: entries.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      topErrors: [],
      topFunctions: [],
      timeRange: { oldest: "", newest: "" },
      fileSizes: {},
    };

    if (entries.length === 0) {
      return analytics;
    }

    // Count by level
    const errorMessages: {
      [key: string]: { count: number; lastOccurrence: string };
    } = {};
    const functions: { [key: string]: { count: number; errorCount: number } } =
      {};

    entries.forEach((entry) => {
      switch (entry.level) {
        case "ERROR":
          analytics.errorCount++;
          if (entry.message) {
            if (!errorMessages[entry.message]) {
              errorMessages[entry.message] = {
                count: 0,
                lastOccurrence: entry.timestamp,
              };
            }
            errorMessages[entry.message].count++;
            if (entry.timestamp > errorMessages[entry.message].lastOccurrence) {
              errorMessages[entry.message].lastOccurrence = entry.timestamp;
            }
          }
          break;
        case "WARN":
          analytics.warningCount++;
          break;
        case "INFO":
          analytics.infoCount++;
          break;
        case "DEBUG":
          analytics.debugCount++;
          break;
      }

      if (entry.functionName) {
        if (!functions[entry.functionName]) {
          functions[entry.functionName] = { count: 0, errorCount: 0 };
        }
        functions[entry.functionName].count++;
        if (entry.level === "ERROR") {
          functions[entry.functionName].errorCount++;
        }
      }
    });

    // Sort top errors
    analytics.topErrors = Object.entries(errorMessages)
      .map(([message, data]) => ({
        message,
        count: data.count,
        lastOccurrence: data.lastOccurrence,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort top functions
    analytics.topFunctions = Object.entries(functions)
      .map(([functionName, data]) => ({
        functionName,
        count: data.count,
        errorCount: data.errorCount,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Time range
    analytics.timeRange.oldest = entries[0].timestamp;
    analytics.timeRange.newest = entries[entries.length - 1].timestamp;

    return analytics;
  }

  // Display analytics in a readable format
  displayAnalytics(date: string): void {
    const entries = this.getAllEntriesForDate(date);
    const analytics = this.generateAnalytics(entries);

    console.log(`\n📊 Log Analytics for ${date}`);
    console.log("=".repeat(50));
    console.log(`📈 Total Entries: ${analytics.totalEntries}`);
    console.log(`❌ Errors: ${analytics.errorCount}`);
    console.log(`⚠️  Warnings: ${analytics.warningCount}`);
    console.log(`ℹ️  Info: ${analytics.infoCount}`);
    console.log(`🐛 Debug: ${analytics.debugCount}`);

    if (analytics.timeRange.oldest && analytics.timeRange.newest) {
      console.log(
        `⏱️  Time Range: ${analytics.timeRange.oldest} to ${analytics.timeRange.newest}`
      );
    }

    if (analytics.topErrors.length > 0) {
      console.log(`\n🔥 Top Errors:`);
      analytics.topErrors.forEach((error, index) => {
        console.log(
          `   ${index + 1}. ${error.message} (${error.count} times, last: ${
            error.lastOccurrence
          })`
        );
      });
    }

    if (analytics.topFunctions.length > 0) {
      console.log(`\n📋 Top Functions:`);
      analytics.topFunctions.forEach((func, index) => {
        console.log(
          `   ${index + 1}. ${func.functionName} (${func.count} calls, ${
            func.errorCount
          } errors)`
        );
      });
    }

    console.log("=".repeat(50));
  }

  // Search log entries by criteria
  searchLogs(criteria: {
    date?: string;
    level?: string;
    functionName?: string;
    message?: string;
    limit?: number;
  }): LogEntry[] {
    const date = criteria.date || this.getAvailableLogDates()[0];
    if (!date) return [];

    let entries = this.getAllEntriesForDate(date);

    // Apply filters
    if (criteria.level) {
      entries = entries.filter((entry) => entry.level === criteria.level);
    }

    if (criteria.functionName) {
      entries = entries.filter(
        (entry) =>
          entry.functionName &&
          entry.functionName.includes(criteria.functionName!)
      );
    }

    if (criteria.message) {
      entries = entries.filter(
        (entry) =>
          entry.message &&
          entry.message.toLowerCase().includes(criteria.message!.toLowerCase())
      );
    }

    // Apply limit
    if (criteria.limit && criteria.limit > 0) {
      entries = entries.slice(-criteria.limit); // Get most recent
    }

    return entries;
  }

  // Display search results
  displaySearchResults(criteria: any, results: LogEntry[]): void {
    console.log(`\n🔍 Search Results`);
    console.log("=".repeat(50));
    console.log(`Criteria: ${JSON.stringify(criteria, null, 2)}`);
    console.log(`Found: ${results.length} entries`);
    console.log("-".repeat(50));

    results.forEach((entry, index) => {
      console.log(
        `\n${index + 1}. [${entry.timestamp}] ${entry.level} - ${
          entry.functionName
        }`
      );
      console.log(`   Message: ${entry.message}`);
      if (entry.context) {
        console.log(`   Context: ${JSON.stringify(entry.context, null, 2)}`);
      }
      if (entry.error && entry.error.code) {
        console.log(`   Error Code: ${entry.error.code}`);
      }
    });

    console.log("=".repeat(50));
  }

  // Export logs to different formats
  exportLogs(date: string, format: "json" | "csv" | "txt" = "json"): string {
    const entries = this.getAllEntriesForDate(date);
    const outputDir = path.join(this.logsDirectory, "exports");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let fileName: string;
    let content: string;

    switch (format) {
      case "json":
        fileName = `logs-${date}-${timestamp}.json`;
        content = JSON.stringify(entries, null, 2);
        break;

      case "csv":
        fileName = `logs-${date}-${timestamp}.csv`;
        const headers = "Timestamp,Level,Function,Message,Error Code,Context\n";
        const rows = entries
          .map((entry) => {
            const errorCode = entry.error?.code || "";
            const context = entry.context
              ? JSON.stringify(entry.context).replace(/"/g, '""')
              : "";
            const message = (entry.message || "").replace(/"/g, '""');
            return `"${entry.timestamp}","${entry.level}","${entry.functionName}","${message}","${errorCode}","${context}"`;
          })
          .join("\n");
        content = headers + rows;
        break;

      case "txt":
        fileName = `logs-${date}-${timestamp}.txt`;
        content = entries
          .map((entry) => {
            let text = `[${entry.timestamp}] ${entry.level} - ${entry.functionName}: ${entry.message}\n`;
            if (entry.context) {
              text += `  Context: ${JSON.stringify(entry.context)}\n`;
            }
            if (entry.error?.stack) {
              text += `  Stack: ${entry.error.stack}\n`;
            }
            text += "\n";
            return text;
          })
          .join("");
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, content, "utf-8");

    logger.logInfo("LocalLogViewer.exportLogs", "Logs exported successfully", {
      date,
      format,
      fileName,
      entryCount: entries.length,
      filePath,
    });

    return filePath;
  }

  // Monitor logs in real-time (tail-like functionality)
  monitorLogs(callback: (entry: LogEntry) => void): () => void {
    const today = new Date().toISOString().split("T")[0];
    const files = this.getLogFilesForDate(today);
    const watchedFiles: string[] = [];

    // Track file positions for tailing
    const filePositions: { [filePath: string]: number } = {};

    const watchFile = (filePath: string) => {
      if (!fs.existsSync(filePath)) return;

      // Initialize position at end of file
      const stats = fs.statSync(filePath);
      filePositions[filePath] = stats.size;

      fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
        if (curr.size > filePositions[filePath]) {
          // File has grown, read new content
          const stream = fs.createReadStream(filePath, {
            start: filePositions[filePath],
            encoding: "utf-8",
          });

          let buffer = "";
          stream.on("data", (chunk) => {
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            // Process complete lines
            let currentEntry = "";
            let inEntry = false;

            for (const line of lines) {
              if (line.trim() === "-".repeat(100)) {
                if (inEntry && currentEntry.trim()) {
                  try {
                    const parsed = JSON.parse(currentEntry.trim());
                    callback(parsed);
                  } catch (e) {
                    // Skip malformed entries
                  }
                }
                currentEntry = "";
                inEntry = false;
              } else if (line.trim().startsWith("{")) {
                inEntry = true;
                currentEntry = line;
              } else if (inEntry) {
                currentEntry += "\n" + line;
              }
            }
          });

          filePositions[filePath] = curr.size;
        }
      });

      watchedFiles.push(filePath);
    };

    // Watch all current log files
    Object.values(files).forEach((fileList) => {
      fileList.forEach(watchFile);
    });

    // Return cleanup function
    return () => {
      watchedFiles.forEach((filePath: string) => {
        try {
          fs.unwatchFile(filePath);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }

  // Get log file information
  getLogFileInfo(): any {
    const dates = this.getAvailableLogDates();
    const info: any = {
      totalDates: dates.length,
      dates: [],
      totalSize: 0,
    };

    dates.forEach((date) => {
      const files = this.getLogFilesForDate(date);
      const dateInfo: any = {
        date,
        files: {},
        totalSize: 0,
      };

      Object.entries(files).forEach(([type, fileList]) => {
        dateInfo.files[type] = fileList.map((filePath) => {
          const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
          const size = stats ? stats.size : 0;
          dateInfo.totalSize += size;
          return {
            path: filePath,
            size,
            modified: stats ? stats.mtime.toISOString() : null,
          };
        });
      });

      info.totalSize += dateInfo.totalSize;
      info.dates.push(dateInfo);
    });

    return info;
  }
}

// Export singleton instance
const localLogViewer = new LocalLogViewer();
export { localLogViewer, LocalLogViewer };
