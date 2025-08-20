import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// WorkOS configuration
const workosClientId = Constants.expoConfig?.extra?.workosClientId || process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID;
const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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

export interface WorkOSSession {
  user: WorkOSUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

const SESSION_STORAGE_KEY = 'workos_session';

export class WorkOSAuth {
  /**
   * Get authorization URL for OAuth flow (to be opened in browser)
   */
  static getAuthorizationUrl(redirectUri: string, state?: string): string {
    if (!workosClientId) {
      throw new Error('WORKOS_CLIENT_ID not configured');
    }

    const params = new URLSearchParams({
      client_id: workosClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://api.workos.com/user_management/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for session (called by web callback)
   */
  static async exchangeCodeForSession(code: string, redirectUri: string): Promise<WorkOSSession> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/mobile/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const sessionData = await response.json();
      await this.setSession(sessionData);
      return sessionData;
    } catch (error) {
      console.error('WorkOS code exchange error:', error);
      throw new Error('Failed to authenticate with WorkOS');
    }
  }

  /**
   * Get current session from storage
   */
  static async getSession(): Promise<WorkOSSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionJson) return null;

      const session = JSON.parse(sessionJson);
      
      // Check if session is expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        // Try to refresh the session
        return await this.refreshSession(session);
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Set session in storage
   */
  static async setSession(session: WorkOSSession): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to set session:', error);
      throw error;
    }
  }

  /**
   * Clear session from storage
   */
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Refresh session using refresh token
   */
  static async refreshSession(session: WorkOSSession): Promise<WorkOSSession | null> {
    if (!session.refreshToken) {
      await this.clearSession();
      return null;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/mobile/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken,
        }),
      });

      if (!response.ok) {
        await this.clearSession();
        return null;
      }

      const newSession = await response.json();
      await this.setSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Session refresh error:', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Sign out and clear session
   */
  static async signOut(): Promise<void> {
    try {
      // Call server logout endpoint to invalidate session
      await fetch(`${apiBaseUrl}/api/mobile/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local session
      await this.clearSession();
    }
  }

  /**
   * Get logout URL for browser
   */
  static getLogoutUrl(redirectUri: string): string {
    if (!workosClientId) {
      throw new Error('WORKOS_CLIENT_ID not configured');
    }

    const params = new URLSearchParams({
      client_id: workosClientId,
      redirect_uri: redirectUri,
    });

    return `https://api.workos.com/user_management/logout?${params.toString()}`;
  }
}