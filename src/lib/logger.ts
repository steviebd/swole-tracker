/**
 * Environment-aware logging utility that sends events to PostHog
 * Reduces verbosity in production while maintaining essential error tracking
 */

import { analytics } from "./analytics";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  endpoint?: string;
  workoutId?: string;
  [key: string]: unknown;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly isTest: boolean;

  constructor(env?: string) {
    const nodeEnv = env ?? process.env.NODE_ENV;
    this.isDevelopment = nodeEnv === "development";
    this.isTest = nodeEnv === "test";
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment && !this.isTest) {
      return level === "warn" || level === "error";
    }

    // In development and tests, log everything
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

  private sendToPosthog(
    eventName: string,
    properties: Record<string, unknown>,
  ): void {
    // Fire-and-forget async operation to avoid blocking
    void (async () => {
      try {
        // Use server PostHog for server-side logging, client analytics for client-side
        if (typeof window === "undefined") {
          // Server-side - dynamically import to avoid bundling in client
          const { getServerPosthog } = await import("./posthog");
          const serverPosthog = getServerPosthog();
          serverPosthog.capture(eventName, properties);
        } else {
          // Client-side
          analytics.event(eventName, properties);
        }
      } catch (error) {
        // Fallback to console if PostHog fails
        console.error("[LOGGER] Failed to send to PostHog:", error);
      }
    })();
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    this.sendToPosthog("log.debug", {
      message,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console logging in development for debugging
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, sanitizedContext);
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    this.sendToPosthog("log.info", {
      message,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console logging in development for debugging
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, sanitizedContext);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    this.sendToPosthog("log.warn", {
      message,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console logging in development for debugging
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, sanitizedContext);
    }
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    if (!this.shouldLog("error")) return;

    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    let errorDetails: Record<string, unknown> = {};
    if (error instanceof Error) {
      errorDetails = {
        error: error.message,
        stack: this.isDevelopment || this.isTest ? error.stack : undefined,
      };
    } else {
      errorDetails = { error };
    }

    this.sendToPosthog("log.error", {
      message,
      ...errorDetails,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console logging in development for debugging
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, {
        ...errorDetails,
        ...sanitizedContext,
      });
    }
  }

  // Webhook-specific logging
  webhook(message: string, payload?: unknown, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    if (!this.isDevelopment) {
      // In production, only log essential webhook info without full payload
      this.sendToPosthog("webhook.processed", {
        message,
        ...sanitizedContext,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.sendToPosthog("webhook.debug", {
        message,
        payload,
        ...sanitizedContext,
        timestamp: new Date().toISOString(),
      });
      console.log(`[WEBHOOK] ${message}`, { ...sanitizedContext, payload });
    }
  }

  // API timing logging
  timing(endpoint: string, duration: number, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    this.sendToPosthog("api.timing", {
      endpoint,
      duration,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console logging in development for debugging
    if (this.isDevelopment) {
      console.log(`[TIMING] ${endpoint} took ${duration}ms`, sanitizedContext);
    }
  }

  // Security event logging (always logged, including in tests)
  security(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    this.sendToPosthog("security.event", {
      message,
      ...sanitizedContext,
      timestamp: new Date().toISOString(),
    });

    // Keep console warning for security events
    const warnFn = console.warn ?? console.log;
    warnFn(`[SECURITY] ${message}`, sanitizedContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for testing
export { Logger };

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
