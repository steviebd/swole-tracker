/**
 * WorkOS types and constants for client-side usage
 * Separated from server-side WorkOS SDK to avoid Node.js dependencies on client
 */

/**
 * WorkOS user type based on their API response
 */
export interface WorkOSUser {
  object: 'user';
  id: string;
  email: string;
  email_verified: boolean;
  profile_picture_url?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_NAME = 'workos-session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: false, // Allow client-side access for AuthProvider
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};