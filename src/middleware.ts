import { NextResponse, type NextRequest } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
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

  // Check if user has a valid session
  const session = await SessionCookie.get(request);

  // Protected routes that require authentication
  const isProtectedRoute = /^\/workout|^\/templates|^\/workouts/.exec(
    request.nextUrl.pathname,
  );

  if (isProtectedRoute) {
    if (!session) {
      // No session, redirect to login
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return apply(NextResponse.redirect(redirectUrl));
    }

    // Check if session is expired or close to expiring (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry =
      session.accessTokenExpiresAt ?? session.expiresAt;
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
        const updatedSession = {
          userId: refreshedSession.user.id,
          organizationId: refreshedSession.organizationId,
          accessToken: refreshedSession.accessToken,
          refreshToken: refreshedSession.refreshToken ?? null,
          accessTokenExpiresAt: newAccessTokenExpiry,
          sessionExpiresAt: newSessionExpiry,
          expiresAt: newAccessTokenExpiry,
        };

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
