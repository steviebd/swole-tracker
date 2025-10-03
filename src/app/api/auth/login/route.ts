import { NextRequest, NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirectTo") || "/";

    if (!env.WORKOS_CLIENT_ID) {
      console.error("WORKOS_CLIENT_ID not configured");
      return NextResponse.json({ error: "Authentication not configured" }, { status: 500 });
    }

    const workos = getWorkOS();

    // Get authorization URL
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "GoogleOAuth", // Use GoogleOAuth for Google SSO
      redirectUri: env.WORKOS_REDIRECT_URI || `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      clientId: env.WORKOS_CLIENT_ID!, // We already checked it's defined
      state: Buffer.from(JSON.stringify({ redirectTo })).toString('base64'),
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to initiate login" }, { status: 500 });
  }
}
