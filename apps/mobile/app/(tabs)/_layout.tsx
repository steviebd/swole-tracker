import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useTheme } from '../../components/providers/ThemeProvider';
import { DesignTokens } from '../../lib/design-tokens';

export default function TabLayout() {
  const { activeTheme } = useTheme();
  const themeColors = DesignTokens.theme[activeTheme];
  
  return (
    <Tabs
      screenOptions={{
        // Semantic dark theme colors using design tokens
        tabBarActiveTintColor: themeColors.primary.default,
        tabBarInactiveTintColor: themeColors.text.muted,
        tabBarStyle: {
          // Glass surface background for tab bar
          backgroundColor: themeColors.glass.card,
          borderTopColor: themeColors.border.default,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
          // Enhanced glass effects with proper shadows
          ...DesignTokens.shadow.md,
          // Additional glass blur effect
          backdropFilter: 'blur(20px)',
          // Glass highlight border for premium feel
          borderTopWidth: 0.5,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: DesignTokens.typography.fontSize.xs,
          fontWeight: DesignTokens.typography.fontWeight.medium,
          marginTop: 4,
          color: themeColors.text.secondary,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
        // Enhanced tab bar item styling with glass effects
        tabBarItemStyle: {
          paddingVertical: 6,
          marginHorizontal: 2,
          borderRadius: DesignTokens.borderRadius.lg,
          // Subtle glass highlight on tab items
          backgroundColor: 'transparent',
        },
        // Active tab styling with glass highlight
        tabBarActiveBackgroundColor: themeColors.glass.highlight,
        // Inactive tab styling
        tabBarInactiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="fitness-center" 
              size={focused ? size + 3 : size} 
              color={focused ? themeColors.primary.default : themeColors.text.muted}
              style={{
                opacity: focused ? 1 : 0.8,
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text>Templates</Text> : null,
          tabBarLabelStyle: {
            fontSize: DesignTokens.typography.fontSize.xs,
            fontWeight: DesignTokens.typography.fontWeight.medium,
            color: themeColors.text.muted,
            marginTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="assignment" 
              size={focused ? size + 3 : size} 
              color={focused ? themeColors.primary.default : themeColors.text.muted}
              style={{
                opacity: focused ? 1 : 0.8,
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text>Workouts</Text> : null,
          tabBarLabelStyle: {
            fontSize: DesignTokens.typography.fontSize.xs,
            fontWeight: DesignTokens.typography.fontWeight.medium,
            color: themeColors.text.muted,
            marginTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons 
              name="person" 
              size={focused ? size + 3 : size} 
              color={focused ? themeColors.primary.default : themeColors.text.muted}
              style={{
                opacity: focused ? 1 : 0.8,
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text>Profile</Text> : null,
          tabBarLabelStyle: {
            fontSize: DesignTokens.typography.fontSize.xs,
            fontWeight: DesignTokens.typography.fontWeight.medium,
            color: themeColors.text.muted,
            marginTop: 2,
          },
        }}
      />
    </Tabs>
  );
}