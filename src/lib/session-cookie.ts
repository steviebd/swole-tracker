import { env } from "~/env";
import { db } from "~/server/db";
import { sessions } from "~/server/db/schema";
import { eq, and, gt } from "drizzle-orm";

export interface WorkOSSession {
  userId: string;
  organizationId?: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // Unix timestamp in seconds
}

export interface SessionData {
  id: string; // Opaque session ID
  userId: string;
  organizationId?: string;
  expiresAt: number; // Unix timestamp in seconds
}

// Cookie configuration
const SESSION_COOKIE_NAME = "workos_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_COOKIE_PATH = "/";
const SESSION_COOKIE_HTTP_ONLY = true;
const SESSION_COOKIE_SECURE = env.NODE_ENV === "production";
const SESSION_COOKIE_SAME_SITE = "lax" as const;

function getSecret(): string {
  const secret = env.WORKER_SESSION_SECRET;
  // In test environment, allow shorter secrets for testing
  if (env.NODE_ENV === "test" && secret && secret.length >= 10) {
    return secret;
  }
  if (!secret || secret.length < 32) {
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

// Serialize session to string
function serializeSession(session: WorkOSSession): string {
  return JSON.stringify(session);
}

// Deserialize session from string
function deserializeSession(data: string): WorkOSSession {
  try {
    const session = JSON.parse(data) as WorkOSSession;
    // Validate required fields
    if (!session.userId || !session.accessToken || !session.expiresAt) {
      throw new Error("Invalid session data");
    }
    const refreshToken =
      typeof session.refreshToken === "undefined" ? null : session.refreshToken;

    return {
      ...session,
      refreshToken,
    };
  } catch (error) {
    throw new Error("Invalid session data format");
  }
}

export class SessionCookie {
  static async create(session: WorkOSSession): Promise<string> {
    // Generate opaque session ID
    const sessionId = crypto.randomUUID();

    // Store session data in database
    await db.insert(sessions).values({
      id: sessionId,
      userId: session.userId,
      organizationId: session.organizationId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
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

  static async get(request: Request): Promise<WorkOSSession | null> {
    const cookies = request.headers.get("cookie");
    if (!cookies) return null;

    const cookieValue = this.extractCookieValue(cookies, SESSION_COOKIE_NAME);
    if (!cookieValue) return null;

    try {
      const decodedCookieValue = decodeURIComponent(cookieValue);
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
      const [sessionData] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.id, sessionId),
            gt(sessions.expiresAt, Math.floor(Date.now() / 1000)),
          ),
        )
        .limit(1);

      if (!sessionData) return null;

      return {
        userId: sessionData.userId,
        organizationId: sessionData.organizationId || undefined,
        accessToken: sessionData.accessToken,
        refreshToken: sessionData.refreshToken,
        expiresAt: sessionData.expiresAt,
      };
    } catch (error) {
      // Invalid cookie format or database error
      return null;
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
              await db.delete(sessions).where(eq(sessions.id, sessionId));
            }
          }
        }
      }
    } catch (error) {
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
    return session.expiresAt <= now;
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

      // Update session data in database
      await db
        .update(sessions)
        .set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      // Ignore update errors
    }
  }
}
