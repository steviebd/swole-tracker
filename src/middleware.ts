import { NextResponse, type NextRequest } from "next/server";
import { validateAccessToken, SESSION_COOKIE_NAME, type WorkOSUser } from "~/lib/workos";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Get WorkOS session from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  let user: WorkOSUser | null = null;

  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      if (sessionData.accessToken) {
        // Validate the access token with WorkOS
        user = await validateAccessToken(sessionData.accessToken);
      }
    } catch (error) {
      console.error('Failed to parse session cookie:', error);
      // Clear invalid session cookie
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
  }

  // Protected routes that require authentication
  const isProtectedRoute = /^\/workout|^\/templates|^\/workouts/.exec(request.nextUrl.pathname);

  if (isProtectedRoute && !user) {
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
