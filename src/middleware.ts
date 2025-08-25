import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie, handleSessionError, SESSION_COOKIE_NAME } from "~/lib/auth/session";
import { checkUserAuthenticationStatus } from "~/lib/auth/user";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Read and parse session using centralized auth library
  let hasValidSession = false;

  try {
    const session = readSessionCookie(request);
    
    if (session) {
      // Use centralized user authentication status check
      const authStatus = checkUserAuthenticationStatus(session.user);
      hasValidSession = authStatus.isAuthenticated;
    } else {
      // Check if there was an empty cookie that needs clearing
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
      if (sessionCookie?.value && sessionCookie.value.trim() === '') {
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
    }
  } catch (error) {
    // Use centralized error handling
    const { error: errorMessage, shouldClearSession } = handleSessionError(
      error, 
      'middleware session validation'
    );
    
    console.error(errorMessage);
    
    if (shouldClearSession) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    
    hasValidSession = false;
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
