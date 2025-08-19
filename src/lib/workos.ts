import { WorkOS } from '@workos-inc/node';
import type { WorkOSUser } from './workos-types';

/**
 * WorkOS client wrapper for authentication and user management
 * Provides helper functions for user authentication flow
 */

let workos: WorkOS | null = null;

// Initialize WorkOS client
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

// Re-export types for compatibility
export type { WorkOSUser } from './workos-types';

/**
 * Get authorization URL for OAuth flow
 */
export function getAuthorizationUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  });

  if (state) {
    params.append('state', state);
  }

  const authUrl = `https://api.workos.com/user_management/authorize?${params.toString()}`;
  
  // Debug logging for troubleshooting
  console.log('WorkOS authorization params:', {
    clientId: clientId.substring(0, 20) + '...',
    redirectUri,
    authUrl: authUrl.split('?')[0] + '?...',
  });

  return authUrl;
}

/**
 * Exchange authorization code for access token and user info
 */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const workos = getWorkOSClient();
  const clientId = process.env.WORKOS_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID not configured');
  }

  try {
    // Debug logging for troubleshooting
    console.log('WorkOS token exchange params:', {
      clientId: clientId.substring(0, 20) + '...',
      redirectUri,
      codePrefix: code.substring(0, 10) + '...',
    });

    // Exchange code for tokens
    const { accessToken, refreshToken, user } = await workos.userManagement.authenticateWithCode({
      code,
      clientId,
      redirectUri, // This is required and must match the one used in authorization
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
 */
export async function getUserFromToken(accessToken: string): Promise<WorkOSUser> {
  const workos = getWorkOSClient();
  try {
    // Use 'any' to call SDK with accessToken without strict type coupling
    const user = await (workos as any).userManagement.getUser({ accessToken });
    return user as unknown as WorkOSUser;
  } catch (error) {
    console.error('WorkOS get user failed:', error);
    throw new Error('Failed to get user from WorkOS');
  }
}

/**
 * Refresh access token using refresh token
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
 * Validate and decode access token (for middleware use)
 */
export async function validateAccessToken(accessToken: string): Promise<WorkOSUser | null> {
  try {
    const user = await getUserFromToken(accessToken);
    return user;
  } catch (error) {
    console.error('Access token validation failed:', error);
    return null;
  }
}

/**
 * Helper to get the base redirect URI for the current environment
 */
export function getBaseRedirectUri(req?: { headers: Headers }): string {
  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // In production, try to get from headers or environment
  if (req?.headers) {
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      return `${protocol}://${host}`;
    }
  }
  
  // Fallback to environment variable or error
  const deployUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (deployUrl) {
    return deployUrl.startsWith('http') ? deployUrl : `https://${deployUrl}`;
  }
  
  throw new Error('Unable to determine base redirect URI');
}

/**
 * Types for session management
 */
export interface WorkOSSession {
  user: WorkOSUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// Re-export constants for compatibility
export { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from './workos-types';
