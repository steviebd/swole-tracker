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
import { validateAccessToken, SESSION_COOKIE_NAME, type WorkOSUser } from "~/lib/workos";

import { createDbWithBindings } from "~/server/db";
import { logger, logApiCall } from "~/lib/logger";
import { ensureCloudflareBindings } from "~/lib/cloudflare-context";
// Use Web Crypto API for Edge Runtime compatibility
const randomUUID = () => globalThis.crypto.randomUUID();

/**
 * Cache-aware access token validation to eliminate redundant WorkOS API calls
 * within the same request. This function checks the request-scoped cache first
 * before making API calls to WorkOS.
 * 
 * The cache is request-scoped and automatically cleaned up when the request ends.
 * Failed validations are also cached to prevent repeated API calls for invalid tokens.
 */
async function validateAccessTokenWithCache(
  accessToken: string, 
  authCache: RequestAuthCache
): Promise<WorkOSUser | null> {
  // Validate inputs
  if (!accessToken || typeof accessToken !== 'string') {
    console.warn('tRPC context: Invalid access token provided to cache');
    return null;
  }

  if (!authCache || !authCache.userByToken) {
    console.warn('tRPC context: Invalid auth cache provided, falling back to direct validation');
    return await validateAccessToken(accessToken);
  }

  // Check cache first
  if (authCache.userByToken.has(accessToken)) {
    const cachedResult = authCache.userByToken.get(accessToken);
    console.log('tRPC context: Using cached auth result for token:', {
      tokenPrefix: accessToken.substring(0, 20) + '...',
      hasUser: !!cachedResult,
      userId: cachedResult?.id,
      cacheSize: authCache.userByToken.size
    });
    return cachedResult ?? null;
  }

  // Cache miss - validate with WorkOS and cache the result
  console.log('tRPC context: Cache miss, validating token with WorkOS:', {
    tokenPrefix: accessToken.substring(0, 20) + '...',
    cacheSize: authCache.userByToken.size
  });
  
  try {
    const workosUser = await validateAccessToken(accessToken);
    
    // Cache the result (both success and failure)
    // Prevent cache from growing too large within a single request
    if (authCache.userByToken.size < 10) {
      authCache.userByToken.set(accessToken, workosUser);
    } else {
      console.warn('tRPC context: Auth cache size limit reached, not caching additional tokens');
    }
    
    console.log('tRPC context: Cached auth result:', {
      tokenPrefix: accessToken.substring(0, 20) + '...',
      hasUser: !!workosUser,
      userId: workosUser?.id,
      cacheSize: authCache.userByToken.size
    });
    
    return workosUser;
  } catch (error) {
    // Cache null result for failed validations to avoid repeated failures
    if (authCache.userByToken.size < 10) {
      authCache.userByToken.set(accessToken, null);
    }
    console.error('tRPC context: Auth validation failed, cached null result:', error);
    return null;
  }
}

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

// Request-scoped authentication cache to avoid redundant WorkOS API calls
export type RequestAuthCache = {
  userByToken: Map<string, WorkOSUser | null>;
};

export type TRPCContext = {
  db: ReturnType<typeof createDbWithBindings>;
  user: TrpcUser;
  requestId: string;
  headers: Headers;
  authCache: RequestAuthCache;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
  env?: {
    DB?: D1Database;
  };
}): Promise<TRPCContext> => {
  // Ensure Cloudflare bindings are available before any database operations
  ensureCloudflareBindings();
  
  const db = createDbWithBindings({ DB: opts.env?.DB });
  
  // Generate a requestId for correlating logs across middlewares/routers
  const requestId = randomUUID();

  // Create request-scoped authentication cache
  const authCache: RequestAuthCache = {
    userByToken: new Map<string, WorkOSUser | null>(),
  };

  try {
    // Get WorkOS session from cookie header
    const cookieHeader = opts.headers.get('cookie');
    let user: TrpcUser = null;

    if (cookieHeader) {
      // Parse cookies to find WorkOS session
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value !== undefined) {
          acc[name] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const sessionCookie = cookies[SESSION_COOKIE_NAME];
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
          if (sessionData.accessToken) {
            // Validate the access token with WorkOS using cache-aware validation
            const workosUser = await validateAccessTokenWithCache(sessionData.accessToken, authCache);
            if (workosUser) {
              // Validate user ID is a proper string, not a number
              if (typeof workosUser.id !== 'string' || workosUser.id.trim() === '') {
                console.error('tRPC context: Invalid user ID from WorkOS', {
                  userId: workosUser.id,
                  userIdType: typeof workosUser.id,
                  requestId,
                });
                user = null;
              } else {
                user = { id: workosUser.id };
                console.log('tRPC context: User authenticated', {
                  userId: workosUser.id,
                  userIdType: typeof workosUser.id,
                  requestId,
                });
              }
            }
          }
        } catch (error) {
          console.log('tRPC context: Failed to parse WorkOS session:', error);
        }
      }
    }

    return {
      db,
      user,
      requestId,
      headers: opts.headers,
      authCache,
    };
  } catch (error) {
    console.error('tRPC context: Failed to get user:', error);
    // In case of any auth errors, return context with no user
    return {
      db,
      user: null,
      requestId,
      headers: opts.headers,
      authCache,
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
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(message)) {
          return "Database operation failed. Please contact support.";
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
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };

    // Log at warn/error depending on code
    const code = shape.data?.code;
    const level = code === "INTERNAL_SERVER_ERROR" ? "error" : "warn";
    const userId = ctx?.user?.id ?? "anonymous";

    // In tests, surface full stack to console to diagnose failing chains
    const isTest =
      Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
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

  // Correlated, structured timing log
  const userId = ctx.user?.id ?? "anonymous";
  const requestId = ctx.requestId;
  logger.debug("tRPC request completed", {
    path,
    userId,
    requestId,
    durationMs: end - start,
  });
  logApiCall(path, userId, end - start);

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
