import { type NextRequest, NextResponse } from "next/server";
import { validateAccessToken, SESSION_COOKIE_NAME } from "~/lib/workos";
import { env } from "~/env";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Check if this is a prefetch request and return early to avoid CORS issues
    const purpose = request.headers.get("Purpose") || request.headers.get("X-Purpose");
    if (purpose === "prefetch" || request.nextUrl.searchParams.has("_rsc")) {
      return new NextResponse(null, { status: 204 });
    }
    
    // Get user from WorkOS session
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await validateAccessToken(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Whoop credentials are configured
    if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
      console.log("Missing Whoop credentials:", {
        hasClientId: !!env.WHOOP_CLIENT_ID,
        hasClientSecret: !!env.WHOOP_CLIENT_SECRET,
      });
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=whoop_not_configured`,
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session/cookie for verification later
    const authUrl = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
    authUrl.searchParams.append("client_id", env.WHOOP_CLIENT_ID);
    authUrl.searchParams.append(
      "redirect_uri",
      `${request.nextUrl.origin}/api/auth/whoop/callback`,
    );
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline");
    authUrl.searchParams.append("state", state);

    // Debug logging
    console.log("Whoop OAuth URL:", {
      client_id: env.WHOOP_CLIENT_ID?.substring(0, 8) + "...", // Only show first 8 chars for security
      redirect_uri: `${request.nextUrl.origin}/api/auth/whoop/callback`,
      full_url: authUrl.toString(),
    });

    // Create response and set state cookie
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set("whoop_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Whoop OAuth authorization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 },
    );
  }
}
