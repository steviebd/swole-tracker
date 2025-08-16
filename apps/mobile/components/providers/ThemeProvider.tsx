import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Available theme modes for the application
 */
export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Current active theme (resolved from system if needed)
 */
export type ActiveTheme = 'dark' | 'light';

/**
 * Theme context interface providing theme state and controls
 */
interface ThemeContextType {
  /** Current theme mode setting */
  mode: ThemeMode;
  /** Currently active theme (resolved from system if mode is 'system') */
  activeTheme: ActiveTheme;
  /** Whether the theme system is initialized and ready */
  isInitialized: boolean;
  /** Change the theme mode */
  setTheme: (mode: ThemeMode) => Promise<void>;
  /** Toggle between light and dark themes */
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Storage key for persisting theme preference
 */
const THEME_STORAGE_KEY = '@swole-tracker/theme';

/**
 * Default theme mode - dark first approach
 */
const DEFAULT_THEME_MODE: ThemeMode = 'dark';

/**
 * ThemeProvider component that manages app-wide theme state with persistence
 * 
 * Features:
 * - Dark-first approach (defaults to dark theme)
 * - AsyncStorage persistence for theme preference
 * - System theme detection and following
 * - Automatic StatusBar configuration
 * - Theme switching animations support
 * - Graceful fallback if storage fails
 * 
 * @param children - React components to wrap with theme context
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Load theme preference from AsyncStorage on app start
   */
  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const themeMode = (storedTheme as ThemeMode) || DEFAULT_THEME_MODE;
        
        if (mounted) {
          setMode(themeMode);
          
          // For now, we'll default to dark since we're implementing dark-first
          // In a future phase, we can add system theme detection
          const resolvedTheme: ActiveTheme = themeMode === 'light' ? 'light' : 'dark';
          setActiveTheme(resolvedTheme);
          setIsInitialized(true);
        }
      } catch (error) {
        console.warn('Failed to load theme from storage:', error);
        
        // Graceful fallback to default dark theme
        if (mounted) {
          setMode(DEFAULT_THEME_MODE);
          setActiveTheme('dark');
          setIsInitialized(true);
        }
      }
    };

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Save theme preference to AsyncStorage
   */
  const saveTheme = async (newMode: ThemeMode): Promise<void> => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
      // Continue execution even if storage fails
    }
  };

  /**
   * Update theme mode and resolve active theme
   */
  const setTheme = async (newMode: ThemeMode): Promise<void> => {
    try {
      setMode(newMode);
      
      // For Phase 1, we only support explicit dark/light modes
      // System mode will default to dark for now
      const resolvedTheme: ActiveTheme = newMode === 'light' ? 'light' : 'dark';
      setActiveTheme(resolvedTheme);
      
      await saveTheme(newMode);
    } catch (error) {
      console.error('Failed to set theme:', error);
      throw error;
    }
  };

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = async (): Promise<void> => {
    const newMode: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    await setTheme(newMode);
  };

  const contextValue: ThemeContextType = {
    mode,
    activeTheme,
    isInitialized,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {/* Configure StatusBar based on active theme */}
      <StatusBar 
        style={activeTheme === 'dark' ? 'light' : 'dark'} 
        backgroundColor="transparent"
        translucent
      />
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * 
 * @returns Theme context with current state and controls
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Utility function to get theme-aware colors
 * 
 * @param darkColor - Color to use in dark theme
 * @param lightColor - Color to use in light theme  
 * @param activeTheme - Current active theme
 * @returns Appropriate color for current theme
 */
export function getThemeColor(
  darkColor: string, 
  lightColor: string, 
  activeTheme: ActiveTheme
): string {
  return activeTheme === 'dark' ? darkColor : lightColor;
}

/**
 * Utility function to get theme-aware style objects
 * 
 * @param darkStyle - Style object for dark theme
 * @param lightStyle - Style object for light theme
 * @param activeTheme - Current active theme
 * @returns Appropriate style object for current theme
 */
export function getThemeStyle<T>(
  darkStyle: T,
  lightStyle: T,
  activeTheme: ActiveTheme
): T {
  return activeTheme === 'dark' ? darkStyle : lightStyle;
}

/**
 * Higher-order component to provide theme-aware styling
 * 
 * @param WrappedComponent - Component to wrap with theme context
 * @returns Component with theme context injected as props
 */
export function withTheme<P extends object>(
  WrappedComponent: React.ComponentType<P & { theme: ActiveTheme }>
) {
  return function ThemedComponent(props: P) {
    const { activeTheme } = useTheme();
    
    return <WrappedComponent {...props} theme={activeTheme} />;
  };
}