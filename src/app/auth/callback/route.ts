import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken, getBaseRedirectUri, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "~/lib/workos";

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
    const baseUrl = getBaseRedirectUri({ headers: request.headers });
    const redirectUri = `${baseUrl}/auth/callback`;
    
    const { accessToken, refreshToken, user } = await exchangeCodeForToken(code, redirectUri);

    // Create session data
    const sessionData = {
      user,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Set session cookie and redirect
    const response = NextResponse.redirect(`${origin}${redirectTo}`);
    response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), SESSION_COOKIE_OPTIONS);

    console.log('Auth callback success:', {
      userId: user.id,
      email: user.email,
      redirectTo,
    });

    // Handle forwarded host for production deployments
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    
    if (!isLocalEnv && forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
    }

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}