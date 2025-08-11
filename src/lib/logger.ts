/**
 * Environment-aware logging utility
 * Reduces verbosity in production while maintaining essential error tracking
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  endpoint?: string;
  workoutId?: string;
  [key: string]: unknown;
}

class Logger {
  private readonly isDevelopment: boolean =
    process.env.NODE_ENV === "development";
  private readonly isTest: boolean = process.env.NODE_ENV === "test";

  private shouldLog(level: LogLevel): boolean {
    // In tests, suppress all non-security logs
    if (this.isTest) {
      return false;
    }

    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === "warn" || level === "error";
    }

    // In development, log everything
    return true;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Remove sensitive data from logs
    delete sanitized.accessToken;
    delete sanitized.refreshToken;
    delete sanitized.password;
    delete sanitized.secret;

    // Truncate long strings in production
    if (!this.isDevelopment) {
      Object.keys(sanitized).forEach((key) => {
        const v = sanitized[key];
        if (typeof v === "string" && v.length > 100) {
          sanitized[key] = v.substring(0, 97) + "...";
        }
      });
    }

    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.log(`[DEBUG] ${message}`, sanitizedContext);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.log(`[INFO] ${message}`, sanitizedContext);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.warn(`[WARN] ${message}`, sanitizedContext);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    if (!this.shouldLog("error")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        error: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        ...sanitizedContext,
      });
    } else {
      console.error(`[ERROR] ${message}`, { error, ...sanitizedContext });
    }
  }

  // Webhook-specific logging
  webhook(message: string, payload?: unknown, context?: LogContext): void {
    if (!this.isDevelopment) {
      // In production, only log essential webhook info without full payload
      this.info(`Webhook: ${message}`, context);
    } else {
      const merged: LogContext = { ...context, payload };
      this.debug(`Webhook: ${message}`, merged);
    }
  }

  // API timing logging (development only)
  timing(endpoint: string, duration: number, context?: LogContext): void {
    if (!this.isDevelopment) return;

    this.debug(`${endpoint} took ${duration}ms`, context);
  }

  // Security event logging (always warn, including in tests)
  security(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    // Ensure console.warn exists (some test spies might unset)
    const warnFn = console.warn ?? console.log;
    warnFn(`[SECURITY] ${message}`, sanitizedContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for common patterns
export const logApiCall = (
  endpoint: string,
  userId: string,
  duration?: number,
) => {
  if (duration !== undefined) {
    logger.timing(endpoint, duration, { userId, endpoint });
  } else {
    logger.debug(`API call: ${endpoint}`, { userId, endpoint });
  }
};

export const logWebhook = (
  eventType: string,
  userId?: string,
  workoutId?: string,
) => {
  logger.webhook(`Processing ${eventType}`, undefined, {
    userId,
    workoutId,
    eventType,
  });
};

export const logSecurityEvent = (
  event: string,
  userId?: string,
  details?: Record<string, unknown>,
) => {
  logger.security(event, { userId, ...details });
};
