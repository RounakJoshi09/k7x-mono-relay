import fs from "fs";
import path from "path";
import zlib from "zlib";
import { logger } from "./logger.mjs";

interface LogRotationConfig {
  maxFileSize: number; // in bytes
  maxFiles: number;
  compressOldFiles: boolean;
  rotationInterval: number; // in milliseconds
}

interface LogAggregationConfig {
  consolidateDaily: boolean;
  separateByLevel: boolean;
  includeMergedView: boolean;
  autoCleanup: boolean;
  retentionDays: number;
}

class LocalLogAggregator {
  private config: LogRotationConfig & LogAggregationConfig;
  private rotationTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;

  constructor() {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      compressOldFiles: true,
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      consolidateDaily: true,
      separateByLevel: true,
      includeMergedView: true,
      autoCleanup: true,
      retentionDays: 30,
    };

    this.startRotationScheduler();
    this.startAggregationScheduler();
  }

  // Enhanced local file logging with rotation
  createRotatingFileLogger(
    logType: "error" | "debug" | "combined",
    logDir: string
  ): {
    write: (data: string) => void;
    rotate: () => void;
    getLogFiles: () => string[];
  } {
    const baseFileName = `${logType}.log`;
    const logPath = path.join(logDir, baseFileName);

    const write = (data: string) => {
      try {
        // Check if rotation is needed
        if (this.shouldRotateFile(logPath)) {
          this.rotateLogFile(logPath);
        }

        // Append to current log file
        fs.appendFileSync(logPath, data + "\n", "utf8");

        // Also write to a real-time debug file for immediate viewing
        if (logType === "error" || logType === "combined") {
          this.writeToRealtimeLog(data, logDir);
        }
      } catch (error) {
        console.error(`Failed to write to ${logType} log:`, error);
      }
    };

    const rotate = () => {
      this.rotateLogFile(logPath);
    };

    const getLogFiles = () => {
      return this.getRotatedLogFiles(logPath);
    };

    return { write, rotate, getLogFiles };
  }

  // Write to real-time debug log for immediate viewing
  private writeToRealtimeLog(data: string, logDir: string): void {
    const realtimeLogPath = path.join(logDir, "realtime-debug.log");
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${data}\n`;

    try {
      fs.appendFileSync(realtimeLogPath, entry, "utf8");

      // Keep realtime log under 1MB
      const stats = fs.statSync(realtimeLogPath);
      if (stats.size > 1024 * 1024) {
        const content = fs.readFileSync(realtimeLogPath, "utf8");
        const lines = content.split("\n");
        const keepLines = lines.slice(-1000); // Keep last 1000 lines
        fs.writeFileSync(realtimeLogPath, keepLines.join("\n"), "utf8");
      }
    } catch (error) {
      // Silently fail to avoid logging loops
    }
  }

  // Check if file should be rotated
  private shouldRotateFile(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      const stats = fs.statSync(filePath);
      return stats.size >= this.config.maxFileSize;
    } catch (error) {
      return false;
    }
  }

  // Rotate log file
  private rotateLogFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, ".log");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // Create rotated filename
      const rotatedFileName = `${baseName}-${timestamp}.log`;
      const rotatedPath = path.join(dir, rotatedFileName);

      // Move current file to rotated name
      fs.renameSync(filePath, rotatedPath);

      // Compress if configured
      if (this.config.compressOldFiles) {
        this.compressLogFile(rotatedPath);
      }

      // Clean up old files
      this.cleanupOldLogFiles(dir, baseName);

      logger.logInfo("LocalLogAggregator.rotateLogFile", "Log file rotated", {
        originalPath: filePath,
        rotatedPath,
        compressed: this.config.compressOldFiles,
      });
    } catch (error) {
      logger.logError("LocalLogAggregator.rotateLogFile", error, { filePath });
    }
  }

  // Compress log file
  private compressLogFile(filePath: string): void {
    try {
      const compressedPath = filePath + ".gz";
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(compressedPath);
      const gzip = zlib.createGzip();

      input.pipe(gzip).pipe(output);

      output.on("finish", () => {
        // Delete original file after compression
        fs.unlinkSync(filePath);
        logger.logDebug(
          "LocalLogAggregator.compressLogFile",
          "Log file compressed",
          {
            originalPath: filePath,
            compressedPath,
            originalSize: fs.statSync(compressedPath).size,
          }
        );
      });
    } catch (error) {
      logger.logError("LocalLogAggregator.compressLogFile", error, {
        filePath,
      });
    }
  }

  // Get list of rotated log files
  private getRotatedLogFiles(basePath: string): string[] {
    try {
      const dir = path.dirname(basePath);
      const baseName = path.basename(basePath, ".log");

      if (!fs.existsSync(dir)) {
        return [];
      }

      const files = fs.readdirSync(dir);
      return files
        .filter(
          (file) =>
            file.startsWith(baseName + "-") &&
            (file.endsWith(".log") || file.endsWith(".log.gz"))
        )
        .map((file) => path.join(dir, file))
        .sort();
    } catch (error) {
      logger.logError("LocalLogAggregator.getRotatedLogFiles", error, {
        basePath,
      });
      return [];
    }
  }

  // Clean up old log files
  private cleanupOldLogFiles(dir: string, baseName: string): void {
    try {
      const rotatedFiles = this.getRotatedLogFiles(
        path.join(dir, baseName + ".log")
      );

      if (rotatedFiles.length > this.config.maxFiles) {
        const filesToDelete = rotatedFiles.slice(
          0,
          rotatedFiles.length - this.config.maxFiles
        );

        filesToDelete.forEach((file) => {
          try {
            fs.unlinkSync(file);
            logger.logDebug(
              "LocalLogAggregator.cleanupOldLogFiles",
              "Old log file deleted",
              { file }
            );
          } catch (error) {
            logger.logWarning(
              "LocalLogAggregator.cleanupOldLogFiles",
              "Failed to delete old log file",
              { file, error }
            );
          }
        });
      }
    } catch (error) {
      logger.logError("LocalLogAggregator.cleanupOldLogFiles", error, {
        dir,
        baseName,
      });
    }
  }

  // Daily log aggregation
  aggregateDaily(): void {
    try {
      const today = new Date().toISOString().split("T")[0];
      const logsDir = path.join(process.cwd(), "logs", today);

      if (!fs.existsSync(logsDir)) {
        return;
      }

      logger.logInfo(
        "LocalLogAggregator.aggregateDaily",
        "Starting daily log aggregation",
        { date: today }
      );

      if (this.config.consolidateDaily) {
        this.createDailyConsolidatedLog(logsDir, today);
      }

      if (this.config.separateByLevel) {
        this.createLevelSeparatedLogs(logsDir, today);
      }

      if (this.config.includeMergedView) {
        this.createMergedTimelineLog(logsDir, today);
      }

      if (this.config.autoCleanup) {
        this.cleanupOldDailyLogs();
      }
    } catch (error) {
      logger.logError("LocalLogAggregator.aggregateDaily", error);
    }
  }

  // Create consolidated daily log
  private createDailyConsolidatedLog(logsDir: string, date: string): void {
    try {
      const consolidatedPath = path.join(logsDir, `consolidated-${date}.log`);
      const allEntries: any[] = [];

      // Read all log files for the day
      const files = fs
        .readdirSync(logsDir)
        .filter(
          (file) => file.endsWith(".log") && !file.startsWith("consolidated")
        );

      files.forEach((file) => {
        const filePath = path.join(logsDir, file);
        try {
          const content = fs.readFileSync(filePath, "utf8");
          const entries = this.parseLogEntries(content);
          allEntries.push(
            ...entries.map((entry) => ({ ...entry, sourceFile: file }))
          );
        } catch (error) {
          logger.logWarning(
            "LocalLogAggregator.createDailyConsolidatedLog",
            "Failed to read log file",
            { file, error }
          );
        }
      });

      // Sort by timestamp
      allEntries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Write consolidated log
      const consolidatedContent = allEntries
        .map((entry) => JSON.stringify(entry))
        .join("\n");
      fs.writeFileSync(consolidatedPath, consolidatedContent, "utf8");

      logger.logInfo(
        "LocalLogAggregator.createDailyConsolidatedLog",
        "Daily consolidated log created",
        {
          date,
          entriesCount: allEntries.length,
          filePath: consolidatedPath,
        }
      );
    } catch (error) {
      logger.logError("LocalLogAggregator.createDailyConsolidatedLog", error, {
        logsDir,
        date,
      });
    }
  }

  // Create level-separated logs
  private createLevelSeparatedLogs(logsDir: string, date: string): void {
    try {
      const levels = ["ERROR", "WARN", "INFO", "DEBUG"];
      const levelCounts: { [level: string]: number } = {};

      levels.forEach((level) => {
        const levelPath = path.join(
          logsDir,
          `${level.toLowerCase()}-only-${date}.log`
        );
        const levelEntries: any[] = [];

        // Read all log files and filter by level
        const files = fs
          .readdirSync(logsDir)
          .filter((file) => file.endsWith(".log") && !file.includes("-only-"));

        files.forEach((file) => {
          const filePath = path.join(logsDir, file);
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const entries = this.parseLogEntries(content);
            const filteredEntries = entries.filter(
              (entry) => entry.level === level
            );
            levelEntries.push(...filteredEntries);
          } catch (error) {
            // Skip problematic files
          }
        });

        if (levelEntries.length > 0) {
          // Sort by timestamp
          levelEntries.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Write level-specific log
          const levelContent = levelEntries
            .map((entry) => JSON.stringify(entry))
            .join("\n");
          fs.writeFileSync(levelPath, levelContent, "utf8");

          levelCounts[level] = levelEntries.length;
        }
      });

      logger.logInfo(
        "LocalLogAggregator.createLevelSeparatedLogs",
        "Level-separated logs created",
        {
          date,
          levelCounts,
        }
      );
    } catch (error) {
      logger.logError("LocalLogAggregator.createLevelSeparatedLogs", error, {
        logsDir,
        date,
      });
    }
  }

  // Create merged timeline log
  private createMergedTimelineLog(logsDir: string, date: string): void {
    try {
      const timelinePath = path.join(logsDir, `timeline-${date}.txt`);
      const allEntries: any[] = [];

      // Read all log files
      const files = fs
        .readdirSync(logsDir)
        .filter((file) => file.endsWith(".log") && !file.includes("timeline-"));

      files.forEach((file) => {
        const filePath = path.join(logsDir, file);
        try {
          const content = fs.readFileSync(filePath, "utf8");
          const entries = this.parseLogEntries(content);
          allEntries.push(...entries);
        } catch (error) {
          // Skip problematic files
        }
      });

      // Sort by timestamp
      allEntries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Create human-readable timeline
      const timelineContent = allEntries
        .map((entry) => {
          const timestamp = new Date(entry.timestamp).toLocaleString();
          const context = entry.context
            ? ` | Context: ${JSON.stringify(entry.context)}`
            : "";
          const error = entry.error ? ` | Error: ${entry.error.message}` : "";
          return `[${timestamp}] ${entry.level.padEnd(5)} | ${
            entry.functionName
          } | ${entry.message}${context}${error}`;
        })
        .join("\n");

      fs.writeFileSync(timelinePath, timelineContent, "utf8");

      logger.logInfo(
        "LocalLogAggregator.createMergedTimelineLog",
        "Timeline log created",
        {
          date,
          entriesCount: allEntries.length,
          filePath: timelinePath,
        }
      );
    } catch (error) {
      logger.logError("LocalLogAggregator.createMergedTimelineLog", error, {
        logsDir,
        date,
      });
    }
  }

  // Parse log entries from content
  private parseLogEntries(content: string): any[] {
    const entries: any[] = [];
    const lines = content.split("\n");
    let currentEntry = "";
    let inEntry = false;

    for (const line of lines) {
      if (line.trim() === "-".repeat(100)) {
        if (inEntry && currentEntry.trim()) {
          try {
            const parsed = JSON.parse(currentEntry.trim());
            entries.push(parsed);
          } catch (error) {
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

    // Handle last entry
    if (inEntry && currentEntry.trim()) {
      try {
        const parsed = JSON.parse(currentEntry.trim());
        entries.push(parsed);
      } catch (error) {
        // Skip malformed entries
      }
    }

    return entries;
  }

  // Clean up old daily logs
  private cleanupOldDailyLogs(): void {
    try {
      const logsBaseDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logsBaseDir)) {
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const directories = fs.readdirSync(logsBaseDir);
      let cleanedCount = 0;

      directories.forEach((dir) => {
        const dirPath = path.join(logsBaseDir, dir);
        const stat = fs.statSync(dirPath);

        if (stat.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dir)) {
          const dirDate = new Date(dir);
          if (dirDate < cutoffDate) {
            try {
              fs.rmSync(dirPath, { recursive: true });
              cleanedCount++;
              logger.logInfo(
                "LocalLogAggregator.cleanupOldDailyLogs",
                "Old log directory removed",
                { dir }
              );
            } catch (error) {
              logger.logWarning(
                "LocalLogAggregator.cleanupOldDailyLogs",
                "Failed to remove old log directory",
                { dir, error }
              );
            }
          }
        }
      });

      if (cleanedCount > 0) {
        logger.logInfo(
          "LocalLogAggregator.cleanupOldDailyLogs",
          "Cleanup completed",
          {
            cleanedDirectories: cleanedCount,
            retentionDays: this.config.retentionDays,
          }
        );
      }
    } catch (error) {
      logger.logError("LocalLogAggregator.cleanupOldDailyLogs", error);
    }
  }

  // Start rotation scheduler
  private startRotationScheduler(): void {
    this.rotationTimer = setInterval(() => {
      this.aggregateDaily();
    }, this.config.rotationInterval);
  }

  // Start aggregation scheduler
  private startAggregationScheduler(): void {
    // Run aggregation every hour
    this.aggregationTimer = setInterval(() => {
      this.aggregateDaily();
    }, 60 * 60 * 1000);
  }

  // Generate local debugging report
  generateLocalDebuggingReport(): string {
    try {
      const today = new Date().toISOString().split("T")[0];
      const logsDir = path.join(process.cwd(), "logs", today);

      let report = `Local Logging Debugging Report - ${today}\n`;
      report += "=".repeat(50) + "\n\n";

      // Log directory status
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        report += `Log Directory: ${logsDir}\n`;
        report += `Files Found: ${files.length}\n\n`;

        files.forEach((file) => {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);
          report += `${file}: ${Math.round(
            stats.size / 1024
          )} KB (${stats.mtime.toLocaleString()})\n`;
        });

        report += "\n";

        // Recent entries
        const allEntries: any[] = [];
        files
          .filter((file) => file.endsWith(".log"))
          .forEach((file) => {
            const filePath = path.join(logsDir, file);
            try {
              const content = fs.readFileSync(filePath, "utf8");
              const entries = this.parseLogEntries(content);
              allEntries.push(...entries);
            } catch (error) {
              // Skip problematic files
            }
          });

        if (allEntries.length > 0) {
          allEntries.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          report += `Recent Log Entries (Last 10):\n`;
          report += "-".repeat(30) + "\n";

          allEntries.slice(0, 10).forEach((entry) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            report += `[${timestamp}] ${entry.level} ${entry.functionName}: ${entry.message}\n`;
          });
        }
      } else {
        report += `Log Directory Not Found: ${logsDir}\n`;
      }

      return report;
    } catch (error: any) {
      return `Error generating debugging report: ${error?.message || error}`;
    }
  }

  // Stop all timers
  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
  }

  // Update configuration
  updateConfig(
    newConfig: Partial<LogRotationConfig & LogAggregationConfig>
  ): void {
    this.config = { ...this.config, ...newConfig };
    logger.logInfo("LocalLogAggregator.updateConfig", "Configuration updated", {
      newConfig,
    });
  }

  // Get current configuration
  getConfig(): LogRotationConfig & LogAggregationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
const localLogAggregator = new LocalLogAggregator();
export { localLogAggregator, LocalLogAggregator };
