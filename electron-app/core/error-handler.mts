import { logger } from "./logger.mjs";
import { logManager } from "./log-manager.mjs";

// Global unhandled error handlers
export function setupGlobalErrorHandlers(): void {
  process.on("uncaughtException", (error: Error) => {
    logger.logError("process.uncaughtException", error, {
      type: "UNCAUGHT_EXCEPTION",
      fatal: true,
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });

    // Ship critical error immediately
    logManager
      .shipErrorLog({
        level: "CRITICAL",
        type: "UNCAUGHT_EXCEPTION",
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
      .catch(console.error);

    // Give time for log shipping, then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.logError("process.unhandledRejection", reason, {
      type: "UNHANDLED_PROMISE_REJECTION",
      promise: promise?.toString?.() || "Unknown promise",
    });

    logManager
      .shipErrorLog({
        level: "ERROR",
        type: "UNHANDLED_PROMISE_REJECTION",
        message:
          reason?.message || reason?.toString?.() || "Unknown rejection reason",
        stack: reason?.stack,
        timestamp: new Date().toISOString(),
      })
      .catch(console.error);
  });

  // Handle Electron specific errors
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("error", (event) => {
      logger.logError("window.error", event.error, {
        type: "RENDERER_ERROR",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      logger.logError("window.unhandledrejection", event.reason, {
        type: "RENDERER_UNHANDLED_REJECTION",
      });
    });
  }
}

// Error context interface
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  parameters?: any;
  timestamp?: string;
  metadata?: any;
  duration?: string;
  errorOccurredAt?: string;
  attempts?: number;
  finalError?: string;
  [key: string]: any; // Allow additional properties
}

// Enhanced error class with context
export class EnhancedError extends Error {
  public context: ErrorContext;
  public originalError?: Error;
  public errorCode?: string;
  public severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  constructor(
    message: string,
    context?: ErrorContext,
    originalError?: Error,
    errorCode?: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM"
  ) {
    super(message);
    this.name = "EnhancedError";
    this.context = context || {};
    this.originalError = originalError;
    this.errorCode = errorCode;
    this.severity = severity;

    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

// Function wrapper for automatic error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  functionName: string,
  context?: Partial<ErrorContext>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const enhancedContext: ErrorContext = {
      operation: functionName,
      timestamp: new Date().toISOString(),
      parameters: args.length <= 3 ? args : `${args.length} parameters`,
      ...context,
    };

    try {
      logger.logDebug(functionName, "Function started", enhancedContext);

      const result = await fn(...args);

      const duration = Date.now() - startTime;
      logger.logDebug(functionName, `Function completed in ${duration}ms`);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const enhancedError = new EnhancedError(
        `Error in ${functionName}: ${error.message || error}`,
        {
          ...enhancedContext,
          duration: `${duration}ms`,
          errorOccurredAt: new Date().toISOString(),
        },
        error instanceof Error ? error : new Error(String(error))
      );

      logger.logError(functionName, enhancedError, enhancedContext);

      // Ship error immediately for high/critical severity
      if (
        enhancedError.severity === "HIGH" ||
        enhancedError.severity === "CRITICAL"
      ) {
        logManager
          .shipErrorLog(
            {
              level: enhancedError.severity,
              functionName,
              message: enhancedError.message,
              context: enhancedContext,
              originalError: error,
              timestamp: new Date().toISOString(),
            },
            context
          )
          .catch(console.error);
      }

      throw enhancedError;
    }
  };
}

// Decorator for class methods
export function errorHandler(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;
  const className = target.constructor.name;
  const functionName = `${className}.${propertyName}`;

  descriptor.value = withErrorHandling(method, functionName);
  return descriptor;
}

// Database operation error handling
export function withDatabaseErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  operation: string,
  tableName?: string
): (...args: T) => Promise<R> {
  return withErrorHandling(fn, `database.${operation}`, {
    operation: `DATABASE_${operation.toUpperCase()}`,
    metadata: { tableName },
  });
}

// Tally operation error handling
export function withTallyErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  operation: string,
  company?: string
): (...args: T) => Promise<R> {
  return withErrorHandling(fn, `tally.${operation}`, {
    operation: `TALLY_${operation.toUpperCase()}`,
    metadata: { company },
  });
}

// Network operation error handling
export function withNetworkErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  endpoint: string
): (...args: T) => Promise<R> {
  return withErrorHandling(fn, `network.request`, {
    operation: "NETWORK_REQUEST",
    metadata: { endpoint },
  });
}

// File operation error handling
export function withFileErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  filePath: string,
  operation: string
): (...args: T) => Promise<R> {
  return withErrorHandling(fn, `file.${operation}`, {
    operation: `FILE_${operation.toUpperCase()}`,
    metadata: { filePath },
  });
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  functionName: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.logInfo(
          functionName,
          `Retry attempt ${attempt}/${maxRetries}, waiting ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (error: any) {
      lastError = error;
      logger.logWarning(
        functionName,
        `Attempt ${attempt}/${maxRetries} failed`,
        {
          error: error.message,
          attempt,
          maxRetries,
        }
      );

      if (attempt === maxRetries) {
        throw new EnhancedError(
          `Failed after ${maxRetries} attempts: ${error.message}`,
          {
            operation: functionName,
            attempts: maxRetries,
            finalError: error.message,
          },
          error,
          "RETRY_EXHAUSTED",
          "HIGH"
        );
      }
    }
  }

  throw lastError!;
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  functionName: string,
  warningThresholdMs: number = 5000
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;

      if (duration > warningThresholdMs) {
        logger.logWarning(
          functionName,
          `Slow operation detected: ${duration.toFixed(2)}ms`,
          {
            duration: `${duration.toFixed(2)}ms`,
            threshold: `${warningThresholdMs}ms`,
            parameters: args.length <= 3 ? args : `${args.length} parameters`,
          }
        );
      } else {
        logger.logDebug(
          functionName,
          `Operation completed in ${duration.toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.logError(functionName, error, {
        duration: `${duration.toFixed(2)}ms`,
        failedAfter: `${duration.toFixed(2)}ms`,
      });
      throw error;
    }
  };
}

// Initialize error handling
export function initializeErrorHandling(): void {
  setupGlobalErrorHandlers();

  // Create default log configuration if it doesn't exist
  logManager.createDefaultLogConfig();

  logger.logInfo(
    "error-handler.initialize",
    "Enhanced error handling system initialized"
  );
}
