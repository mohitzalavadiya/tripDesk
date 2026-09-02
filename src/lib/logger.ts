/**
 * TripDesk Production Logging & Telemetry Utility
 * 
 * Provides structured JSON/plain logging with automatic redaction of sensitive credentials,
 * API keys, passwords, and tokens. Safe for production environments and centralized log ingest.
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

interface LogContext {
  userId?: string;
  agencyId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  path?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /servicerolekey/i,
  /apitoken/i,
  /apikey/i,
  /cookie/i,
  /credential/i,
  /connectionstring/i,
  /database_url/i,
  /direct_url/i,
  /private_key/i,
];

/**
 * Recursively sanitizes objects and primitives to prevent leaking secrets in logs.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6) return "[Max Depth Exceeded]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Check if string contains standard jwt or long bearer tokens
    if (data.startsWith("eyJ") && data.length > 30) {
      return `${data.substring(0, 8)}...[REDACTED_JWT]`;
    }
    // Check if string contains postgres connection url with password
    if (data.includes("postgres://") || data.includes("postgresql://")) {
      return data.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:[REDACTED]@");
    }
    return data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV === "production" ? undefined : data.stack,
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return String(data);
}

class ProductionLogger {
  private isProduction = process.env.NODE_ENV === "production";

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? (sanitizeLogData(context) as LogContext) : undefined;
    const sanitizedError = error ? sanitizeLogData(error) : undefined;

    if (this.isProduction) {
      // Structured JSON format for CloudWatch, Datadog, Grafana Loki, or Vercel log drain
      const logEntry = {
        timestamp,
        level,
        message,
        ...(sanitizedContext ? { context: sanitizedContext } : {}),
        ...(sanitizedError ? { error: sanitizedError } : {}),
      };

      const serialized = JSON.stringify(logEntry);
      switch (level) {
        case "error":
          console.error(serialized);
          break;
        case "warn":
          console.warn(serialized);
          break;
        case "debug":
          // Avoid debug noise in production unless enabled
          if (process.env.DEBUG) console.debug(serialized);
          break;
        default:
          console.log(serialized);
          break;
      }
    } else {
      // Human-readable format for local development
      const prefix = {
        debug: "\x1b[34m[DEBUG]\x1b[0m",
        info: "\x1b[32m[INFO]\x1b[0m",
        warn: "\x1b[33m[WARN]\x1b[0m",
        error: "\x1b[31m[ERROR]\x1b[0m",
        audit: "\x1b[35m[AUDIT]\x1b[0m",
      }[level];

      const parts = [`${prefix} ${message}`];
      if (sanitizedContext) parts.push(JSON.stringify(sanitizedContext, null, 2));
      if (sanitizedError) parts.push(JSON.stringify(sanitizedError, null, 2));

      switch (level) {
        case "error":
          console.error(...parts);
          break;
        case "warn":
          console.warn(...parts);
          break;
        case "debug":
          console.debug(...parts);
          break;
        default:
          console.log(...parts);
          break;
      }
    }
  }

  public debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  public info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  public warn(message: string, context?: LogContext, error?: unknown) {
    this.log("warn", message, context, error);
  }

  public error(message: string, error?: unknown, context?: LogContext) {
    this.log("error", message, context, error);
  }

  public audit(action: string, context: LogContext) {
    this.log("audit", `Audit Event: ${action}`, { action, ...context });
  }
}

export const logger = new ProductionLogger();
