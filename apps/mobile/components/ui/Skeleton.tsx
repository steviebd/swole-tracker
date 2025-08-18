import React from 'react';
import { View, ViewProps, DimensionValue } from 'react-native';
import { cn } from '../../lib/utils';

interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
}

export function Skeleton({ 
  width = '100%', 
  height = 16, 
  className, 
  style,
  ...props 
}: SkeletonProps) {
  return (
    <View 
      className={cn('bg-gray-300 rounded animate-pulse', className)}
      style={[{ width, height }, style]}
      {...props}
    />
  );
}