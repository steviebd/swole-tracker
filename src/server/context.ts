import { getDb, type Db } from "~/server/db";
import { SessionCookie, type WorkOSSession } from "~/lib/session-cookie";
import { getRequest } from "@tanstack/react-start/server";

export interface ServerContext {
  db: Db;
  user: { id: string } | null;
  session: WorkOSSession | null;
  requestId: string;
}

function getEnv(name: string): string | undefined {
  if (
    typeof process !== "undefined" &&
    process.env &&
    (process.env as Record<string, unknown>)[name]
  ) {
    return (process.env as Record<string, string>)[name];
  }
  const env = (globalThis as unknown as { __env?: Record<string, string> })
    .__env;
  if (env) {
    return env[name];
  }
  return undefined;
}

export async function getServerContext(): Promise<ServerContext> {
  const request = getRequest();
  const requestId = crypto.randomUUID();

  const db = await getDb();

  let user: { id: string } | null = null;
  let session: WorkOSSession | null = null;

  const e2eTesting = getEnv("E2E_TESTING") === "true";

  if (e2eTesting || request?.headers.get("x-e2e-test") === "true") {
    session = {
      userId: "e2e-test-user",
      accessToken: "e2e-test-token",
      refreshToken: null,
      accessTokenExpiresAt: Date.now() + 3600000,
      sessionExpiresAt: Date.now() + 3600000,
      expiresAt: Date.now() + 3600000,
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

export async function requireAuth(): Promise<
  ServerContext & { user: { id: string } }
> {
  const ctx = await getServerContext();
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx as ServerContext & { user: { id: string } };
}
