import { type NextRequest, NextResponse } from 'next/server';
import { getBaseRedirectUri } from '~/lib/auth/workos';
import { getClearSessionCookieOptions, SESSION_COOKIE_NAME } from '~/lib/auth/session';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    
    const baseUrl = getBaseRedirectUri({ headers: request.headers });
    const redirectUri = `${baseUrl}${redirectTo}`;
    
    // Clear the session cookie
    const response = NextResponse.redirect(redirectUri);
    response.cookies.set(SESSION_COOKIE_NAME, '', getClearSessionCookieOptions());
    
    return response;
  } catch (error) {
    console.error('Logout route error:', error);
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.redirect('/');
    response.cookies.set(SESSION_COOKIE_NAME, '', getClearSessionCookieOptions());
    
    return response;
  }
}

export async function POST(request: NextRequest) {
  // Support POST requests for logout as well
  return GET(request);
}