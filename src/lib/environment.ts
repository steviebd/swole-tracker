/**
 * Centralized environment detection utility
 * Follows standard Node.js ecosystem conventions for NODE_ENV
 */

/**
 * Standard NODE_ENV values:
 * - 'development': Local development with debugging, verbose logging, dev tools
 * - 'production': Optimized builds, minimal logging, security hardening
 * - 'test': Test-specific behavior, mocked services, controlled environments
 */
export const NODE_ENV = process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined;

/**
 * Standard environment detection flags
 */
export const isDevelopment = NODE_ENV === 'development';
export const isProduction = NODE_ENV === 'production';
export const isTest = NODE_ENV === 'test';

/**
 * Common environment combinations
 */
export const isNotProduction = NODE_ENV !== 'production';
export const isDevelopmentOrTest = isDevelopment || isTest;

/**
 * Environment-specific feature flags following standard conventions
 */
export const environmentConfig = {
  // Logging configuration
  logging: {
    enableDebugLogs: isDevelopment,
    enableVerboseLogs: isDevelopment,
    enableConsoleOutput: isNotProduction,
    logLevel: isProduction ? 'warn' : 'debug',
  },
  
  // Database configuration
  database: {
    enableConnectionCaching: isNotProduction,
    enableQueryLogging: isDevelopment,
  },
  
  // Security configuration
  security: {
    enableSecureCookies: isProduction,
    enableCORS: isDevelopment,
  },
  
  // Development tools
  devTools: {
    enableHMR: isDevelopment,
    enableSourceMaps: isNotProduction,
    enableDebugMode: isDevelopment,
  },
  
  // Testing configuration
  testing: {
    suppressLogs: isTest,
    enableMocks: isTest,
    skipAuth: isTest,
  },
} as const;

/**
 * Utility functions for common environment checks
 */
export const env = {
  isDevelopment,
  isProduction,
  isTest,
  isNotProduction,
  isDevelopmentOrTest,
  
  // Helper methods
  requireProduction: () => {
    if (!isProduction) {
      throw new Error('This operation is only available in production environment');
    }
  },
  
  requireDevelopment: () => {
    if (!isDevelopment) {
      throw new Error('This operation is only available in development environment');
    }
  },
  
  // Environment-aware console logging
  devLog: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
  
  testLog: (...args: unknown[]) => {
    if (isTest && !environmentConfig.testing.suppressLogs) {
      console.log('[TEST]', ...args);
    }
  },
} as const;

/**
 * Type-safe environment getter with fallback
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  return NODE_ENV ?? 'development';
}

/**
 * Environment validation - ensures NODE_ENV is set to a valid value
 */
export function validateEnvironment(): void {
  const validEnvironments = ['development', 'production', 'test'];
  
  if (!NODE_ENV) {
    console.warn('NODE_ENV is not set, defaulting to development');
    return;
  }
  
  if (!validEnvironments.includes(NODE_ENV)) {
    throw new Error(
      `Invalid NODE_ENV: "${NODE_ENV}". Must be one of: ${validEnvironments.join(', ')}`
    );
  }
}
