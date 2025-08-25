/**
 * Wrangler D1 API Client for Build-Time Database Access
 *
 * This client uses Wrangler's D1 REST API to connect to Cloudflare D1
 * databases during build time when remote bindings are not available.
 */

import { spawn } from "child_process";

interface D1Response {
  success: boolean;
  result?: any[];
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
    rows_read?: number;
    rows_written?: number;
    size_after?: number;
    changed_db?: boolean;
  };
  error?: string;
}

/**
 * Wrangler D1 API Client that implements D1Database interface
 */
export class WranglerD1Client implements D1Database {
  constructor(
    private databaseId: string,
    private accountId: string,
    private apiToken: string,
  ) {}

  /**
   * Execute a query using wrangler d1 execute command
   */
  private async executeQuery(
    query: string,
    params: any[] = [],
  ): Promise<D1Response> {
    return new Promise((resolve, reject) => {
      // Replace parameter placeholders with actual values
      let processedQuery = query;
      if (params.length > 0) {
        // Replace ? placeholders with actual parameter values
        // Note: This is a simple implementation. In production, you'd want proper SQL escaping
        params.forEach((param, index) => {
          const placeholder = new RegExp(`\\?`, "g");
          processedQuery = processedQuery.replace(placeholder, () => {
            if (typeof param === "string") {
              return `'${param.replace(/'/g, "''")}'`; // Escape single quotes
            }
            return String(param);
          });
        });
      }

      // Use wrangler d1 execute command with JSON output
      const args = [
        "d1",
        "execute",
        this.databaseId,
        "--command",
        processedQuery,
        "--json",
      ];

      console.log(`[WranglerD1] Executing: wrangler ${args.join(" ")}`);

      const wrangler = spawn("wrangler", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: this.apiToken,
          CLOUDFLARE_ACCOUNT_ID: this.accountId,
        },
      });

      let stdout = "";
      let stderr = "";

      wrangler.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      wrangler.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      wrangler.on("close", (code) => {
        if (code !== 0) {
          console.error(`[WranglerD1] Command failed with code ${code}`);
          console.error(`[WranglerD1] stderr:`, stderr);
          reject(new Error(`Wrangler command failed: ${stderr}`));
          return;
        }

        try {
          // Parse JSON response from wrangler
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          console.error(`[WranglerD1] Failed to parse response:`, stdout);
          reject(
            new Error(`Failed to parse wrangler response: ${String(error)}`),
          );
        }
      });
    });
  }

  /**
   * Prepare a statement (returns a prepared statement object)
   */
  prepare<T = unknown>(query: string): D1PreparedStatement {
    const self = this;
    let boundValues: unknown[] = []; // Store bound parameters

    const preparedStatement = {
      bind(...values: unknown[]): D1PreparedStatement {
        boundValues = values; // Store the values instead of recursing
        return preparedStatement as any; // Return the same object
      },

      async first(colName?: string): Promise<any> {
        const response = await self.executeQuery(query, boundValues); // Use stored values
        if (!response.success) {
          throw new Error(response.error || "Query failed");
        }
        const result = response.result?.[0] || null;
        if (colName && result) {
          return (result as any)[colName] || null;
        }
        return result;
      },

      async run(): Promise<D1Result<T>> {
        const response = await self.executeQuery(query, boundValues); // Use stored values
        if (!response.success) {
          throw new Error(response.error || "Query failed");
        }

        return {
          success: response.success,
          meta: {
            changes: response.meta?.changes || 0,
            last_row_id: response.meta?.last_row_id || 0,
            duration: response.meta?.duration || 0,
            rows_read: response.meta?.rows_read || 0,
            rows_written: response.meta?.rows_written || 0,
            size_after: response.meta?.size_after || 0,
            changed_db: response.meta?.changed_db || false,
          },
        } as D1Result<T>;
      },

      async all(): Promise<D1Result<T>> {
        const response = await self.executeQuery(query, boundValues); // Use stored values
        if (!response.success) {
          throw new Error(response.error || "Query failed");
        }

        return {
          success: response.success,
          results: response.result || [],
          meta: {
            changes: response.meta?.changes || 0,
            last_row_id: response.meta?.last_row_id || 0,
            duration: response.meta?.duration || 0,
            rows_read: response.meta?.rows_read || 0,
            rows_written: response.meta?.rows_written || 0,
            size_after: response.meta?.size_after || 0,
            changed_db: response.meta?.changed_db || false,
          },
        } as D1Result<T>;
      },

      async raw(options?: { columnNames?: boolean }): Promise<any> {
        const response = await self.executeQuery(query, boundValues); // Use stored values
        if (!response.success) {
          throw new Error(response.error || "Query failed");
        }

        const result = response.result || [];

        if (options?.columnNames) {
          // Return column names as first element, then data rows
          const columnNames =
            result.length > 0 ? Object.keys(result[0] || {}) : [];
          return [columnNames, ...result];
        }

        return result;
      },
    };

    return preparedStatement as any;
  }

  /**
   * Execute a batch of queries
   */
  async batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];

    // Execute statements sequentially for now
    // TODO: Optimize with proper batch support if wrangler adds it
    for (const statement of statements) {
      const result = await statement.run();
      results.push(result as D1Result<T>);
    }

    return results;
  }

  /**
   * Execute a query directly
   */
  async exec(query: string): Promise<D1ExecResult> {
    const response = await this.executeQuery(query);

    return {
      count: response.result?.length || 0,
      duration: response.meta?.duration || 0,
    };
  }

  /**
   * Dump the database (not supported via wrangler CLI)
   */
  async dump(): Promise<ArrayBuffer> {
    throw new Error("Database dump not supported via Wrangler API");
  }

  /**
   * Session support - creates a database session
   */
  withSession(constraintOrBookmark?: string): any {
    // For build-time usage via Wrangler, we don't have full session support
    // Return a mock session that delegates to the main database
    return {
      prepare: (query: string) => this.prepare(query),
      batch: <T = unknown>(statements: D1PreparedStatement[]) =>
        this.batch<T>(statements),
      exec: (query: string) => this.exec(query),
      getBookmark: () => null,
    };
  }
}

/**
 * Create a WranglerD1Client if environment variables are available
 */
export function createWranglerD1Client(): D1Database | null {
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!databaseId || !accountId || !apiToken) {
    console.log(
      "[WranglerD1] Missing required environment variables for remote D1 connection",
    );
    console.log(
      "[WranglerD1] Required: CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN",
    );
    return null;
  }

  console.log(
    "[WranglerD1] Creating Wrangler D1 client for remote database connection",
  );
  console.log("[WranglerD1] Database ID:", databaseId);
  console.log("[WranglerD1] Account ID:", accountId);

  return new WranglerD1Client(databaseId, accountId, apiToken);
}

/**
 * Check if we should use remote D1 connection
 */
export function shouldUseRemoteD1(): boolean {
  return !!(
    process.env.CLOUDFLARE_D1_DATABASE_ID &&
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  );
}
