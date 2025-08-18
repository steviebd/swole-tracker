import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  icon?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = '📋',
  actionTitle,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View 
      className={cn('items-center justify-center py-12 px-6', className)}
      {...props}
    >
      <Text className="text-6xl mb-4">{icon}</Text>
      <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-base text-gray-600 mb-6 text-center">
          {description}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
}