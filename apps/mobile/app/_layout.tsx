import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../components/providers/AuthProvider';
import { TRPCProvider } from '../components/providers/TRPCProvider';
import { LoadingScreen } from '../components/ui';
import '../global.css';

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { session, isInitialized } = useAuth();

  useEffect(() => {
    console.log('🔐 Route protection check:', { 
      isInitialized, 
      hasSession: !!session, 
      segments: segments.join('/'),
      currentRoute: segments[0],
      allSegments: segments 
    });

    if (!isInitialized) {
      console.log('🔐 Auth not initialized yet, waiting...');
      return; // Wait for auth to initialize
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('🔐 Route analysis:', { inAuthGroup, hasSession: !!session });

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      console.log('🔐 No session and not in auth group, redirecting to login');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100); // Small delay to ensure navigation works
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page.
      console.log('🔐 Has session and in auth group, redirecting to tabs');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } else {
      console.log('🔐 No redirect needed');
    }
  }, [session, segments, isInitialized, router]);
}

function RootLayoutContent() {
  const { isInitialized, isLoading, session } = useAuth();
  const segments = useSegments();
  
  useProtectedRoute();

  // Show loading screen while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <LoadingScreen 
        message={!isInitialized ? 'Initializing...' : 'Loading...'} 
      />
    );
  }

  // If auth is initialized but no session and not in auth group, show loading
  // This prevents the protected content from flashing before redirect
  const inAuthGroup = segments[0] === '(auth)';
  if (isInitialized && !session && !inAuthGroup) {
    console.log('🔐 Showing loading while redirecting to auth...');
    return (
      <LoadingScreen message="Redirecting to login..." />
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TRPCProvider>
        <RootLayoutContent />
      </TRPCProvider>
    </AuthProvider>
  );
}