/**
 * Convex constants for authenticated multi-user app
 */

// Rate limiting constants
export const RATE_LIMITS = {
  WORKOUT_OPERATIONS_PER_HOUR: 200,
  TEMPLATE_OPERATIONS_PER_HOUR: 100,
  API_CALLS_PER_MINUTE: 60,
} as const;