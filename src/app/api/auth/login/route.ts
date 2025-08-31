import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use the environment-configured redirect URI
    const redirectUri = process.env.WORKOS_REDIRECT_URI;
    
    if (!redirectUri) {
      throw new Error('WORKOS_REDIRECT_URI environment variable is not set');
    }
    
    const signInUrl = await getSignInUrl({ 
      redirectUri
    });
    
    // Redirect directly to the WorkOS sign-in URL
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Error getting sign-in URL:', error);
    return NextResponse.json({ error: 'Failed to get sign-in URL' }, { status: 500 });
  }
}

// Handle POST requests as well (in case forms submit to this endpoint)
export async function POST() {
  return GET();
}