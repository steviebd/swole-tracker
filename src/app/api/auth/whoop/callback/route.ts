import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import type * as oauth from "oauth4webapi";
import { db } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "~/env";
import { validateOAuthState, getClientIp } from "~/lib/oauth-state";
import { encryptToken } from "~/lib/encryption";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const session = await SessionCookie.get(request);
    if (!session || SessionCookie.isExpired(session)) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=unauthorized`,
      );
    }

    const { searchParams } = request.nextUrl;
    const error = searchParams.get("error");

    // Check for OAuth error
    if (error) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=${error}`,
      );
    }

    // Verify state parameter with enhanced security checks
    const state = searchParams.get("state");
    if (!state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=missing_state`,
      );
    }

    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const stateValidation = await validateOAuthState(
      state,
      session.userId,
      "whoop",
      clientIp,
      userAgent,
    );

    if (!stateValidation.isValid) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=invalid_state`,
      );
    }

    // Exchange authorization code for access token
    const authorizationServer: oauth.AuthorizationServer = {
      issuer: "https://api.prod.whoop.com",
      authorization_endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
      token_endpoint: "https://api.prod.whoop.com/oauth/oauth2/token",
    };

    const redirectUri =
      env.WHOOP_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/auth/whoop/callback`;

    // Get the authorization code (we already validated state)
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/connect-whoop?error=no_code`,
      );
    }

    // Make token exchange request directly to avoid oauth4webapi validation issues
    const tokenRequest = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: env.WHOOP_CLIENT_ID!,
      client_secret: env.WHOOP_CLIENT_SECRET!,
    };

    const tokenResponse = await fetch(authorizationServer.token_endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(tokenRequest).toString(),
    });

    if (!tokenResponse.ok) {
      // Log error without exposing sensitive request details
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
      });
      throw new Error(
        `Token exchange failed: ${tokenResponse.status} - ${tokenResponse.statusText}`,
      );
    }

    const tokens: unknown = await tokenResponse.json();

    if (typeof tokens !== "object" || tokens === null) {
      throw new Error("Token response was not an object");
    }

    const tok = tokens as {
      access_token?: string;
      refresh_token?: string | null;
      expires_in?: number;
      scope?: string;
    };

    // Log token receipt without exposing actual tokens
    if (process.env.NODE_ENV === "development") {
      console.log("OAuth tokens received:", {
        hasAccessToken: !!tok.access_token,
        hasRefreshToken: !!tok.refresh_token,
        expiresIn: tok.expires_in,
        scope: tok.scope,
      });
    }

    // Calculate expires_at
    const expiresAt = tok.expires_in
      ? new Date(Date.now() + tok.expires_in * 1000)
      : null;

    // Encrypt tokens before storing in database
    const encryptedAccessToken = await encryptToken(tok.access_token!);
    const encryptedRefreshToken = tok.refresh_token
      ? await encryptToken(tok.refresh_token)
      : null;

    // Store encrypted tokens in database (upsert pattern)
    const existingIntegration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, session.userId),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

    if (existingIntegration.length > 0) {
      await db
        .update(userIntegrations)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt,
          scope:
            tok.scope ??
            "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userIntegrations.user_id, session.userId),
            eq(userIntegrations.provider, "whoop"),
          ),
        );
    } else {
      await db.insert(userIntegrations).values({
        user_id: session.userId,
        provider: "whoop",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt,
        scope:
          tok.scope ??
          "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline",
        isActive: true,
      });
    }

    // Note: Automatic sync removed - sync endpoint requires browser session
    // User will need to manually trigger sync after OAuth completion

    // State is already cleaned up by validateOAuthState, redirect to success page
    return NextResponse.redirect(
      `${request.nextUrl.origin}/connect-whoop?success=true`,
    );
  } catch (error) {
    console.error("Whoop OAuth callback error:", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/connect-whoop?error=token_exchange_failed`,
    );
  }
}
