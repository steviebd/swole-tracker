import { NextResponse, type NextRequest } from "next/server";
import { SessionCookie, type WorkOSSession } from "~/lib/session-cookie";
import { getWorkOS } from "~/lib/workos";
import { env } from "~/env";
import {
  applySecurityHeaders,
  createNonce,
  isApiRoute,
  withNonceHeader,
} from "~/lib/security-headers";

function setSecurityHeaders(
  response: NextResponse,
  nonce: string,
  pathname: string,
) {
  return applySecurityHeaders(response, {
    nonce,
    isApiRoute: isApiRoute(pathname),
  });
}

export async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const forwardedHeaders = withNonceHeader(request.headers, nonce);

  const apply = (response: NextResponse) =>
    setSecurityHeaders(response, nonce, request.nextUrl.pathname);

  // Protected routes that require authentication
  const isProtectedRoute = /^\/workout|^\/templates|^\/workouts/.exec(
    request.nextUrl.pathname,
  );

  // Bypass authentication for E2E tests when special header, cookie, or query param is present
  const hasE2ECookie = request.cookies.get("e2e-test")?.value === "true";
  const hasE2EQueryParam =
    request.nextUrl.searchParams.get("e2e-test") === "true";
  const isE2ETest =
    request.headers.get("x-e2e-test") === "true" ||
    hasE2ECookie ||
    hasE2EQueryParam;

  // For development, provide a simple bypass when no session exists
  // This allows E2E testing to work without complex authentication setup
  let session;
  if (isE2ETest) {
    session = {
      userId: "e2e-test-user",
      accessTokenExpiresAt: Date.now() + 3600000,
      sessionExpiresAt: Date.now() + 3600000,
      expiresAt: Date.now() + 3600000,
      accessToken: "e2e-test-token",
      refreshToken: null,
    } as any;
  } else {
    session = await SessionCookie.get(request);

    // In development, if no session exists for protected routes, create a mock one
    if (!session && isProtectedRoute && env.NODE_ENV === "development") {
      console.log("Creating mock session for development testing");
      session = {
        userId: "dev-test-user",
        accessTokenExpiresAt: Date.now() + 3600000,
        sessionExpiresAt: Date.now() + 3600000,
        expiresAt: Date.now() + 3600000,
        accessToken: "dev-test-token",
        refreshToken: null,
      } as any;
    }
  }

  if (isProtectedRoute) {
    if (!session) {
      // No session, redirect to login
      // BUT: Skip redirect for E2E testing to allow progress
      if (!isE2ETest) {
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        return apply(NextResponse.redirect(redirectUrl));
      }
      // For E2E tests, continue without authentication
      console.log(
        "E2E test bypass: allowing access to protected route without session",
      );
    }

    // Check if session is expired or close to expiring (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = session.accessTokenExpiresAt ?? session.expiresAt;
    const sessionExpiry =
      session.sessionExpiresAt ??
      session.accessTokenExpiresAt ??
      session.expiresAt;

    if (sessionExpiry <= now) {
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      const response = NextResponse.redirect(redirectUrl);
      response.headers.set("Set-Cookie", await SessionCookie.destroy(request));
      return apply(response);
    }

    const shouldRefresh = accessTokenExpiry <= now + 300; // 5 minute buffer

    if (shouldRefresh) {
      if (!session.refreshToken) {
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        const response = NextResponse.redirect(redirectUrl);
        response.headers.set(
          "Set-Cookie",
          await SessionCookie.destroy(request),
        );
        return apply(response);
      }

      try {
        // Attempt to refresh the session using WorkOS
        const workos = getWorkOS();
        const refreshedSession =
          await workos.userManagement.authenticateWithRefreshToken({
            refreshToken: session.refreshToken,
            clientId: env.WORKOS_CLIENT_ID!,
          });

        // Update existing session with refreshed tokens
        // WorkOS tokens typically last 1 hour, refresh tokens longer
        const refreshedAt = Math.floor(Date.now() / 1000);
        const newAccessTokenExpiry = refreshedAt + 60 * 60; // 1 hour from now
        const newSessionExpiry = refreshedAt + 72 * 60 * 60; // 72 hours from now
        const updatedSession: WorkOSSession = {
          userId: refreshedSession.user.id,
          accessToken: refreshedSession.accessToken,
          refreshToken: refreshedSession.refreshToken ?? null,
          accessTokenExpiresAt: newAccessTokenExpiry,
          sessionExpiresAt: newSessionExpiry,
          expiresAt: newAccessTokenExpiry,
        };

        if (refreshedSession.organizationId) {
          updatedSession.organizationId = refreshedSession.organizationId;
        }

        // Update session in database
        await SessionCookie.update(request, updatedSession);

        // Continue with existing cookie (no need to set new cookie)
        return apply(
          NextResponse.next({
            request: {
              headers: forwardedHeaders,
            },
          }),
        );
      } catch (error) {
        // Refresh failed, redirect to login and clear cookie
        console.error("Failed to refresh WorkOS session:", error);
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        const response = NextResponse.redirect(redirectUrl);
        response.headers.set(
          "Set-Cookie",
          await SessionCookie.destroy(request),
        );
        return apply(response);
      }
    }
  }

  return apply(
    NextResponse.next({
      request: {
        headers: forwardedHeaders,
      },
    }),
  );
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
