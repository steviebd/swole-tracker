/**
 * Timestamp utilities for consistent D1/SQLite timestamp handling
 * 
 * Ensures all timestamps are handled consistently in UTC format
 * across the application, regardless of database backend.
 */

/**
 * Get current UTC timestamp in ISO format for database storage
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ (ISO 8601 with UTC timezone)
 */
export function getCurrentUTCTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get current UTC date in YYYY-MM-DD format for date queries
 */
export function getCurrentUTCDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

/**
 * Convert a Date object to UTC ISO string for database storage
 */
export function toUTCTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Convert a Date object to UTC date string for date-only queries
 */
export function toUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/**
 * Parse database timestamp string to Date object
 * Handles both ISO format and SQLite datetime format
 */
export function parseDBTimestamp(timestamp: string): Date {
  // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.exec(timestamp)) {
    // Add UTC timezone indicator for SQLite format
    return new Date(timestamp + 'Z');
  }
  
  // Handle ISO format
  return new Date(timestamp);
}

/**
 * Create application-level timestamp defaults for D1 compatibility
 * Use this instead of database-level defaults for consistent behavior
 */
export const TimestampDefaults = {
  createdAt: () => getCurrentUTCTimestamp(),
  updatedAt: () => getCurrentUTCTimestamp(),
  workoutDate: () => getCurrentUTCDate(),
} as const;

/**
 * Validate timestamp format for database storage
 */
export function validateTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch {
    return false;
  }
}

/**
 * Ensure timestamp is in correct UTC format for D1/SQLite
 */
export function normalizeTimestamp(timestamp: string | Date): string {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Parse and re-format to ensure consistency
  const date = parseDBTimestamp(timestamp);
  return date.toISOString();
}