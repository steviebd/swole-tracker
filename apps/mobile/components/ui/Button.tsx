import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { cn } from '../../lib/utils';
import { DesignTokens } from '../../lib/design-tokens';

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
    primary: 'bg-primary-500 border-primary-500',
    secondary: 'bg-surface border-border-default',
    outline: 'bg-transparent border-primary-500',
  };
  
  const sizeClasses = {
    sm: 'px-component-sm py-component-xs',
    md: 'px-component-md py-component-sm',
    lg: 'px-component-lg py-component-md',
  };
  
  const textVariantClasses = {
    primary: 'text-foreground font-token-medium',
    secondary: 'text-text-primary font-token-medium',
    outline: 'text-primary-500 font-token-medium',
  };
  
  const textSizeClasses = {
    sm: 'text-token-sm',
    md: 'text-token-base',
    lg: 'text-token-lg',
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
          color={variant === 'outline' ? DesignTokens.colors.primary : DesignTokens.colors.text.primary}
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