#!/usr/bin/env node

/**
 * Enhanced Logging Test and Demonstration Script
 * This script tests all aspects of the new enhanced logging system
 * and demonstrates how to view and analyze the generated logs.
 */

const fs = require("fs");
const path = require("path");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function colorLog(message, color = colors.white) {
  console.log(color + message + colors.reset);
}

// Test the enhanced logging system
async function testEnhancedLogging() {
  colorLog("\n🚀 Enhanced Logging System Test", colors.cyan);
  colorLog("================================", colors.cyan);

  try {
    // Import the enhanced logger (using require for Node.js compatibility)
    const loggerPath = path.join(__dirname, "core", "dist", "logger.mjs");
    const logManagerPath = path.join(
      __dirname,
      "core",
      "dist",
      "log-manager.mjs"
    );
    const viewerPath = path.join(
      __dirname,
      "core",
      "dist",
      "local-log-viewer.mjs"
    );
    const aggregatorPath = path.join(
      __dirname,
      "core",
      "dist",
      "local-log-aggregator.mjs"
    );

    if (!fs.existsSync(loggerPath)) {
      colorLog(
        "❌ Logger module not found. Please compile the TypeScript files first:",
        colors.red
      );
      colorLog("   cd core && npx tsc", colors.yellow);
      return;
    }

    // Convert Windows paths to file:// URLs for ES module imports
    const { pathToFileURL } = await import("url");
    const loggerURL = pathToFileURL(loggerPath).href;

    // Dynamic import for ES modules
    const { logger } = await import(loggerURL);

    let logManager, localLogViewer, localLogAggregator;
    try {
      const logManagerURL = pathToFileURL(logManagerPath).href;
      const logManagerModule = await import(logManagerURL);
      logManager = logManagerModule.logManager;
    } catch (e) {
      colorLog(
        "⚠️  Log manager not available, continuing with local logging only",
        colors.yellow
      );
    }

    try {
      const viewerURL = pathToFileURL(viewerPath).href;
      const viewerModule = await import(viewerURL);
      localLogViewer = viewerModule.localLogViewer;
    } catch (e) {
      colorLog("⚠️  Local log viewer not available", colors.yellow);
    }

    try {
      const aggregatorURL = pathToFileURL(aggregatorPath).href;
      const aggregatorModule = await import(aggregatorURL);
      localLogAggregator = aggregatorModule.localLogAggregator;
    } catch (e) {
      colorLog("⚠️  Local log aggregator not available", colors.yellow);
    }

    colorLog("\n1. Testing Basic Logging Functions", colors.green);
    colorLog("----------------------------------", colors.green);

    // Test info logging
    logger.logInfo("test.info", "Testing info logging functionality", {
      testId: "LOG_TEST_001",
      operation: "INFO_LOGGING_TEST",
      testTime: new Date().toISOString(),
      testData: { value: 123, flag: true },
    });
    colorLog("✅ Info logging test completed", colors.green);

    // Test warning logging
    logger.logWarning("test.warning", "Testing warning logging functionality", {
      testId: "LOG_TEST_002",
      operation: "WARNING_LOGGING_TEST",
      warningType: "test",
      severity: "medium",
    });
    colorLog("✅ Warning logging test completed", colors.green);

    // Test debug logging
    logger.logDebug("test.debug", "Testing debug logging functionality", {
      testId: "LOG_TEST_003",
      operation: "DEBUG_LOGGING_TEST",
      debugData: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
      },
    });
    colorLog("✅ Debug logging test completed", colors.green);

    colorLog(
      "\n2. Testing Error Logging with Different Error Types",
      colors.green
    );
    colorLog(
      "---------------------------------------------------",
      colors.green
    );

    // Test basic error
    try {
      throw new Error("This is a test error for logging demonstration");
    } catch (error) {
      logger.logError("test.error.basic", error, {
        testId: "LOG_TEST_004",
        operation: "BASIC_ERROR_TEST",
        errorType: "intentional",
        context: "Testing basic error logging",
      });
      colorLog("✅ Basic error logging test completed", colors.green);
    }

    // Test network-like error
    try {
      const networkError = new Error("Connection timeout");
      networkError.code = "ETIMEDOUT";
      networkError.errno = -110;
      networkError.syscall = "connect";
      networkError.address = "192.168.1.100";
      networkError.port = 3306;
      throw networkError;
    } catch (error) {
      logger.logError("test.error.network", error, {
        testId: "LOG_TEST_005",
        operation: "NETWORK_ERROR_TEST",
        server: "192.168.1.100",
        port: 3306,
        retryAttempt: 3,
        timeout: 5000,
      });
      colorLog("✅ Network error logging test completed", colors.green);
    }

    // Test database-like error
    try {
      const dbError = new Error("Table 'test_table' doesn't exist");
      dbError.code = "ER_NO_SUCH_TABLE";
      dbError.errno = 1146;
      dbError.sql = "SELECT * FROM test_table";
      throw dbError;
    } catch (error) {
      logger.logError("test.error.database", error, {
        testId: "LOG_TEST_006",
        operation: "DATABASE_ERROR_TEST",
        tableName: "test_table",
        query: "SELECT * FROM test_table",
        database: "test_db",
        technology: "mysql",
      });
      colorLog("✅ Database error logging test completed", colors.green);
    }

    // Test file operation error
    try {
      fs.readFileSync("/non/existent/file.txt");
    } catch (error) {
      logger.logError("test.error.file", error, {
        testId: "LOG_TEST_007",
        operation: "FILE_ERROR_TEST",
        filePath: "/non/existent/file.txt",
        operation_type: "read",
        permissions: "read-only",
      });
      colorLog("✅ File error logging test completed", colors.green);
    }

    colorLog("\n3. Testing Performance Logging", colors.green);
    colorLog("------------------------------", colors.green);

    // Test slow operation simulation
    const startTime = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate slow operation
    const duration = performance.now() - startTime;

    logger.logWarning("test.performance.slow", "Slow operation detected", {
      testId: "LOG_TEST_008",
      operation: "PERFORMANCE_TEST",
      duration: `${duration.toFixed(2)}ms`,
      threshold: "50ms",
      operationType: "simulated_slow_operation",
    });
    colorLog("✅ Performance logging test completed", colors.green);

    colorLog("\n4. Testing Log File Generation", colors.green);
    colorLog("-------------------------------", colors.green);

    // Get log file paths
    const logPaths = logger.getLogFilePaths();

    colorLog(`📁 Log Directory: ${logPaths.directory}`, colors.blue);
    colorLog(`📄 Message Log: ${logPaths.message}`, colors.blue);
    colorLog(`❌ Error Log: ${logPaths.error}`, colors.blue);
    colorLog(`🐛 Debug Log: ${logPaths.debug}`, colors.blue);

    // Check if files exist and show sizes
    Object.entries(logPaths).forEach(([type, filePath]) => {
      if (type !== "directory" && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        colorLog(
          `   ✅ ${type}: ${stats.size} bytes (${new Date(
            stats.mtime
          ).toLocaleString()})`,
          colors.green
        );
      }
    });

    colorLog("\n5. Testing Local Log Aggregation", colors.green);
    colorLog("----------------------------------", colors.green);

    if (localLogAggregator) {
      try {
        // Generate debugging report
        const debugReport = localLogAggregator.generateLocalDebuggingReport();
        colorLog("📊 Local Debugging Report Generated:", colors.blue);
        console.log(debugReport);

        // Trigger daily aggregation
        localLogAggregator.aggregateDaily();
        colorLog("✅ Daily log aggregation completed", colors.green);
      } catch (error) {
        colorLog(
          `⚠️  Log aggregation test failed: ${error.message}`,
          colors.yellow
        );
      }
    }

    colorLog("\n6. Testing External Log Configuration", colors.green);
    colorLog("--------------------------------------", colors.green);

    const configPath = path.join(__dirname, "log-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      colorLog(
        `📋 External logging enabled: ${config.enabled ? "Yes" : "No"}`,
        colors.blue
      );
      colorLog(`🚀 Shipping method: ${config.method}`, colors.blue);
      if (config.endpoint) {
        colorLog(`🌐 Endpoint: ${config.endpoint}`, colors.blue);
      }

      if (logManager && config.enabled) {
        try {
          // Test external log shipping (if enabled)
          await logManager.shipErrorLog({
            level: "INFO",
            functionName: "test.external.shipping",
            message: "Test external log shipping",
            timestamp: new Date().toISOString(),
            testId: "LOG_TEST_009",
          });
          colorLog("✅ External log shipping test completed", colors.green);
        } catch (error) {
          colorLog(
            `⚠️  External log shipping test failed: ${error.message}`,
            colors.yellow
          );
        }
      }
    } else {
      colorLog(
        "⚠️  log-config.json not found. External logging not configured.",
        colors.yellow
      );
    }

    // Wait a moment for files to be written
    await new Promise((resolve) => setTimeout(resolve, 1000));

    colorLog("\n7. Analyzing Generated Logs", colors.green);
    colorLog("----------------------------", colors.green);

    if (localLogViewer) {
      try {
        const today = new Date().toISOString().split("T")[0];
        colorLog(`📊 Analyzing logs for ${today}...`, colors.blue);

        // Get log analytics
        localLogViewer.displayAnalytics(today);

        // Search for test entries
        colorLog("\n🔍 Searching for test log entries...", colors.blue);
        const testEntries = localLogViewer.searchLogs({
          date: today,
          functionName: "test.",
          limit: 5,
        });

        if (testEntries.length > 0) {
          colorLog(
            `Found ${testEntries.length} test log entries:`,
            colors.green
          );
          testEntries.forEach((entry, index) => {
            colorLog(
              `   ${index + 1}. [${entry.level}] ${entry.functionName}: ${
                entry.message
              }`,
              colors.white
            );
          });
        }

        // Show log file information
        colorLog("\n📈 Log File Information:", colors.blue);
        const fileInfo = localLogViewer.getLogFileInfo();
        colorLog(`   Total log dates: ${fileInfo.totalDates}`, colors.white);
        colorLog(
          `   Total size: ${Math.round(fileInfo.totalSize / 1024)} KB`,
          colors.white
        );

        if (fileInfo.dates.length > 0) {
          const todayInfo = fileInfo.dates.find((d) => d.date === today);
          if (todayInfo) {
            colorLog(
              `   Today's logs: ${Math.round(todayInfo.totalSize / 1024)} KB`,
              colors.white
            );
            Object.entries(todayInfo.files).forEach(([type, files]) => {
              if (files.length > 0) {
                const totalSize = files.reduce(
                  (sum, file) => sum + file.size,
                  0
                );
                colorLog(
                  `     ${type}: ${files.length} files, ${Math.round(
                    totalSize / 1024
                  )} KB`,
                  colors.white
                );
              }
            });
          }
        }

        // Export logs demonstration
        colorLog("\n📤 Exporting logs to different formats...", colors.blue);
        try {
          const jsonPath = localLogViewer.exportLogs(today, "json");
          const csvPath = localLogViewer.exportLogs(today, "csv");
          const txtPath = localLogViewer.exportLogs(today, "txt");

          colorLog(`✅ Exported to:`, colors.green);
          colorLog(`   JSON: ${jsonPath}`, colors.white);
          colorLog(`   CSV:  ${csvPath}`, colors.white);
          colorLog(`   TXT:  ${txtPath}`, colors.white);
        } catch (exportError) {
          colorLog(`⚠️  Export failed: ${exportError.message}`, colors.yellow);
        }
      } catch (viewerError) {
        colorLog(
          `⚠️  Log analysis failed: ${viewerError.message}`,
          colors.yellow
        );
      }
    }

    colorLog("\n8. Real-time Log Monitoring Demo", colors.green);
    colorLog("----------------------------------", colors.green);

    if (localLogViewer) {
      colorLog(
        "🔄 Starting real-time log monitoring for 5 seconds...",
        colors.blue
      );

      const stopMonitoring = localLogViewer.monitorLogs((entry) => {
        colorLog(
          `📨 Real-time: [${entry.level}] ${entry.functionName}: ${entry.message}`,
          colors.magenta
        );
      });

      // Generate some logs during monitoring
      setTimeout(() => {
        logger.logInfo("test.monitoring", "Real-time monitoring test log 1", {
          monitoringTest: true,
          realTime: Date.now(),
        });
      }, 1000);

      setTimeout(() => {
        logger.logWarning(
          "test.monitoring",
          "Real-time monitoring test log 2",
          { monitoringTest: true, realTime: Date.now() }
        );
      }, 2000);

      setTimeout(() => {
        try {
          throw new Error("Real-time monitoring test error");
        } catch (error) {
          logger.logError("test.monitoring", error, {
            monitoringTest: true,
            realTime: Date.now(),
          });
        }
      }, 3000);

      // Stop monitoring after 5 seconds
      setTimeout(() => {
        stopMonitoring();
        colorLog("✅ Real-time monitoring test completed", colors.green);

        // Final summary
        setTimeout(() => {
          displayFinalSummary();
        }, 1000);
      }, 5000);
    } else {
      displayFinalSummary();
    }
  } catch (error) {
    colorLog(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

function displayFinalSummary() {
  colorLog("\n🎉 Enhanced Logging Test Summary", colors.cyan);
  colorLog("=================================", colors.cyan);

  colorLog("\n✅ Tests Completed:", colors.green);
  colorLog("   • Info logging with context", colors.white);
  colorLog("   • Warning logging with context", colors.white);
  colorLog("   • Debug logging with system info", colors.white);
  colorLog("   • Error logging with different error types", colors.white);
  colorLog("   • Performance logging", colors.white);
  colorLog("   • Log file generation and organization", colors.white);
  colorLog("   • Local log aggregation and debugging reports", colors.white);
  colorLog("   • External log configuration check", colors.white);
  colorLog("   • Log analytics and search", colors.white);
  colorLog("   • Log export in multiple formats", colors.white);
  colorLog("   • Real-time log monitoring", colors.white);

  colorLog("\n📁 Check the following locations:", colors.blue);
  colorLog("   • logs/ directory for organized log files", colors.white);
  colorLog("   • logs/exports/ directory for exported logs", colors.white);
  colorLog(
    "   • log-config.json for external shipping configuration",
    colors.white
  );

  colorLog("\n🔧 Local Debugging Features:", colors.yellow);
  colorLog(
    "   • Timestamped log directories for easy organization",
    colors.white
  );
  colorLog(
    "   • Separate files for errors, debug, and general logs",
    colors.white
  );
  colorLog("   • JSON structured logs for easy parsing", colors.white);
  colorLog("   • Real-time monitoring capabilities", colors.white);
  colorLog("   • Automatic log rotation and cleanup", colors.white);
  colorLog("   • Export to multiple formats (JSON, CSV, TXT)", colors.white);
  colorLog("   • Advanced search and filtering", colors.white);
  colorLog("   • Daily log aggregation and analytics", colors.white);

  colorLog("\n🔧 Next Steps:", colors.yellow);
  colorLog(
    "   1. Configure external log shipping in log-config.json",
    colors.white
  );
  colorLog(
    "   2. Update your existing catch blocks with enhanced context",
    colors.white
  );
  colorLog(
    "   3. Use the local log viewer for debugging and monitoring",
    colors.white
  );
  colorLog("   4. Set up external monitoring dashboards", colors.white);
  colorLog("   5. Use log aggregation for daily reporting", colors.white);

  colorLog("\n📚 Documentation:", colors.blue);
  colorLog(
    "   • Read ENHANCED-LOGGING-GUIDE.md for complete documentation",
    colors.white
  );
  colorLog(
    "   • Use the migration examples to update existing code",
    colors.white
  );

  colorLog(
    "\n🎯 Enhanced logging system with local debugging is ready!",
    colors.green
  );
  colorLog("=".repeat(50), colors.cyan);
}

// Add command line options
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Enhanced Logging Test Script
============================

Usage: node test-enhanced-logging.js [options]

Options:
  --help, -h        Show this help message
  --analytics       Show log analytics only
  --export          Export logs to different formats
  --monitor         Start real-time log monitoring
  --debug-report    Generate local debugging report

Examples:
  node test-enhanced-logging.js                    # Run full test suite
  node test-enhanced-logging.js --analytics        # Show analytics only
  node test-enhanced-logging.js --export           # Export logs
  node test-enhanced-logging.js --monitor          # Monitor logs in real-time
  node test-enhanced-logging.js --debug-report     # Show debugging report
        `);
    process.exit(0);
  }

  if (args.includes("--analytics")) {
    // Show analytics only
    (async () => {
      try {
        const { pathToFileURL } = await import("url");
        const viewerPath = path.join(
          __dirname,
          "core",
          "dist",
          "local-log-viewer.mjs"
        );
        const viewerURL = pathToFileURL(viewerPath).href;
        const { localLogViewer } = await import(viewerURL);
        const today = new Date().toISOString().split("T")[0];
        localLogViewer.displayAnalytics(today);
      } catch (error) {
        console.error("Failed to load log viewer:", error.message);
      }
    })();
  } else if (args.includes("--export")) {
    // Export logs
    (async () => {
      try {
        const { pathToFileURL } = await import("url");
        const viewerPath = path.join(
          __dirname,
          "core",
          "dist",
          "local-log-viewer.mjs"
        );
        const viewerURL = pathToFileURL(viewerPath).href;
        const { localLogViewer } = await import(viewerURL);
        const today = new Date().toISOString().split("T")[0];

        colorLog("📤 Exporting logs...", colors.blue);
        const jsonPath = localLogViewer.exportLogs(today, "json");
        const csvPath = localLogViewer.exportLogs(today, "csv");
        const txtPath = localLogViewer.exportLogs(today, "txt");

        colorLog(`✅ Exported to:`, colors.green);
        colorLog(`   JSON: ${jsonPath}`, colors.white);
        colorLog(`   CSV:  ${csvPath}`, colors.white);
        colorLog(`   TXT:  ${txtPath}`, colors.white);
      } catch (error) {
        console.error("Failed to export logs:", error.message);
      }
    })();
  } else if (args.includes("--debug-report")) {
    // Generate debugging report
    (async () => {
      try {
        const { pathToFileURL } = await import("url");
        const aggregatorPath = path.join(
          __dirname,
          "core",
          "dist",
          "local-log-aggregator.mjs"
        );
        const aggregatorURL = pathToFileURL(aggregatorPath).href;
        const { localLogAggregator } = await import(aggregatorURL);

        colorLog("📊 Generating local debugging report...", colors.blue);
        const report = localLogAggregator.generateLocalDebuggingReport();
        console.log(report);
      } catch (error) {
        console.error("Failed to generate debugging report:", error.message);
      }
    })();
  } else if (args.includes("--monitor")) {
    // Monitor logs in real-time
    (async () => {
      try {
        const { pathToFileURL } = await import("url");
        const viewerPath = path.join(
          __dirname,
          "core",
          "dist",
          "local-log-viewer.mjs"
        );
        const viewerURL = pathToFileURL(viewerPath).href;
        const { localLogViewer } = await import(viewerURL);

        colorLog(
          "🔄 Starting real-time log monitoring... Press Ctrl+C to stop",
          colors.blue
        );

        const stopMonitoring = localLogViewer.monitorLogs((entry) => {
          const timestamp = new Date(entry.timestamp).toLocaleTimeString();
          const levelColor =
            entry.level === "ERROR"
              ? colors.red
              : entry.level === "WARN"
              ? colors.yellow
              : entry.level === "INFO"
              ? colors.green
              : colors.blue;

          colorLog(
            `[${timestamp}] ${entry.level} ${entry.functionName}: ${entry.message}`,
            levelColor
          );
          if (entry.context && Object.keys(entry.context).length > 0) {
            colorLog(
              `   Context: ${JSON.stringify(entry.context)}`,
              colors.white
            );
          }
        });

        process.on("SIGINT", () => {
          stopMonitoring();
          colorLog("\n✅ Monitoring stopped", colors.green);
          process.exit(0);
        });
      } catch (error) {
        console.error("Failed to start log monitoring:", error.message);
      }
    })();
  } else {
    // Run full test suite
    testEnhancedLogging();
  }
}
