import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface LoadingScreenProps {
  /** Loading message to display */
  message?: string;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
  /** Background color class */
  backgroundColor?: string;
  /** Text color class */
  textColor?: string;
  /** Custom container className */
  className?: string;
}

export function LoadingScreen({
  message = 'Loading...',
  size = 'large',
  backgroundColor = 'bg-white',
  textColor = 'text-gray-600',
  className,
}: LoadingScreenProps) {
  return (
    <View className={cn('flex-1 justify-center items-center', backgroundColor, className)}>
      <ActivityIndicator size={size} color="#2563eb" />
      {message && (
        <Text className={cn('mt-4 text-base text-center', textColor)}>
          {message}
        </Text>
      )}
    </View>
  );
}

export function LoadingOverlay({
  message = 'Loading...',
  visible = true,
  backgroundColor = 'bg-black/50',
}: {
  message?: string;
  visible?: boolean;
  backgroundColor?: string;
}) {
  if (!visible) return null;

  return (
    <View className={cn('absolute inset-0 justify-center items-center z-50', backgroundColor)}>
      <View className="bg-white rounded-lg p-6 items-center shadow-lg">
        <ActivityIndicator size="large" color="#2563eb" />
        {message && (
          <Text className="mt-4 text-base text-gray-700 text-center">
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}