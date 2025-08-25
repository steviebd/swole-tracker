import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.WORKOS_CLIENT_ID;
    const apiKey = process.env.WORKOS_API_KEY;
    
    if (!clientId || !apiKey) {
      return NextResponse.json({
        error: 'WorkOS credentials not configured',
        hasClientId: !!clientId,
        hasApiKey: !!apiKey,
      }, { status: 500 });
    }

    // Test the WorkOS connection by attempting to fetch organization info
    const response = await fetch(`https://api.workos.com/user_management/organizations?limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('WorkOS API test response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500),
    });

    if (!response.ok) {
      return NextResponse.json({
        error: 'WorkOS API connection failed',
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        clientIdPrefix: clientId.substring(0, 15) + '...',
      }, { status: response.status });
    }

    // Test authorization URL generation
    const testRedirectUri = 'https://workout.stevenduong.com/auth/callback';
    const testAuthUrl = `https://api.workos.com/user_management/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: testRedirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      provider: 'GoogleOAuth',
      state: JSON.stringify({ test: true, timestamp: Date.now() }),
    }).toString()}`;

    return NextResponse.json({
      success: true,
      clientIdPrefix: clientId.substring(0, 15) + '...',
      testRedirectUri,
      testAuthUrl: testAuthUrl.substring(0, 200) + '...',
      apiResponse: JSON.parse(responseText),
    });

  } catch (error) {
    console.error('WorkOS test error:', error);
    return NextResponse.json({
      error: 'WorkOS test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}