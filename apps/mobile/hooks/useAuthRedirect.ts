import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../components/providers/AuthProvider';

/**
 * Hook to handle automatic auth redirects based on current route and auth state
 * Useful for protected routes or auth-only routes
 */
export function useAuthRedirect(options?: {
  /** Redirect to this route if user is not authenticated */
  redirectTo?: string;
  /** Only redirect if user is on this route pattern */
  onlyFromRoute?: string;
  /** Disable automatic redirects */
  disabled?: boolean;
}) {
  const { session, isInitialized } = useAuth();
  const router = useRouter();

  const {
    redirectTo = '/(auth)/login',
    onlyFromRoute,
    disabled = false,
  } = options || {};

  useEffect(() => {
    if (disabled || !isInitialized) return;

    // Check if we should redirect based on route pattern
    if (onlyFromRoute && !window.location?.pathname?.includes(onlyFromRoute)) {
      return;
    }

    // Redirect to login if no session
    if (!session) {
      router.replace(redirectTo as any);
    }
  }, [session, isInitialized, redirectTo, onlyFromRoute, disabled, router]);

  return {
    isAuthenticated: !!session,
    isLoading: !isInitialized,
    session,
  };
}

/**
 * Hook for pages that should only be accessible to authenticated users
 */
export function useRequireAuth(redirectTo?: string) {
  return useAuthRedirect({ redirectTo });
}

/**
 * Hook for pages that should only be accessible to unauthenticated users (like login)
 */
export function useRequireNoAuth(redirectTo: string = '/(tabs)') {
  const { session, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    // Redirect to main app if user is already authenticated
    if (session) {
      router.replace(redirectTo as any);
    }
  }, [session, isInitialized, redirectTo, router]);

  return {
    isAuthenticated: !!session,
    isLoading: !isInitialized,
    session,
  };
}