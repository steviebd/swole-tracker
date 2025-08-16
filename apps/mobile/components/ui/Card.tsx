import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function Card({ 
  variant = 'default', 
  className, 
  children,
  ...props 
}: CardProps) {
  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  
  const variantClasses = {
    default: '',
    elevated: 'shadow-md',
  };
  
  return (
    <View 
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}