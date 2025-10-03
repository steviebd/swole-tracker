import { NextRequest, NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { SessionCookie } from "~/lib/session-cookie";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      console.error("Missing authorization code");
      return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
    }

    if (!env.WORKOS_CLIENT_ID) {
      console.error("WORKOS_CLIENT_ID not configured");
      return NextResponse.redirect(new URL("/auth/login?error=misconfigured", request.url));
    }

    const workos = getWorkOS();

    // Exchange code for tokens
    const authResponse = await workos.userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
    });

    // Create session with 24 hour expiration
    const session = {
      userId: authResponse.user.id,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken || "",
      expiresAt: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
    };

    // Create response with session cookie
    const cookieValue = await SessionCookie.create(session);

    // Decode state to get redirect URL
    let redirectTo = "/";
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        redirectTo = decodedState.redirectTo || "/";
      } catch (error) {
        console.error("Failed to decode state:", error);
      }
    }

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.headers.set("Set-Cookie", cookieValue);

    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/auth/login?error=callback_failed", request.url));
  }
}
