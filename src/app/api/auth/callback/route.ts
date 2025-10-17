import type { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { SessionCookie } from "~/lib/session-cookie";
import { env } from "~/env";
import { upsertUserFromWorkOS } from "~/server/db/users";
import { validateOAuthState, getClientIp } from "~/lib/oauth-state";
import { createDb, getD1Binding } from "~/server/db";

export const runtime = "nodejs";

function decodeState(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }

  const bufferCtor = (globalThis as unknown as { Buffer?: typeof Buffer })
    .Buffer;
  if (bufferCtor) {
    return bufferCtor.from(value, "base64").toString("utf-8");
  }

  throw new Error("Base64 decoder is not available in this runtime");
}

export async function GET(request: NextRequest) {
  const db = createDb(getD1Binding());

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      console.error("Missing authorization code");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url),
      );
    }

    if (!env.WORKOS_CLIENT_ID) {
      console.error("WORKOS_CLIENT_ID not configured");
      return NextResponse.redirect(
        new URL("/auth/login?error=misconfigured", request.url),
      );
    }

    // Validate CSRF state
    let redirectTo = "/";
    let csrfNonce: string | undefined;
    let oauthState: string | undefined;

    if (state) {
      try {
        const decodedState = JSON.parse(decodeState(state));
        redirectTo = decodedState.redirectTo || "/";
        csrfNonce = decodedState.csrfNonce;
        oauthState = decodedState.oauthState;
      } catch (error) {
        console.error("Failed to decode state:", error);
        return NextResponse.redirect(
          new URL("/auth/login?error=invalid_state", request.url),
        );
      }
    }

    if (!csrfNonce || !oauthState) {
      console.error("Missing CSRF nonce or OAuth state");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_csrf", request.url),
      );
    }

    const clientIp = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || "";

    // Validate CSRF nonce (using anonymous user pattern)
    const stateValidation = await validateOAuthState(
      db,
      oauthState,
      `anonymous_${csrfNonce}`, // Use original nonce as anonymous user ID
      "workos",
      clientIp,
      userAgent,
    );

    if (!stateValidation.isValid) {
      console.error("CSRF validation failed");
      return NextResponse.redirect(
        new URL("/auth/login?error=csrf_failed", request.url),
      );
    }

    const workos = getWorkOS();

    // Exchange code for tokens
    const authResponse = await workos.userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
    });

    // Persist the user in the application database so downstream features have access
    const workosUser = authResponse.user as {
      id: string;
      email?: string | null;
      emails?: Array<{
        email?: string | null;
        primary?: boolean | null;
      }> | null;
      firstName?: string | null;
      lastName?: string | null;
      profilePictureUrl?: string | null;
    };

    const primaryEmail =
      workosUser.email ??
      (Array.isArray(workosUser.emails)
        ? (workosUser.emails.find((mail) => mail?.primary)?.email ??
          workosUser.emails.find((mail) => Boolean(mail?.email))?.email ??
          null)
        : null);

    try {
      await upsertUserFromWorkOS({
        id: workosUser.id,
        email: primaryEmail,
        firstName: workosUser.firstName,
        lastName: workosUser.lastName,
        profilePictureUrl: workosUser.profilePictureUrl,
      });
    } catch (dbError) {
      console.error("Failed to upsert user after WorkOS callback:", dbError);
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const accessTokenExpiresAt =
      authResponse.oauthTokens?.expiresAt ?? nowInSeconds + 60 * 60; // fallback: 1 hour
    const sessionExpiresAt = nowInSeconds + 72 * 60 * 60; // 72 hours from now

    const session = {
      userId: authResponse.user.id,
      organizationId: authResponse.organizationId ?? undefined,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken ?? null,
      accessTokenExpiresAt,
      sessionExpiresAt,
      expiresAt: accessTokenExpiresAt,
    };

    // Create response with session cookie
    const cookieValue = await SessionCookie.create(session);

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.headers.set("Set-Cookie", cookieValue);

    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_failed", request.url),
    );
  }
}
