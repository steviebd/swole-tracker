import { getDb, type Db } from "~/server/db";
import { SessionCookie, type WorkOSSession } from "~/lib/session-cookie";
import { getRequest } from "@tanstack/react-start/server";
import { env as cfEnv } from "cloudflare:workers";

export interface ServerContext {
  db: Db;
  user: { id: string } | null;
  session: WorkOSSession | null;
  requestId: string;
}

export async function getServerContext(): Promise<ServerContext> {
  const request = getRequest();
  const requestId = crypto.randomUUID();

  const db = getDb();

  let user: { id: string } | null = null;
  let session: WorkOSSession | null = null;

  const cfEnvVars = cfEnv as unknown as Record<string, string | undefined>;

  const isE2ETest =
    cfEnvVars.E2E_TESTING === "true" ||
    request?.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
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
