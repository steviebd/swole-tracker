import type { WorkOSUser } from '../workos-types';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../workos-types';

/**
 * Session management functions for WorkOS authentication
 * Handles creating, reading, clearing, and validating session cookies
 */

/**
 * Session data structure stored in cookies
 */
export interface WorkOSSession {
  user: WorkOSUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Create a session cookie with user and token data
 * @param user - WorkOS user data
 * @param accessToken - JWT access token
 * @param refreshToken - Optional refresh token
 * @returns Cookie value string containing serialized session data
 */
export function createSessionCookie(
  user: WorkOSUser,
  accessToken: string,
  refreshToken?: string
): string {
  const sessionData: WorkOSSession = {
    user,
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + SESSION_COOKIE_OPTIONS.maxAge * 1000),
  };

  return JSON.stringify(sessionData);
}

/**
 * Parse session data from cookie value
 * @param cookieValue - Raw cookie value string
 * @returns Parsed session data or null if invalid
 */
export function parseSessionCookie(cookieValue: string): WorkOSSession | null {
  try {
    if (!cookieValue || cookieValue.trim() === '') {
      return null;
    }

    const sessionData = JSON.parse(cookieValue) as WorkOSSession;
    
    // Basic validation of required fields
    if (!sessionData.user || !sessionData.accessToken) {
      console.warn('Invalid session data: missing required fields');
      return null;
    }

    // Check if session has expired
    if (sessionData.expiresAt) {
      const expiresAt = new Date(sessionData.expiresAt);
      if (expiresAt < new Date()) {
        console.warn('Session has expired');
        return null;
      }
    }

    return sessionData;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

/**
 * Read session cookie from a request object
 * @param request - Request object with cookies.get method
 * @returns Session data or null if not found/invalid
 */
export function readSessionCookie(request: { 
  cookies: { get: (name: string) => { value?: string } | undefined } 
}): WorkOSSession | null {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    return parseSessionCookie(sessionCookie.value);
  } catch (error) {
    console.error('Failed to read session cookie:', error);
    return null;
  }
}

/**
 * Read session cookie from Next.js headers (for RSC)
 * @returns Session data or null if not found/invalid
 */
export async function readSessionCookieFromHeaders(): Promise<WorkOSSession | null> {
  try {
    // Dynamic import to avoid issues if not in server environment
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    return parseSessionCookie(sessionCookie.value);
  } catch (error) {
    console.error('Failed to read session cookie from headers:', error);
    return null;
  }
}

/**
 * Read session cookie from client-side document.cookie
 * @returns Session data or null if not found/invalid
 */
export function readSessionCookieFromDocument(): WorkOSSession | null {
  try {
    if (typeof document === 'undefined') {
      console.warn('readSessionCookieFromDocument called in non-browser environment');
      return null;
    }

    // Parse document.cookie to find session cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [rawName, ...rest] = cookie.trim().split('=');
      const name = rawName?.trim();
      if (name) {
        const value = rest.join('=');
        acc[name] = value ?? '';
      }
      return acc;
    }, {} as Record<string, string>);

    const sessionCookieValue = cookies[SESSION_COOKIE_NAME];
    if (!sessionCookieValue) {
      return null;
    }

    // Decode and parse the session cookie
    const decodedValue = decodeURIComponent(sessionCookieValue);
    return parseSessionCookie(decodedValue);
  } catch (error) {
    console.error('Failed to read session cookie from document:', error);
    return null;
  }
}

/**
 * Validate a session by checking the access token
 * @param session - Session data to validate
 * @param validateTokenFn - Function to validate the access token
 * @returns User data if valid, null if invalid
 */
export async function validateSession(
  session: WorkOSSession,
  validateTokenFn: (token: string) => Promise<WorkOSUser | null>
): Promise<WorkOSUser | null> {
  try {
    if (!session.accessToken) {
      console.warn('Session validation failed: no access token');
      return null;
    }

    // Use the provided validation function to check if the token is still valid
    return await validateTokenFn(session.accessToken);
  } catch (error) {
    console.error('Session validation failed:', error);
    return null;
  }
}

/**
 * Clear session cookie options for logout
 * @returns Cookie options that will clear the session cookie
 */
export function getClearSessionCookieOptions() {
  return {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0, // Expire immediately
    expires: new Date(0), // Set to past date
  };
}

/**
 * Handle session errors by providing appropriate error responses
 * @param error - The error that occurred
 * @param context - Additional context about where the error occurred
 * @returns Standardized error information
 */
export function handleSessionError(
  error: unknown, 
  context = 'session operation'
): { error: string; shouldClearSession: boolean } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  console.error(`Session error in ${context}:`, {
    error: errorMessage,
    context,
  });

  // Determine if we should clear the session based on the error type
  const shouldClearSession = 
    errorMessage.includes('invalid') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('malformed') ||
    errorMessage.includes('unauthorized');

  return {
    error: `Authentication error: ${errorMessage}`,
    shouldClearSession,
  };
}

// Re-export constants for convenience
export { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../workos-types';