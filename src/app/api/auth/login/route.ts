import type { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { env } from "~/env";
import { resolveWorkOSRedirectUri } from "~/lib/site-url";

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

    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "GoogleOAuth", // Use GoogleOAuth for Google SSO
      redirectUri,
      clientId: env.WORKOS_CLIENT_ID!, // We already checked it's defined
      state: encodeState(JSON.stringify({ redirectTo: safeRedirect })),
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
