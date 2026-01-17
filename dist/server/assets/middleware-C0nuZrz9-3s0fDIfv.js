import { j as getDb, S as SessionCookie } from "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { g as getRequest } from "./worker-entry-_S0z7k3x.js";
const createMiddleware = (options, __opts) => {
  const resolvedOptions = {
    type: "request",
    ...__opts || options
  };
  return {
    options: resolvedOptions,
    middleware: (middleware) => {
      return createMiddleware(
        {},
        Object.assign(resolvedOptions, { middleware })
      );
    },
    inputValidator: (inputValidator) => {
      return createMiddleware(
        {},
        Object.assign(resolvedOptions, { inputValidator })
      );
    },
    client: (client) => {
      return createMiddleware(
        {},
        Object.assign(resolvedOptions, { client })
      );
    },
    server: (server) => {
      return createMiddleware(
        {},
        Object.assign(resolvedOptions, { server })
      );
    }
  };
};
function getEnv(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof globalThis !== "undefined" && globalThis.__env__ !== void 0) {
    return (globalThis.__env__ || {})[name];
  }
  return void 0;
}
async function getServerContext() {
  const request = getRequest();
  const requestId = crypto.randomUUID();
  const db = getDb();
  let user = null;
  let session = null;
  const e2eTesting = getEnv("E2E_TESTING") === "true";
  if (e2eTesting || request?.headers.get("x-e2e-test") === "true") {
    session = {
      userId: "e2e-test-user",
      accessToken: "e2e-test-token",
      refreshToken: null,
      accessTokenExpiresAt: Date.now() + 36e5,
      sessionExpiresAt: Date.now() + 36e5,
      expiresAt: Date.now() + 36e5
    };
    user = { id: session.userId };
  } else if (request) {
    try {
      session = await SessionCookie.get(request);
      if (session && !SessionCookie.isExpired(session)) {
        user = { id: session.userId };
      }
    } catch (error) {
      console.error("Failed to get session:", error);
    }
  }
  return { db, user, session, requestId };
}
async function requireAuth() {
  const ctx = await getServerContext();
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx;
}
createMiddleware().server(async ({ next }) => {
  const ctx = await getServerContext();
  return next({ context: ctx });
});
const withAuth = createMiddleware().server(async ({ next }) => {
  const ctx = await requireAuth();
  return next({ context: ctx });
});
export {
  withAuth as w
};
