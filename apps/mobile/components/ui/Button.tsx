import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { cn } from '../../lib/utils';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  const baseClasses = 'items-center justify-center rounded-lg border';
  
  const variantClasses = {
    primary: 'bg-blue-600 border-blue-600',
    secondary: 'bg-gray-600 border-gray-600',
    outline: 'bg-transparent border-blue-600',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };
  
  const textVariantClasses = {
    primary: 'text-white font-medium',
    secondary: 'text-white font-medium',
    outline: 'text-blue-600 font-medium',
  };
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  const disabledClasses = (disabled || loading) ? 'opacity-50' : '';
  
  return (
    <TouchableOpacity
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabledClasses,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#2563eb' : '#ffffff'}
        />
      ) : (
        <Text
          className={cn(
            textVariantClasses[variant],
            textSizeClasses[size]
          )}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}