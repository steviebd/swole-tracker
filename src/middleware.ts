import { NextResponse, type NextRequest } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { getWorkOS } from "~/lib/workos";
import { env } from "~/env";

export async function middleware(request: NextRequest) {
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
      return NextResponse.redirect(redirectUrl);
    }

    // Check if session is expired or close to expiring (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const isExpired = session.expiresAt <= now;
    const shouldRefresh = session.expiresAt <= now + 300; // 5 minutes buffer

    if (isExpired || shouldRefresh) {
      if (!session.refreshToken) {
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        const response = NextResponse.redirect(redirectUrl);
        response.headers.set("Set-Cookie", SessionCookie.destroy());
        return response;
      }

      try {
        // Attempt to refresh the session using WorkOS
        const workos = getWorkOS();
        const refreshedSession =
          await workos.userManagement.authenticateWithRefreshToken({
            refreshToken: session.refreshToken,
            clientId: env.WORKOS_CLIENT_ID!,
          });

        // Create new session with refreshed tokens
        // WorkOS tokens typically last 1 hour, refresh tokens longer
        const accessTokenExpiry = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now
        const newSession = {
          userId: refreshedSession.user.id,
          organizationId: refreshedSession.organizationId,
          accessToken: refreshedSession.accessToken,
          refreshToken: refreshedSession.refreshToken,
          expiresAt: accessTokenExpiry,
        };

        // Create response with new session cookie
        const response = NextResponse.next();
        response.headers.set(
          "Set-Cookie",
          await SessionCookie.create(newSession),
        );
        return response;
      } catch (error) {
        // Refresh failed, redirect to login and clear cookie
        console.error("Failed to refresh WorkOS session:", error);
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        const response = NextResponse.redirect(redirectUrl);
        response.headers.set("Set-Cookie", SessionCookie.destroy());
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
