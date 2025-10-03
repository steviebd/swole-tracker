export interface WorkOSSession {
  userId: string;
  organizationId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

// Cookie configuration
const SESSION_COOKIE_NAME = "workos_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_COOKIE_PATH = "/";
const SESSION_COOKIE_HTTP_ONLY = true;
const SESSION_COOKIE_SECURE = process.env.NODE_ENV === "production";
const SESSION_COOKIE_SAME_SITE = "lax" as const;

function getSecret(): string {
  const secret = process.env.WORKER_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("WORKER_SESSION_SECRET must be at least 32 characters long");
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
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify signed data using Web Crypto API
async function verify(data: string, signature: string): Promise<boolean> {
  const expectedSignature = await sign(data);
  return expectedSignature === signature;
}

// Serialize session to string
function serializeSession(session: WorkOSSession): string {
  return JSON.stringify(session);
}

// Deserialize session from string
function deserializeSession(data: string): WorkOSSession {
  try {
    const session = JSON.parse(data);
    // Validate required fields
    if (!session.userId || !session.accessToken || !session.refreshToken || !session.expiresAt) {
      throw new Error("Invalid session data");
    }
    return session;
  } catch (error) {
    throw new Error("Invalid session data format");
  }
}

export class SessionCookie {
  static async create(session: WorkOSSession): Promise<string> {
    const serialized = serializeSession(session);
    const signature = await sign(serialized);
    const signedData = `${serialized}.${signature}`;

    // Create cookie string
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
      const [data, signature] = cookieValue.split(".");
      if (!data || !signature) return null;

      const isValid = await verify(data, signature);
      if (!isValid) return null;

      return deserializeSession(decodeURIComponent(data));
    } catch (error) {
      // Invalid cookie format
      return null;
    }
  }

  static destroy(): string {
    return [
      `${SESSION_COOKIE_NAME}=`,
      `Max-Age=0`,
      `Path=${SESSION_COOKIE_PATH}`,
      SESSION_COOKIE_HTTP_ONLY ? "HttpOnly" : "",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`,
    ].filter(Boolean).join("; ");
  }

  private static extractCookieValue(cookieString: string, name: string): string | null {
    const cookies = cookieString.split(";").map(c => c.trim());
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
}
