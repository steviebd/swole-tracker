import { type NextRequest, NextResponse } from 'next/server';
import { getLogoutUrl, getBaseRedirectUri, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '~/lib/workos';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    
    const baseUrl = getBaseRedirectUri({ headers: request.headers });
    const redirectUri = `${baseUrl}${redirectTo}`;
    
    // Clear the session cookie
    const response = NextResponse.redirect(redirectUri);
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...SESSION_COOKIE_OPTIONS,
      expires: new Date(0),
    });
    
    return response;
  } catch (error) {
    console.error('Logout route error:', error);
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.redirect('/');
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...SESSION_COOKIE_OPTIONS,
      expires: new Date(0),
    });
    
    return response;
  }
}

export async function POST(request: NextRequest) {
  // Support POST requests for logout as well
  return GET(request);
}