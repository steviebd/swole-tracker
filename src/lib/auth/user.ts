import type { WorkOSUser } from '../workos-types';
import { SESSION_COOKIE_NAME } from '../workos-types';
import { getUserFromToken } from './workos';

/**
 * User management functions for WorkOS authentication
 * Handles user retrieval, validation, and secure data handling
 */

// Simple memory cache for user validation to reduce API calls
const userCache = new Map<string, { user: WorkOSUser; expires: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Validate and decode access token with caching
 * @param accessToken - JWT access token to validate
 * @returns User data if valid, null if invalid
 */
export async function validateAccessToken(accessToken: string): Promise<WorkOSUser | null> {
  try {
    // Check cache first
    const cached = userCache.get(accessToken);
    if (cached && cached.expires > Date.now()) {
      console.log('Using cached user data');
      return cached.user;
    }

    const user = await getUserFromToken(accessToken);
    
    // Cache the result
    if (user) {
      userCache.set(accessToken, {
        user,
        expires: Date.now() + CACHE_DURATION
      });
      
      // Clean up expired entries periodically
      if (userCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of userCache.entries()) {
          if (value.expires < now) {
            userCache.delete(key);
          }
        }
      }
    }
    
    return user;
  } catch (error) {
    console.error('Access token validation failed:', error);
    return null;
  }
}

/**
 * Extract authenticated user from NextRequest (for API routes)
 * @param request - Request object with cookies.get method
 * @returns User data if authenticated, null otherwise
 */
export async function getUserFromRequest(request: { 
  cookies: { get: (name: string) => { value?: string } | undefined } 
}): Promise<WorkOSUser | null> {
  let sessionCookie: { value?: string } | undefined;
  try {
    sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value || sessionCookie.value.trim() === '') {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    if (!sessionData.accessToken) {
      return null;
    }

    return await validateAccessToken(sessionData.accessToken);
  } catch (error) {
    console.error('Failed to get user from request:', {
      error: error instanceof Error ? error.message : String(error),
      cookieValue: sessionCookie?.value?.substring(0, 100) + '...'
    });
    return null;
  }
}

/**
 * Get authenticated user in React Server Components (RSC)
 * This reads cookies from the dynamic headers() API in Next.js
 * @returns User data if authenticated, null otherwise
 */
export async function getUserFromHeaders(): Promise<WorkOSUser | null> {
  let sessionCookie: { value?: string } | undefined;
  try {
    // Dynamic import to avoid issues if not in server environment
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value || sessionCookie.value.trim() === '') {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    if (!sessionData.accessToken) {
      return null;
    }

    return await validateAccessToken(sessionData.accessToken);
  } catch (error) {
    console.error('Failed to get user from headers:', {
      error: error instanceof Error ? error.message : String(error),
      cookieValue: sessionCookie?.value?.substring(0, 100) + '...'
    });
    return null;
  }
}

/**
 * Validate user data structure and ensure required fields are present
 * @param user - User object to validate
 * @returns true if valid, false otherwise
 */
export function validateUserData(user: any): user is WorkOSUser {
  if (!user || typeof user !== 'object') {
    return false;
  }

  // Check required fields
  const requiredFields = ['id', 'email', 'object'] as const;
  for (const field of requiredFields) {
    if (!user[field] || typeof user[field] !== 'string') {
      console.warn(`Invalid user data: missing or invalid field '${field}'`);
      return false;
    }
  }

  // Validate object type
  if (user.object !== 'user') {
    console.warn('Invalid user data: incorrect object type');
    return false;
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    console.warn('Invalid user data: invalid email format');
    return false;
  }

  return true;
}

/**
 * Securely sanitize user data for client-side use
 * Removes sensitive information that shouldn't be exposed to the client
 * @param user - User data to sanitize
 * @returns Sanitized user data safe for client-side use
 */
export function sanitizeUserData(user: WorkOSUser): WorkOSUser {
  // For WorkOS users, all fields are generally safe for client-side use
  // But we create a new object to avoid any potential mutations
  return {
    object: user.object,
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
    profile_picture_url: user.profile_picture_url,
    first_name: user.first_name,
    last_name: user.last_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Check if a user has specific authentication requirements
 * @param user - User to check
 * @returns Object with various authentication status checks
 */
export function checkUserAuthenticationStatus(user: WorkOSUser | null) {
  return {
    isAuthenticated: user !== null,
    isEmailVerified: user?.email_verified ?? false,
    hasProfile: user ? Boolean(user.first_name || user.last_name) : false,
    hasProfilePicture: user ? Boolean(user.profile_picture_url) : false,
    userId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

/**
 * Clear the user cache (useful for testing or when tokens are invalidated)
 * @param accessToken - Optional specific token to remove from cache
 */
export function clearUserCache(accessToken?: string): void {
  if (accessToken) {
    userCache.delete(accessToken);
    console.log('Cleared cached user data for specific token');
  } else {
    userCache.clear();
    console.log('Cleared all cached user data');
  }
}

/**
 * Get cache statistics (useful for debugging)
 * @returns Object with cache statistics
 */
export function getUserCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const [, value] of userCache.entries()) {
    if (value.expires > now) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }

  return {
    totalEntries: userCache.size,
    validEntries,
    expiredEntries,
    cacheDuration: CACHE_DURATION,
  };
}

// Re-export types for convenience
export type { WorkOSUser } from '../workos-types';