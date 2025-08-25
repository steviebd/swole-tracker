import { type NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '~/lib/auth/workos';


export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json() as { refreshToken: string };

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Missing refresh token' },
        { status: 400 }
      );
    }

    // Refresh the access token
    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(refreshToken);

    // Return updated session data
    const sessionData = {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Mobile token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 401 }
    );
  }
}