import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { WorkOSAuth, type WorkOSSession, type WorkOSUser } from '../../lib/workos-auth';

interface AuthContextType {
  session: WorkOSSession | null;
  user: WorkOSUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  signOut: () => Promise<void>;
  signInWithBrowser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<WorkOSSession | null>(null);
  const [user, setUser] = useState<WorkOSUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle app state changes for session refresh
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        // Refresh session when app becomes active
        refreshSessionIfNeeded();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Function to refresh session if needed
  const refreshSessionIfNeeded = async () => {
    try {
      const currentSession = await WorkOSAuth.getSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setSession(null);
      setUser(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log('🔑 Initializing WorkOS auth...');
        
        const currentSession = await WorkOSAuth.getSession();
        
        console.log('🔑 Auth initialization result:', { 
          hasSession: !!currentSession,
          userId: currentSession?.user?.id,
        });
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsInitialized(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for deep links (auth callbacks)
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      // Handle auth callback URLs here if needed
      // This would be for handling the return from WorkOS auth flow
    };

    // Add URL event listener
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const signInWithBrowser = async () => {
    try {
      setIsLoading(true);
      
      // Generate a state parameter for security
      const state = JSON.stringify({
        timestamp: Date.now(),
        randomId: Math.random().toString(36).substring(7),
      });
      
      // Use a custom scheme for mobile deep linking
      const redirectUri = 'exp://localhost:8081/--/auth/callback'; // Expo development URL
      
      const authUrl = WorkOSAuth.getAuthorizationUrl(redirectUri, state);
      
      console.log('Opening auth URL:', authUrl);
      
      // Open the browser for authentication
      const canOpen = await Linking.canOpenURL(authUrl);
      if (canOpen) {
        await Linking.openURL(authUrl);
      } else {
        throw new Error('Cannot open authentication URL');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      await WorkOSAuth.signOut();
      
      // Clear local state
      setSession(null);
      setUser(null);
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isInitialized,
    signOut,
    signInWithBrowser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}