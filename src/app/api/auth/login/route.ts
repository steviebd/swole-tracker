import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, getBaseRedirectUri } from '~/lib/workos';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    const provider = searchParams.get('provider') || 'authkit'; // Default to email/password
    
    // Validate environment variables
    const clientId = process.env.WORKOS_CLIENT_ID;
    const apiKey = process.env.WORKOS_API_KEY;
    
    console.log('Login route - Environment check:', {
      hasClientId: !!clientId,
      hasApiKey: !!apiKey,
      clientIdPrefix: clientId?.substring(0, 10),
      nodeEnv: process.env.NODE_ENV,
      provider,
    });
    
    // Generate state parameter to prevent CSRF
    const state = JSON.stringify({
      redirectTo,
      timestamp: Date.now(),
    });
    
    const baseUrl = getBaseRedirectUri({ headers: request.headers });
    const redirectUri = `${baseUrl}/auth/callback`;
    
    console.log('Login route - Generating auth URL:', {
      baseUrl,
      redirectUri,
      state: state.substring(0, 50) + '...',
      provider,
    });
    
    const authUrl = getAuthorizationUrl(redirectUri, state, provider);
    
    console.log('Login route - Redirecting to:', authUrl.substring(0, 100) + '...');
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}