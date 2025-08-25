import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken, getBaseRedirectUri } from "~/lib/auth/workos";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "~/lib/auth/session";

// Runtime configuration handled by OpenNext

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const origin = requestUrl.origin;

  if (!code) {
    console.error('Auth callback: No authorization code provided');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  try {
    // Parse state parameter to get redirect destination
    let redirectTo = "/";
    if (state) {
      try {
        const stateData = JSON.parse(state);
        redirectTo = stateData.redirectTo || "/";
      } catch (error) {
        console.warn('Auth callback: Failed to parse state parameter:', error);
      }
    }

    // Exchange authorization code for access token
    const { accessToken, refreshToken, user } = await exchangeCodeForToken(code);

    // Create session cookie data using centralized function
    const sessionCookieValue = createSessionCookie(user, accessToken, refreshToken);

    // Debug logging to see what we're storing
    console.log('Storing session data:', {
      hasUser: !!user,
      hasAccessToken: !!accessToken,
      accessTokenType: typeof accessToken,
      accessTokenPrefix: String(accessToken).substring(0, 20) + '...',
    });

    console.log('Auth callback success:', {
      userId: user.id,
      email: user.email,
      redirectTo,
    });

    // Handle forwarded host for production deployments
    const forwardedHost = request.headers.get("x-forwarded-host");
    const xForwardedProto = request.headers.get("x-forwarded-proto");
    const isLocalEnv = process.env.NODE_ENV === "development";
    const isWranglerDev = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    console.log('Auth callback redirect logic:', {
      origin,
      forwardedHost,
      xForwardedProto,
      isLocalEnv,
      isWranglerDev,
      redirectTo,
    });
    
    let finalRedirectUrl = `${origin}${redirectTo}`;
    
    // Only use forwardedHost logic for true production deployments (not wrangler dev)
    if (!isLocalEnv && !isWranglerDev && forwardedHost) {
      // Use the same protocol detection logic as getBaseRedirectUri
      const protocol = xForwardedProto || 'https';
      finalRedirectUrl = `${protocol}://${forwardedHost}${redirectTo}`;
      console.log('Using forwarded host redirect:', finalRedirectUrl);
    } else if (isWranglerDev && xForwardedProto === 'http') {
      // For wrangler dev, construct URL with correct HTTP protocol
      const host = forwardedHost || origin.replace(/^https?:\/\//, '');
      finalRedirectUrl = `http://${host}${redirectTo}`;
      console.log('Using wrangler dev HTTP redirect:', finalRedirectUrl);
    } else {
      console.log('Using origin-based redirect:', finalRedirectUrl);
    }

    // Set session cookie and redirect
    const response = NextResponse.redirect(finalRedirectUrl);
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookieValue, SESSION_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}