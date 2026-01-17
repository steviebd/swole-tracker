const cfEnvBase = process.env as unknown as {
  NODE_ENV: string;
  WORKER_SESSION_SECRET: string;
};
const cfEnvInjection = (
  globalThis as unknown as { __env__?: Record<string, string> }
).__env__;
const cfEnv = {
  NODE_ENV: cfEnvInjection?.NODE_ENV || cfEnvBase.NODE_ENV || "development",
  WORKER_SESSION_SECRET:
    cfEnvInjection?.WORKER_SESSION_SECRET ||
    cfEnvBase.WORKER_SESSION_SECRET ||
    "",
};
import { getDb, type Db } from "~/server/db";
import { sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";

let sessionDb: Db | null = null;

export function setSessionCookieDbForTesting(mockDb: Db) {
  sessionDb = mockDb;
}

export function resetSessionCookieDbForTesting() {
  sessionDb = null;
}

async function getSessionDb(): Promise<Db> {
  if (sessionDb) return sessionDb;
  return getDb();
}

export interface WorkOSSession {
  userId: string;
  organizationId?: string;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: number; // Unix timestamp in seconds
  sessionExpiresAt: number; // Unix timestamp in seconds
  expiresAt: number; // Deprecated alias for access token expiry
}

export interface SessionData {
  id: string; // Opaque session ID
  userId: string;
  organizationId?: string;
  expiresAt: number; // Unix timestamp in seconds
  accessTokenExpiresAt?: number | null;
  sessionExpiresAt?: number | null;
}

// Cookie configuration
const SESSION_COOKIE_NAME = "workos_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_COOKIE_PATH = "/";
const SESSION_COOKIE_HTTP_ONLY = true;
const SESSION_COOKIE_SAME_SITE = "lax" as const;
const SESSION_COOKIE_SECURE = cfEnv.NODE_ENV === "production";

function getSecret(): string {
  const secret = cfEnv.WORKER_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "WORKER_SESSION_SECRET must be at least 32 characters long",
    );
  }
  return secret;
}

// Sign data with HMAC-SHA256 using Web Crypto API
async function sign(data: string): Promise<string> {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verify signed data using Web Crypto API
async function verify(data: string, signature: string): Promise<boolean> {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(data),
  );
}

export class SessionCookie {
  static async create(session: WorkOSSession): Promise<string> {
    const isDev = cfEnv.NODE_ENV === "development";

    if (isDev) {
      // In development without D1, create a simplified cookie
      return this.createDevSessionCookie(session);
    }

    // Generate opaque session ID
    const sessionId = crypto.randomUUID();

    const accessTokenExpiresAt =
      session.accessTokenExpiresAt ?? session.expiresAt;
    const sessionExpiresAt = session.sessionExpiresAt ?? accessTokenExpiresAt;

    if (
      typeof accessTokenExpiresAt !== "number" ||
      typeof sessionExpiresAt !== "number"
    ) {
      throw new Error("Session expiry values must be numbers");
    }

    // Store session data in database
    const db = await getSessionDb();
    await db.insert(sessions).values({
      id: sessionId,
      userId: session.userId,
      organizationId: session.organizationId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: accessTokenExpiresAt,
      accessTokenExpiresAt,
      sessionExpiresAt,
    });

    // Sign the session ID
    const signature = await sign(sessionId);
    const signedData = `${sessionId}.${signature}`;

    // Create cookie string with just the session ID
    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedData)}`,
      `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
      `Path=${SESSION_COOKIE_PATH}`,
      SESSION_COOKIE_HTTP_ONLY ? "HttpOnly" : "",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`,
    ].filter(Boolean);

    return cookieParts.join("; ");
  }

  private static async createDevSessionCookie(
    session: WorkOSSession,
  ): Promise<string> {
    // In dev without D1, embed session data directly in cookie (not for production!)
    const sessionData = JSON.stringify({
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      sessionExpiresAt: session.sessionExpiresAt,
      expiresAt: session.expiresAt,
      organizationId: session.organizationId,
      _dev: true,
    });

    const signature = await sign(sessionData);
    const signedData = `dev_${Buffer.from(sessionData).toString("base64")}.${signature}`;

    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedData)}`,
      `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
      `Path=${SESSION_COOKIE_PATH}`,
      "HttpOnly",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`,
    ].filter(Boolean);

    return cookieParts.join("; ");
  }

  static async get(request: Request): Promise<WorkOSSession | null> {
    const cookies = request.headers.get("cookie");
    if (!cookies) return null;

    const cookieValue = this.extractCookieValue(cookies, SESSION_COOKIE_NAME);
    if (!cookieValue) return null;

    try {
      const decodedCookieValue = decodeURIComponent(cookieValue);

      // Handle dev mode cookie format (embedded session data)
      if (decodedCookieValue.startsWith("dev_")) {
        return await this.parseDevSessionCookie(decodedCookieValue);
      }

      // Split from the end to get session ID and signature
      const separatorIndex = decodedCookieValue.lastIndexOf(".");

      if (
        separatorIndex <= 0 ||
        separatorIndex === decodedCookieValue.length - 1
      ) {
        return null;
      }

      const sessionId = decodedCookieValue.slice(0, separatorIndex);
      const signature = decodedCookieValue.slice(separatorIndex + 1);

      const isValid = await verify(sessionId, signature);
      if (!isValid) return null;

      // Fetch session data from database
      const db = await getSessionDb();
      const [sessionData] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (!sessionData) return null;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const sessionExpiresAt =
        sessionData.sessionExpiresAt ?? sessionData.expiresAt;
      const accessTokenExpiresAt =
        sessionData.accessTokenExpiresAt ?? sessionData.expiresAt;

      if (
        typeof sessionExpiresAt !== "number" ||
        typeof accessTokenExpiresAt !== "number" ||
        sessionExpiresAt <= nowSeconds
      ) {
        return null;
      }

      const result: WorkOSSession = {
        userId: sessionData.userId,
        accessToken: sessionData.accessToken,
        refreshToken: sessionData.refreshToken,
        accessTokenExpiresAt,
        sessionExpiresAt,
        expiresAt: accessTokenExpiresAt,
      };
      if (sessionData.organizationId) {
        result.organizationId = sessionData.organizationId;
      }
      return result;
    } catch (_error) {
      // Invalid cookie format or database error
      return null;
    }
  }

  private static parseDevSessionCookie(
    cookieValue: string,
  ): Promise<WorkOSSession | null> {
    try {
      // Format: dev_<base64_json>.<signature>
      const lastDotIndex = cookieValue.lastIndexOf(".");
      if (lastDotIndex <= 0) return Promise.resolve(null);

      const encodedData = cookieValue.slice(4, lastDotIndex);
      const signature = cookieValue.slice(lastDotIndex + 1);

      const jsonData = Buffer.from(encodedData, "base64").toString("utf-8");
      const data = JSON.parse(jsonData);

      // Verify signature
      return verify(jsonData, signature).then((isValid) => {
        if (!isValid) return null;

        // Check expiry
        const nowSeconds = Math.floor(Date.now() / 1000);
        const sessionExpiresAt = data.sessionExpiresAt ?? data.expiresAt;

        if (
          typeof sessionExpiresAt !== "number" ||
          sessionExpiresAt <= nowSeconds
        ) {
          return null;
        }

        return {
          userId: data.userId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
          sessionExpiresAt: data.sessionExpiresAt,
          expiresAt: data.expiresAt,
          organizationId: data.organizationId,
        };
      });
    } catch {
      return Promise.resolve(null);
    }
  }

  static async destroy(request: Request): Promise<string> {
    // Clean up session from database if it exists
    try {
      const cookies = request.headers.get("cookie");
      if (cookies) {
        const cookieValue = this.extractCookieValue(
          cookies,
          SESSION_COOKIE_NAME,
        );
        if (cookieValue) {
          const decodedCookieValue = decodeURIComponent(cookieValue);
          const separatorIndex = decodedCookieValue.lastIndexOf(".");

          if (
            separatorIndex > 0 &&
            separatorIndex < decodedCookieValue.length - 1
          ) {
            const sessionId = decodedCookieValue.slice(0, separatorIndex);
            const signature = decodedCookieValue.slice(separatorIndex + 1);

            if (await verify(sessionId, signature)) {
              // Delete session from database
              const db = await getSessionDb();
              await db.delete(sessions).where(eq(sessions.id, sessionId));
            }
          }
        }
      }
    } catch (_error) {
      // Ignore cleanup errors
    }

    return [
      `${SESSION_COOKIE_NAME}=`,
      `Max-Age=0`,
      `Path=${SESSION_COOKIE_PATH}`,
      SESSION_COOKIE_HTTP_ONLY ? "HttpOnly" : "",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`,
    ]
      .filter(Boolean)
      .join("; ");
  }

  private static extractCookieValue(
    cookieString: string,
    name: string,
  ): string | null {
    const cookies = cookieString.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return cookie.substring(`${name}=`.length);
      }
    }
    return null;
  }

  static async hasSession(request: Request): Promise<boolean> {
    const session = await this.get(request);
    return session !== null;
  }

  static isExpired(session: WorkOSSession): boolean {
    const now = Math.floor(Date.now() / 1000);
    const sessionExpiry =
      typeof session.sessionExpiresAt === "number"
        ? session.sessionExpiresAt
        : session.expiresAt;
    return sessionExpiry <= now;
  }

  static async update(request: Request, session: WorkOSSession): Promise<void> {
    const cookies = request.headers.get("cookie");
    if (!cookies) return;

    const cookieValue = this.extractCookieValue(cookies, SESSION_COOKIE_NAME);
    if (!cookieValue) return;

    try {
      const decodedCookieValue = decodeURIComponent(cookieValue);
      const separatorIndex = decodedCookieValue.lastIndexOf(".");

      if (
        separatorIndex <= 0 ||
        separatorIndex === decodedCookieValue.length - 1
      ) {
        return;
      }

      const sessionId = decodedCookieValue.slice(0, separatorIndex);

      const accessTokenExpiresAt =
        session.accessTokenExpiresAt ?? session.expiresAt;
      const sessionExpiresAt = session.sessionExpiresAt ?? accessTokenExpiresAt;

      // Update session data in database
      const db = await getSessionDb();
      await db
        .update(sessions)
        .set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: accessTokenExpiresAt,
          accessTokenExpiresAt,
          sessionExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    } catch (_error) {
      // Ignore update errors
    }
  }
}
