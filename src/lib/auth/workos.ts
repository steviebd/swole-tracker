import { WorkOS } from '@workos-inc/node';
import type { WorkOSUser } from '../workos-types';

/**
 * WorkOS client wrapper for authentication and OAuth flow
 * Provides core WorkOS functionality for authentication
 */

let workos: WorkOS | null = null;

/**
 * Initialize and return WorkOS client
 * @returns WorkOS client instance
 * @throws Error if WorkOS credentials are not configured
 */
export function getWorkOSClient(): WorkOS {
  if (!workos) {
    const apiKey = process.env.WORKOS_API_KEY;
    const clientId = process.env.WORKOS_CLIENT_ID;
    
    if (!apiKey || !clientId) {
      throw new Error('WorkOS credentials not configured');
    }
    
    workos = new WorkOS(apiKey);
  }
  
  return workos;
}

/**
 * Get authorization URL for OAuth flow
 * @param redirectUri - The redirect URI after authorization
 * @param state - Optional state parameter for CSRF protection
 * @param provider - OAuth provider (defaults to 'authkit')
 * @returns Authorization URL string
 * @throws Error if WORKOS_CLIENT_ID is not configured
 */
export function getAuthorizationUrl(
  redirectUri: string, 
  state?: string, 
  provider = 'authkit'
): string {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    provider, // Use the provider parameter
  });

  if (state) {
    params.append('state', state);
  }

  const authUrl = `https://api.workos.com/user_management/authorize?${params.toString()}`;
  
  // Debug logging for troubleshooting
  console.log('WorkOS authorization params:', {
    clientId: clientId.substring(0, 20) + '...',
    redirectUri,
    redirectUriEncoded: encodeURIComponent(redirectUri),
    redirectUriLength: redirectUri.length,
    redirectUriBytes: Buffer.from(redirectUri).toString('hex'),
    authUrl: authUrl.split('?')[0] + '?...',
    fullParams: Object.fromEntries(params.entries()),
  });

  return authUrl;
}

/**
 * Exchange authorization code for access token and user info
 * @param code - Authorization code from OAuth callback
 * @returns Object containing accessToken, refreshToken, and user data
 * @throws Error if token exchange fails
 */
export async function exchangeCodeForToken(code: string) {
  const workos = getWorkOSClient();
  const clientId = process.env.WORKOS_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  try {
    // Debug logging for troubleshooting
    console.log('WorkOS token exchange params:', {
      clientId: clientId.substring(0, 20) + '...',
      codePrefix: code.substring(0, 10) + '...',
    });

    // Exchange code for tokens
    const { accessToken, refreshToken, user } = await workos.userManagement.authenticateWithCode({
      code,
      clientId,
    });

    return {
      accessToken,
      refreshToken,
      user: user as unknown as WorkOSUser,
    };
  } catch (error) {
    console.error('WorkOS token exchange failed:', error);
    throw new Error('Failed to authenticate with WorkOS');
  }
}

/**
 * Get user info from access token
 * @param accessToken - JWT access token
 * @returns User data from WorkOS
 * @throws Error if user retrieval fails
 */
export async function getUserFromToken(accessToken: string): Promise<WorkOSUser> {
  const workos = getWorkOSClient();
  try {
    // Debug logging to see what we're passing
    console.log('getUserFromToken called with:', {
      accessTokenType: typeof accessToken,
      accessTokenValue: accessToken?.toString?.() || String(accessToken),
      accessTokenPrefix: String(accessToken).substring(0, 20) + '...',
    });

    // Decode the JWT to extract the user ID from the 'sub' claim
    const tokenPayload = JSON.parse(Buffer.from(accessToken.split('.')[1]!, 'base64').toString());
    const userId = tokenPayload.sub;
    
    if (!userId) {
      throw new Error('No user ID found in access token');
    }

    console.log('Extracted user ID from token:', userId);

    // Use the user ID to get the user details
    const user = await workos.userManagement.getUser(userId);
    return user as unknown as WorkOSUser;
  } catch (error) {
    console.error('WorkOS get user failed:', error);
    throw new Error('Failed to get user from WorkOS');
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token for renewing access
 * @returns Object containing new accessToken and refreshToken
 * @throws Error if token refresh fails
 */
export async function refreshAccessToken(refreshToken: string) {
  const workos = getWorkOSClient();
  const clientId = process.env.WORKOS_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  try {
    // Use 'any' to avoid SDK type mismatch; the method exists at runtime
    const { accessToken, refreshToken: newRefreshToken } = await (workos as any).userManagement.refreshToken({
      refreshToken,
      clientId,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('WorkOS token refresh failed:', error);
    throw new Error('Failed to refresh WorkOS token');
  }
}

/**
 * Create a logout URL
 * @param redirectUri - Where to redirect after logout
 * @returns Logout URL string
 * @throws Error if WORKOS_CLIENT_ID is not configured
 */
export function getLogoutUrl(redirectUri: string): string {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `https://api.workos.com/user_management/logout?${params.toString()}`;
}

/**
 * Helper to get the base redirect URI for the current environment
 * @param req - Optional request object with headers
 * @returns Base redirect URI string
 * @throws Error if unable to determine base URI
 */
export function getBaseRedirectUri(req?: { headers: Headers }): string {
  let baseUrl = '';
  let source = '';
  
  // In development, use localhost with dynamic port detection
  if (process.env.NODE_ENV === 'development') {
    // Try to get port from headers first, fallback to environment or default
    if (req?.headers) {
      const host = req.headers.get('host');
      if (host) {
        baseUrl = `http://${host}`;
        source = 'dev-headers';
      }
    }
    if (!baseUrl) {
      // Fallback to port from environment or default 3000
      const port = process.env.PORT || '3000';
      baseUrl = `http://localhost:${port}`;
      source = 'dev-port';
    }
  } else {
    // In production, try to get from headers or environment
    if (req?.headers) {
      const host = req.headers.get('host');
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      if (host) {
        baseUrl = `${protocol}://${host}`;
        source = 'prod-headers';
      }
    }
    
    if (!baseUrl) {
      // Fallback to environment variable or error
      const deployUrl = process.env.PRODUCTION_CLOUDFLARE_DOMAIN || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL;
      if (deployUrl) {
        baseUrl = deployUrl.startsWith('http') ? deployUrl : `https://${deployUrl}`;
        source = 'env-var';
      }
    }
  }
  
  console.log('getBaseRedirectUri debug:', {
    baseUrl,
    source,
    nodeEnv: process.env.NODE_ENV,
    headers: req?.headers ? {
      host: req.headers.get('host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
    } : 'no-headers',
    envVars: {
      PRODUCTION_CLOUDFLARE_DOMAIN: process.env.PRODUCTION_CLOUDFLARE_DOMAIN,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    }
  });
  
  if (!baseUrl) {
    throw new Error('Unable to determine base redirect URI');
  }
  
  return baseUrl;
}

// Re-export types for compatibility
export type { WorkOSUser } from '../workos-types';