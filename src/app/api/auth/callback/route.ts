import type { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWorkOS } from "~/lib/workos";
import { SessionCookie } from "~/lib/session-cookie";
import { env } from "~/env";
import { upsertUserFromWorkOS } from "~/server/db/users";

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
      emails?: Array<{ email?: string | null; primary?: boolean | null }> | null;
      firstName?: string | null;
      lastName?: string | null;
      profilePictureUrl?: string | null;
    };

    const primaryEmail =
      workosUser.email ??
      (Array.isArray(workosUser.emails)
        ? workosUser.emails.find((mail) => mail?.primary)?.email ??
          workosUser.emails.find((mail) => Boolean(mail?.email))?.email ??
          null
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

    // Create session with 24 hour expiration
    const session = {
      userId: authResponse.user.id,
      organizationId: authResponse.organizationId ?? undefined,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken ?? null,
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours from now
    };

    // Create response with session cookie
    const cookieValue = await SessionCookie.create(session);

    // Decode state to get redirect URL
    let redirectTo = "/";
    if (state) {
      try {
        const decodedState = JSON.parse(decodeState(state));
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
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_failed", request.url),
    );
  }
}
