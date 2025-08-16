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
    if (!isInitialized) return; // Wait for auth to initialize

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }
  }, [session, segments, isInitialized]);
}

function RootLayoutContent() {
  const { isInitialized, isLoading } = useAuth();
  
  useProtectedRoute();

  // Show loading screen while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <LoadingScreen 
        message={!isInitialized ? 'Initializing...' : 'Loading...'} 
      />
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