/**
 * D1 Execution Limits Safeguards
 * 
 * Provides safeguards and error handling specifically for Cloudflare D1 limitations:
 * - 10ms CPU time limit per query
 * - Connection pooling limits
 * - Query result size limits
 * - Parameter count limits
 */

import { logger } from "~/lib/logger";
import { TRPCError } from "@trpc/server";

// D1 specific error patterns
const D1_ERROR_PATTERNS = {
  CPU_TIMEOUT: /cpu time limit exceeded/i,
  PARAMETER_LIMIT: /too many.*parameters/i,
  CONNECTION_LIMIT: /connection.*limit/i,
  QUERY_SIZE: /query.*too.*large/i,
  RESULT_SIZE: /result.*too.*large/i,
} as const;

// D1 operation limits
export const D1_OPERATION_LIMITS = {
  MAX_BATCH_SIZE: 50, // Max items in a single batch operation
  MAX_CONCURRENT_QUERIES: 5, // Max concurrent queries per request
  MAX_QUERY_RETRIES: 3, // Max retries for transient errors
  RETRY_DELAY_MS: 100, // Base delay between retries
} as const;

/**
 * D1 error handler that provides user-friendly error messages and retry logic
 */
export class D1ErrorHandler {
  /**
   * Check if an error is D1-specific and recoverable
   */
  static isD1Error(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    return Object.values(D1_ERROR_PATTERNS).some(pattern => 
      pattern.test(error.message)
    );
  }

  /**
   * Check if a D1 error is retryable
   */
  static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    // CPU timeout and connection limit errors may be retryable
    return D1_ERROR_PATTERNS.CPU_TIMEOUT.test(error.message) ||
           D1_ERROR_PATTERNS.CONNECTION_LIMIT.test(error.message);
  }

  /**
   * Convert D1 error to user-friendly TRPC error
   */
  static toTRPCError(error: unknown, context?: string): TRPCError {
    if (!(error instanceof Error)) {
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unknown database error occurred",
      });
    }

    if (D1_ERROR_PATTERNS.CPU_TIMEOUT.test(error.message)) {
      return new TRPCError({
        code: "TIMEOUT",
        message: "Query took too long to execute. Please try with smaller time ranges or fewer filters.",
        cause: error,
      });
    }

    if (D1_ERROR_PATTERNS.PARAMETER_LIMIT.test(error.message)) {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Too many parameters in query. Please reduce the number of filters or use pagination.",
        cause: error,
      });
    }

    if (D1_ERROR_PATTERNS.CONNECTION_LIMIT.test(error.message)) {
      return new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Database is temporarily busy. Please try again in a moment.",
        cause: error,
      });
    }

    if (D1_ERROR_PATTERNS.RESULT_SIZE.test(error.message)) {
      return new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Query result too large. Please use pagination or reduce the time range.",
        cause: error,
      });
    }

    // Generic database error
    logger.error("Unhandled database error", { error: error.message, context });
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "A database error occurred. Please try again later.",
      cause: error,
    });
  }
}

/**
 * Retry wrapper for D1 operations with exponential backoff
 */
export async function withD1Retry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    context?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? D1_OPERATION_LIMITS.MAX_QUERY_RETRIES;
  const baseDelay = options.baseDelay ?? D1_OPERATION_LIMITS.RETRY_DELAY_MS;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a D1 error or not retryable
      if (!D1ErrorHandler.isD1Error(error) || !D1ErrorHandler.isRetryableError(error)) {
        break;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      logger.warn(`D1 operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: options.context
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted, throw the last error as TRPC error
  throw D1ErrorHandler.toTRPCError(lastError, options.context);
}

/**
 * Batch operation safeguard that respects D1 limits
 */
export class D1BatchOperations {
  private concurrentQueries = 0;
  
  /**
   * Execute operations in batches with concurrency control
   */
  async executeBatch<TInput, TResult>(
    items: TInput[],
    operation: (batch: TInput[]) => Promise<TResult[]>,
    options: {
      batchSize?: number;
      maxConcurrency?: number;
      context?: string;
    } = {}
  ): Promise<TResult[]> {
    const batchSize = Math.min(
      options.batchSize ?? D1_OPERATION_LIMITS.MAX_BATCH_SIZE,
      D1_OPERATION_LIMITS.MAX_BATCH_SIZE
    );
    const maxConcurrency = Math.min(
      options.maxConcurrency ?? D1_OPERATION_LIMITS.MAX_CONCURRENT_QUERIES,
      D1_OPERATION_LIMITS.MAX_CONCURRENT_QUERIES
    );

    // Split items into batches
    const batches: TInput[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    if (batches.length === 0) return [];

    logger.info(`Executing D1 batch operation`, {
      totalItems: items.length,
      batchCount: batches.length,
      batchSize,
      maxConcurrency,
      context: options.context
    });

    // Execute batches with concurrency control
    const results: TResult[] = [];
    
    for (let i = 0; i < batches.length; i += maxConcurrency) {
      const concurrentBatches = batches.slice(i, i + maxConcurrency);
      
      const batchPromises = concurrentBatches.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        return withD1Retry(
          () => operation(batch),
          { context: `${options.context}_batch_${actualBatchIndex}` }
        );
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  /**
   * Track concurrent query count
   */
  async withConcurrencyControl<T>(operation: () => Promise<T>): Promise<T> {
    if (this.concurrentQueries >= D1_OPERATION_LIMITS.MAX_CONCURRENT_QUERIES) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many concurrent database operations. Please try again later.",
      });
    }

    this.concurrentQueries++;
    try {
      return await operation();
    } finally {
      this.concurrentQueries--;
    }
  }
}

// Export singleton instance
export const d1BatchOperations = new D1BatchOperations();

/**
 * D1-safe transaction wrapper (for when D1 supports transactions)
 */
export async function withD1Transaction<T>(
  operation: () => Promise<T>,
  context = 'transaction'
): Promise<T> {
  // For now, D1 doesn't support transactions, so we just wrap with retry logic
  return withD1Retry(operation, { context });
}

/**
 * Validate operation parameters before executing D1 queries
 */
export function validateD1Operation(params: {
  parameterCount?: number;
  expectedResultSize?: number;
  operationName: string;
}): void {
  if (params.parameterCount && params.parameterCount > 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Operation "${params.operationName}" has too many parameters (${params.parameterCount}). Maximum is 100.`,
    });
  }

  if (params.expectedResultSize && params.expectedResultSize > 10000) {
    throw new TRPCError({
      code: "BAD_REQUEST", 
      message: `Operation "${params.operationName}" expects too many results (${params.expectedResultSize}). Use pagination for large datasets.`,
    });
  }
}