/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { SessionCookie } from "~/lib/session-cookie";

import { createDb, db as fallbackDb, getD1Binding } from "~/server/db";
import { logger, logApiCall } from "~/lib/logger";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
type TrpcUser = {
  id: string;
} | null;

export type TRPCContext = {
  db: ReturnType<typeof createDb>;
  user: TrpcUser;
  requestId: string;
  headers: Headers;
  timings?: Map<string, number>;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
}): Promise<TRPCContext> => {
  // Generate a requestId for correlating logs across middlewares/routers
  const requestId = crypto.randomUUID();

  try {
    // Create a mock Request object to pass to SessionCookie.get
    const mockRequest = {
      headers: {
        get: (name: string) => opts.headers.get(name),
      },
    } as Request;

    const session = await SessionCookie.get(mockRequest);

    let user: TrpcUser = null;
    if (session && !SessionCookie.isExpired(session)) {
      user = { id: session.userId };
    }

    // Get D1 binding from Cloudflare context
    const dbBinding = getD1Binding();
    const db = createDb(dbBinding);

    return {
      db,
      user,
      requestId,
      headers: opts.headers,
      timings: new Map(),
    };
  } catch (error) {
    console.error("tRPC context: Failed to get session:", error);
    // In case of any session errors, return context with no user
    // For error cases, fall back to the global db instance
    return {
      db: fallbackDb,
      user: null,
      requestId,
      headers: opts.headers,
      timings: new Map(),
    };
  }
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx, path, type }) {
    // Attach requestId and normalized error info for easier troubleshooting
    const requestId = ctx?.requestId;
    const isProduction = process.env.NODE_ENV === "production";

    // Sanitize error messages for production to prevent information disclosure
    const sanitizeMessage = (message: string): string => {
      if (!isProduction) return message;

      // In production, sanitize potentially sensitive error messages
      const sensitivePatterns = [
        /invalid input syntax for type/i,
        /duplicate key value violates/i,
        /relation ".*" does not exist/i,
        /column ".*" does not exist/i,
        /database connection/i,
        /connection terminated/i,
        /authentication failed/i,
        /role ".*" does not exist/i,
        /access token/i,
        /refresh token/i,
        /client secret/i,
        /api key/i,
        /password/i,
        /secret/i,
        /encryption/i,
        /decrypt/i,
        /private key/i,
        /jwt/i,
        /bearer/i,
        /oauth/i,
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(message)) {
          return "Operation failed. Please contact support.";
        }
      }

      // Remove potential file paths and internal references
      return message
        .replace(/\/[a-zA-Z0-9_\-./]+\.(js|ts|tsx|jsx)/g, "[file]")
        .replace(/at [a-zA-Z0-9_\-.]+\./g, "at [function].")
        .replace(/Error: /g, "");
    };

    const formatted = {
      ...shape,
      message: sanitizeMessage(shape.message),
      data: {
        ...shape.data,
        requestId,
        path,
        type,
        zodError:
          error.cause instanceof ZodError
            ? (error.cause.flatten as any)()
            : null,
      },
    };

    // Log at warn/error depending on code
    const code = shape.data?.code;
    const level = code === "INTERNAL_SERVER_ERROR" ? "error" : "warn";
    const userId = ctx?.user?.id ?? "anonymous";

    // In tests, surface full stack to console to diagnose failing chains
    const isTest =
      Boolean(process.env["VITEST"]) || process.env.NODE_ENV === "test";
    if (level === "error") {
      logger.error("tRPC internal error", error, {
        path,
        userId,
        requestId,
        code,
      });
      if (isTest) {
        console.error("[tRPC errorFormatter]", {
          path,
          userId,
          requestId,
          code,
          message: (error as unknown as { message?: string })?.message,
          stack: (error as unknown as { stack?: string })?.stack,
          cause: (error as unknown as { cause?: unknown })?.cause,
          shape,
        });
      }
    } else {
      logger.warn("tRPC handled error", {
        path,
        userId,
        requestId,
        code,
        message: shape.message,
      });
      if (isTest) {
        console.warn("[tRPC warnFormatter]", {
          path,
          userId,
          requestId,
          code,
          message:
            (error as unknown as { message?: string })?.message ??
            shape.message,
          stack: (error as unknown as { stack?: string })?.stack,
          shape,
        });
      }
    }

    return formatted;
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  const duration = end - start;

  // Store timing for Server-Timing header
  ctx.timings?.set(`trpc-${path.replace(/\./g, "-")}`, duration);

  // Correlated, structured timing log
  const userId = ctx.user?.id ?? "anonymous";
  const requestId = ctx.requestId;
  logger.debug("tRPC request completed", {
    path,
    userId,
    requestId,
    durationMs: duration,
  });
  logApiCall(path, userId, duration);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `user` as non-nullable
        user: ctx.user,
      },
    });
  });
