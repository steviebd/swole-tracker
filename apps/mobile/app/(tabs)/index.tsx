import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TemplatesList } from '../../components/templates/TemplatesList';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';

export default function TemplatesScreen() {
  const router = useRouter();
  const { activeTheme, toggleTheme } = useTheme();

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header with glass effect and gradient */}
      <View className="bg-gradient-to-b from-bg-surface to-bg-card border-b border-border-default px-component-md py-component-sm shadow-token-sm">
        <View className="flex-row justify-between items-center">
          <Text 
            role="heading" 
            size="2xl" 
            weight="bold"
            className="text-text-primary"
          >
            Templates
          </Text>
          
          <View className="flex-row gap-gap-sm">
            {/* Theme Toggle Button with Glass Effect */}
            <Button
              variant="glass"
              size="sm"
              onPress={toggleTheme}
              className="min-w-[44px]"
            >
              {activeTheme === 'dark' ? '☀️' : '🌙'}
            </Button>
            
            {/* Create Template Button */}
            <Button
              variant="primary"
              size="sm"
              onPress={handleCreateTemplate}
              className="bg-gradient-dark-primary"
            >
              + New
            </Button>
          </View>
        </View>
        
        {/* Subtitle */}
        <Text 
          role="body" 
          size="sm" 
          className="text-text-secondary mt-1"
        >
          Create and manage your workout templates
        </Text>
      </View>

      {/* Templates List Container with enhanced styling */}
      <View className="flex-1 bg-bg-app">
        <TemplatesList />
      </View>
    </SafeAreaView>
  );
}