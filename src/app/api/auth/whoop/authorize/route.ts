import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import { env } from "~/env";
import { createOAuthState, getClientIp, cleanupUserStates } from "~/lib/oauth-state";

export async function GET(request: NextRequest) {
  try {
    // Check if this is a prefetch request and return early to avoid CORS issues
    const purpose = request.headers.get("Purpose") || request.headers.get("X-Purpose");
    if (purpose === "prefetch" || request.nextUrl.searchParams.has("_rsc")) {
      return new NextResponse(null, { status: 204 });
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Whoop credentials are configured
    if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
      console.log("Missing Whoop credentials - OAuth not available");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=whoop_not_configured`,
      );
    }

    // Clean up any existing states for this user/provider combination
    await cleanupUserStates(user.id, "whoop");

    // Generate secure state parameter with additional validation data
    const redirectUri = `${request.nextUrl.origin}/api/auth/whoop/callback`;
    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    
    const state = await createOAuthState(
      user.id,
      "whoop",
      redirectUri,
      clientIp,
      userAgent,
    );

    // Build OAuth authorization URL
    const authUrl = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
    authUrl.searchParams.append("client_id", env.WHOOP_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline");
    authUrl.searchParams.append("state", state);

    // Redirect to OAuth provider (no cookies needed - state is stored server-side)
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Whoop OAuth authorization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 },
    );
  }
}
