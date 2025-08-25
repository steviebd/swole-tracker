import { type NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '~/lib/auth/workos';
import { type WorkOSSession } from '~/lib/auth/session';


export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json() as { code: string };

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, user } = await exchangeCodeForToken(code);

    // Create session data for mobile using the standard session structure
    const sessionData: WorkOSSession = {
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