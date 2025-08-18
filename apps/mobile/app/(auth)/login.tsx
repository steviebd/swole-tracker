import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Auth from '../../components/Auth';
import { useTheme } from '../../components/providers/ThemeProvider';
import { LoadingScreen } from '../../components/ui';

export default function LoginScreen() {
  const { activeTheme, isInitialized } = useTheme();
  
  // Wait for theme to be initialized
  if (!isInitialized) {
    return <LoadingScreen message="Loading theme..." />;
  }
  
  // Dark theme gradient backgrounds for premium feel
  const gradientColors = activeTheme === 'dark' 
    ? ['#0f0f23', '#1a1a2e', '#16213e'] as const // Deep blue-purple gradient
    : ['#f8fafc', '#f1f5f9', '#e2e8f0'] as const; // Light gradient

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Dark theme glass background with gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Auth />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24, // Equivalent to px-component-lg
  },
});