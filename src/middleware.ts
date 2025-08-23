import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "~/lib/workos-types";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Get WorkOS session from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  let hasValidSession = false;

  if (sessionCookie) {
    try {
      // Check if the cookie value is empty or only whitespace
      if (!sessionCookie.value || sessionCookie.value.trim() === '') {
        console.warn('Empty session cookie found, clearing it');
        response.cookies.delete(SESSION_COOKIE_NAME);
      } else {
        const sessionData = JSON.parse(sessionCookie.value);
        // Simple check for access token presence (we'll validate it in API routes)
        hasValidSession = !!(sessionData.accessToken && sessionData.user);
      }
    } catch (error) {
      console.error('Failed to parse session cookie:', {
        error: error instanceof Error ? error.message : String(error),
        cookieValue: sessionCookie.value?.substring(0, 100) + '...' // Log first 100 chars for debugging
      });
      // Clear invalid session cookie
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
  }

  // Protected routes that require authentication
  const isProtectedRoute = /^\/workout|^\/templates|^\/workouts/.exec(request.nextUrl.pathname);

  if (isProtectedRoute && !hasValidSession) {
    // Redirect to login page
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
