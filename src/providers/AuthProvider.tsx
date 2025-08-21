"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_COOKIE_NAME, type WorkOSUser } from "~/lib/workos-types";

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
    // Get initial session from cookie
    const getInitialSession = () => {
      console.log('AuthProvider: Getting initial session...');
      console.log('AuthProvider: All cookies:', document.cookie);
      try {
        // Get session cookie
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [rawName, ...rest] = cookie.trim().split('=');
          const name = rawName?.trim();
          if (name) {
            const value = rest.join('=');
            acc[name] = value ?? '';
          }
          return acc;
        }, {} as Record<string, string>);

        console.log('AuthProvider: Parsed cookies:', Object.keys(cookies));
        console.log('AuthProvider: Looking for cookie:', SESSION_COOKIE_NAME);
        console.log('AuthProvider: Available cookie names:', Object.keys(cookies));
        console.log('AuthProvider: Current origin:', window.location.origin);
        console.log('AuthProvider: Current hostname:', window.location.hostname);

        const sessionCookie = cookies[SESSION_COOKIE_NAME];
        if (sessionCookie) {
          console.log('AuthProvider: Found session cookie, length:', sessionCookie.length);
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
          console.log('AuthProvider: Parsed session data:', {
            hasUser: !!sessionData.user,
            hasAccessToken: !!sessionData.accessToken,
            userPreview: sessionData.user ? {
              id: sessionData.user.id,
              email: sessionData.user.email,
            } : null,
          });
          if (sessionData.user) {
            console.log('AuthProvider: Setting user from session');
            setUser(sessionData.user);
          }
        } else {
          console.log('AuthProvider: No session cookie found');
        }
      } catch (error) {
        console.error("AuthProvider: Failed to parse session:", error);
        setUser(null);
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
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [rawName, ...rest] = cookie.trim().split('=');
        const name = rawName?.trim();
        if (name) {
          const value = rest.join('=');
          acc[name] = value ?? '';
        }
        return acc;
      }, {} as Record<string, string>);

      const sessionCookie = cookies[SESSION_COOKIE_NAME];
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
          console.log('Current auth state:', sessionData);
          return sessionData as WorkOSUser | null;
        } catch (error) {
          console.error('Failed to parse session cookie:', error);
          return null;
        }
      } else {
        console.log('No session cookie found');
        return null;
      }
    },
    login: () => {
      window.location.href = '/api/auth/login';
    },
    logout: () => {
      window.location.href = '/api/auth/logout';
    }
  };
}
