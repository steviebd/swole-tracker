import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import type * as oauth from "oauth4webapi";
import { db } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?error=unauthorized`);
    }

    const { searchParams } = request.nextUrl;
    const error = searchParams.get("error");

    // Check for OAuth error
    if (error) {
      return NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?error=${error}`);
    }

    // Verify state parameter
    const state = searchParams.get("state");
    const storedState = request.cookies.get("whoop_oauth_state")?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?error=invalid_state`);
    }

    // Exchange authorization code for access token
    const authorizationServer: oauth.AuthorizationServer = {
      issuer: "https://api.prod.whoop.com",
      authorization_endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
      token_endpoint: "https://api.prod.whoop.com/oauth/oauth2/token",
    };

    const redirectUri = `${request.nextUrl.origin}/api/auth/whoop/callback`;
    
    // Get the authorization code (we already validated state)
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?error=no_code`);
    }

    console.log("Token exchange attempt:", {
      redirectUri,
      clientId: env.WHOOP_CLIENT_ID!.substring(0, 8) + "...",
    });

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
        "Accept": "application/json",
      },
      body: new URLSearchParams(tokenRequest).toString(),
    });

    console.log("Token response status:", tokenResponse.status);
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange error response:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
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

    console.log("Tokens received:", {
      hasAccessToken: !!tok.access_token,
      hasRefreshToken: !!tok.refresh_token,
      expiresIn: tok.expires_in,
      scope: tok.scope,
    });

    // Calculate expires_at
    const expiresAt = tok.expires_in 
      ? new Date(Date.now() + tok.expires_in * 1000)
      : null;

    // Store tokens in database (upsert pattern)
    const existingIntegration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop")
        )
      );

    if (existingIntegration.length > 0) {
      await db
        .update(userIntegrations)
        .set({
          accessToken: tok.access_token!,
          refreshToken: tok.refresh_token ?? null,
          expiresAt,
          scope: tok.scope ?? "read:workout offline",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userIntegrations.user_id, user.id),
            eq(userIntegrations.provider, "whoop")
          )
        );
    } else {
      await db.insert(userIntegrations).values({
        user_id: user.id,
        provider: "whoop",
        accessToken: tok.access_token!,
        refreshToken: tok.refresh_token ?? null,
        expiresAt,
        scope: tok.scope ?? "read:workout offline",
        isActive: true,
      });
    }

    // Clear state cookie and redirect to success page
    const response = NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?success=true`);
    response.cookies.delete("whoop_oauth_state");
    
    return response;
  } catch (error) {
    console.error("Whoop OAuth callback error:", error);
    return NextResponse.redirect(`${request.nextUrl.origin}/connect-whoop?error=token_exchange_failed`);
  }
}
