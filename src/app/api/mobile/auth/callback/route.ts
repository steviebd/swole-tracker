import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '~/lib/workos';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json() as { code: string; redirectUri: string };

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing code or redirectUri' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, user } = await exchangeCodeForToken(code, redirectUri);

    // Create session data for mobile
    const sessionData = {
      user,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Mobile auth callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 400 }
    );
  }
}