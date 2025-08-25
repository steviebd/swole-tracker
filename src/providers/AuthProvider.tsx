"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type WorkOSUser, SESSION_COOKIE_NAME } from "~/lib/workos-types";
import { 
  readSessionCookieFromDocument, 
  handleSessionError
} from "~/lib/auth/session";

/**
 * Basic client-side validation for user data
 * This is a simplified version that doesn't require server-side imports
 */
function isValidUser(user: any): user is WorkOSUser {
  return user && 
    typeof user === 'object' && 
    typeof user.id === 'string' && 
    typeof user.email === 'string' && 
    user.object === 'user';
}

/**
 * Simple client-side auth status checker
 */
function getBasicAuthStatus(user: WorkOSUser | null) {
  return {
    isAuthenticated: user !== null,
    isEmailVerified: user?.email_verified ?? false,
    userId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

interface AuthContextType {
  user: WorkOSUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkOSUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session from cookie using centralized auth library
    const getInitialSession = () => {
      console.log('AuthProvider: Getting initial session...');
      console.log('AuthProvider: All cookies:', document.cookie);
      
      try {
        const sessionData = readSessionCookieFromDocument();
        
        if (sessionData) {
          console.log('AuthProvider: Found valid session data:', {
            hasUser: !!sessionData.user,
            hasAccessToken: !!sessionData.accessToken,
            userPreview: sessionData.user ? {
              id: sessionData.user.id,
              email: sessionData.user.email,
            } : null,
          });
          
          // Basic validation of user data from session
          if (sessionData.user && isValidUser(sessionData.user)) {
            console.log('AuthProvider: Setting user from session');
            setUser(sessionData.user);
          } else {
            console.warn('AuthProvider: Invalid user data in session');
            setUser(null);
          }
        } else {
          console.log('AuthProvider: No valid session found');
          setUser(null);
        }
      } catch (error) {
        console.error('AuthProvider: Session initialization failed');
        const { error: errorMessage } = handleSessionError(
          error, 
          'AuthProvider initialization'
        );
        
        console.error(errorMessage);
        setUser(null);
        
        // If we should clear the session, we could trigger a logout here
        // but for now, we'll just set user to null
      } finally {
        console.log('AuthProvider: Setting isLoading to false');
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workos-auth-change') {
        // Reload to get new session state
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear the session cookie by calling the logout API
      await fetch('/api/auth/logout', { method: 'GET' });
      
      // Clear user state
      setUser(null);
      
      // Trigger storage event for multi-tab sync
      localStorage.setItem('workos-auth-change', Date.now().toString());
      localStorage.removeItem('workos-auth-change');
      
      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error('Sign out error:', error);
      // Still redirect even if there's an error
      router.push("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Debug utility - can be called from browser console
if (typeof window !== 'undefined') {
  (window as any).debugAuth = {
    clearAuth: () => {
      // Clear WorkOS session cookie
      document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      window.location.reload();
    },
    checkAuth: () => {
      try {
        const sessionData = readSessionCookieFromDocument();
        if (sessionData) {
          console.log('Current auth state:', {
            user: sessionData.user,
            hasAccessToken: !!sessionData.accessToken,
            authStatus: getBasicAuthStatus(sessionData.user)
          });
          return sessionData.user;
        } else {
          console.log('No valid session found');
          return null;
        }
      } catch (error) {
        const { error: errorMessage } = handleSessionError(error, 'debug checkAuth');
        console.error(errorMessage);
        return null;
      }
    },
    login: () => {
      window.location.href = '/api/auth/login';
    },
    logout: () => {
      window.location.href = '/api/auth/logout';
    },
    validateUser: (user: any) => {
      const isValid = isValidUser(user);
      console.log('User validation result:', isValid);
      if (isValid) {
        console.log('User data:', user);
        console.log('Auth status:', getBasicAuthStatus(user));
      }
      return isValid;
    }
  };
}
