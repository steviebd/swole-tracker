import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, getBaseRedirectUri } from '~/lib/workos';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    
    // Generate state parameter to prevent CSRF
    const state = JSON.stringify({
      redirectTo,
      timestamp: Date.now(),
    });
    
    const baseUrl = getBaseRedirectUri({ headers: request.headers });
    const redirectUri = `${baseUrl}/auth/callback`;
    
    const authUrl = getAuthorizationUrl(redirectUri, state);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}