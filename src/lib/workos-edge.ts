/**
 * WorkOS Edge Runtime client for Cloudflare Workers
 * This module provides WorkOS authentication functions that work in Edge Runtime
 * without Node.js dependencies like @workos-inc/node
 */

import type { WorkOSUser } from './workos-types';
import { SESSION_COOKIE_NAME } from './workos-types';

/**
 * Validate access token using WorkOS API (Edge Runtime compatible)
 */
export async function validateAccessTokenEdge(accessToken: string): Promise<WorkOSUser | null> {
  try {
    // Decode JWT to get user ID without using Node.js Buffer
    const base64Url = accessToken.split('.')[1];
    if (!base64Url) {
      throw new Error('Invalid access token format');
    }
    
    // Convert base64url to base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = base64 + '='.repeat(padding === 0 ? 0 : 4 - padding);
    
    // Decode using TextDecoder (Edge Runtime compatible)
    const tokenPayload = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(paddedBase64), c => c.charCodeAt(0))
    ));
    
    const userId = tokenPayload.sub;
    if (!userId) {
      throw new Error('No user ID found in access token');
    }

    // Get user details from WorkOS API
    const response = await fetch(`https://api.workos.com/user_management/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WORKOS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WorkOS API error: ${response.status}`);
    }

    const user = await response.json();
    return user as WorkOSUser;
  } catch (error) {
    console.error('Edge access token validation failed:', error);
    return null;
  }
}

/**
 * Extract authenticated user from NextRequest (Edge Runtime compatible)
 */
export async function getUserFromRequestEdge(request: { cookies: { get: (name: string) => { value?: string } | undefined } }): Promise<WorkOSUser | null> {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    if (!sessionData.accessToken) {
      return null;
    }

    return await validateAccessTokenEdge(sessionData.accessToken);
  } catch (error) {
    console.error('Failed to get user from request (edge):', error);
    return null;
  }
}

/**
 * Check if session cookie contains valid session data (lightweight check)
 */
export function hasValidSessionCookie(request: { cookies: { get: (name: string) => { value?: string } | undefined } }): boolean {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return false;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    return !!(sessionData.accessToken && sessionData.user);
  } catch (error) {
    return false;
  }
}