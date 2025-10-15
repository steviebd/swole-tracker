import type { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { env } from "~/env";
import { resolveWorkOSRedirectUri } from "~/lib/site-url";
import { createOAuthState, getClientIp } from "~/lib/oauth-state";
import { createDb, getD1Binding } from "~/server/db";

export const runtime = "nodejs";

function encodeState(payload: string): string {
  if (typeof btoa === "function") {
    return btoa(payload);
  }

  const bufferCtor = (globalThis as unknown as { Buffer?: typeof Buffer })
    .Buffer;
  if (bufferCtor) {
    return bufferCtor.from(payload, "utf-8").toString("base64");
  }

  throw new Error("Base64 encoder is not available in this runtime");
}

export async function GET(request: NextRequest) {
  const db = createDb(getD1Binding());

  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirectTo") || "/";
    const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

    if (!env.WORKOS_CLIENT_ID) {
      console.error("WORKOS_CLIENT_ID not configured");
      return NextResponse.json(
        { error: "Authentication not configured" },
        { status: 500 },
      );
    }

    const workos = getWorkOS();

    // Get authorization URL
    const redirectUri = resolveWorkOSRedirectUri(request.nextUrl);

    // Generate CSRF protection nonce
    const csrfNonce = crypto.randomUUID();
    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || "";

    // Create OAuth state for CSRF protection (using anonymous user for now)
    const oauthState = await createOAuthState(
      db,
      `anonymous_${csrfNonce}`, // Temporary user ID for anonymous state
      "workos",
      safeRedirect,
      clientIp,
      userAgent,
    );

    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "GoogleOAuth", // Use GoogleOAuth for Google SSO
      redirectUri,
      clientId: env.WORKOS_CLIENT_ID!, // We already checked it's defined
      state: encodeState(
        JSON.stringify({
          redirectTo: safeRedirect,
          csrfNonce,
          oauthState,
        }),
      ),
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to initiate login" },
      { status: 500 },
    );
  }
}
