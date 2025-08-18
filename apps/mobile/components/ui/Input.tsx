import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { cn } from '../../lib/utils';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Input variants for different visual styles
 */
type InputVariant = 'default' | 'glass' | 'outline' | 'minimal';

/**
 * Input sizes with consistent spacing
 */
type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input validation states
 */
type InputValidationState = 'default' | 'success' | 'warning' | 'error';

/**
 * BREAKING: Enhanced Input component props with dark-first design
 */
interface InputProps extends TextInputProps {
  /** Input label - enhanced with semantic colors */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message - replaces simple error prop */
  errorMessage?: string;
  /** Success message for validation */
  successMessage?: string;
  /** Warning message for validation */
  warningMessage?: string;
  /** Visual variant - BREAKING: enhanced variant system */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Manual validation state override */
  validationState?: InputValidationState;
  /** Show/hide password toggle for secure inputs */
  showPasswordToggle?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Disabled state styling */
  disabled?: boolean;
  /** Container class name */
  containerClassName?: string;
  /** Custom class names for input */
  className?: string;
  /** Label class name customization */
  labelClassName?: string;
}

/**
 * Dark-first Input component with glass effects and enhanced validation
 * 
 * BREAKING CHANGES from v1:
 * - Removed hardcoded gray and white colors
 * - Enhanced validation system with multiple states
 * - Added glass variant with backdrop blur
 * - Improved focus states with glass effects  
 * - Added password toggle functionality
 * - Semantic color system for dark theme
 * 
 * Features:
 * - Dark theme optimized with semantic tokens
 * - Glass effect variants with backdrop blur
 * - Enhanced validation states (success, warning, error)
 * - Password visibility toggle
 * - Improved focus states and interactions
 * - Consistent sizing and spacing tokens
 * - Proper placeholder contrast for dark mode
 */
export function Input({
  label,
  helperText,
  errorMessage,
  successMessage,
  warningMessage,
  variant = 'default',
  size = 'md',
  validationState = 'default',
  showPasswordToggle = false,
  required = false,
  disabled = false,
  containerClassName,
  className,
  labelClassName,
  secureTextEntry,
  ...props
}: InputProps) {
  const { activeTheme } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  // Determine validation state from props
  const currentValidationState = 
    errorMessage ? 'error' :
    successMessage ? 'success' :
    warningMessage ? 'warning' :
    validationState;
  
  // Get current validation message
  const validationMessage = errorMessage || successMessage || warningMessage || helperText;
  
  // Base container classes
  const containerClasses = cn(
    'mb-component-md',
    disabled && 'opacity-60',
    containerClassName
  );
  
  // Label classes with semantic colors
  const labelClasses = cn(
    'text-text-primary font-token-medium mb-gap-sm',
    size === 'sm' && 'text-token-sm',
    size === 'md' && 'text-token-base',
    size === 'lg' && 'text-token-lg',
    required && "after:content-['*'] after:text-danger after:ml-1",
    labelClassName
  );
  
  // Base input classes with enhanced focus states
  const baseInputClasses = cn(
    'border rounded-token-lg font-token-normal transition-all duration-base',
    'focus:shadow-token-focus focus:scale-[1.01]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    size === 'sm' && 'px-component-sm py-component-xs text-token-sm min-h-[32px]',
    size === 'md' && 'px-component-md py-component-sm text-token-base min-h-[40px]',
    size === 'lg' && 'px-component-lg py-component-md text-token-lg min-h-[48px]'
  );
  
  // Variant-specific classes
  const variantClasses = {
    default: cn(
      'bg-bg-surface border-border-default text-text-primary',
      'focus:border-primary focus:bg-bg-card',
      currentValidationState === 'success' && 'border-success focus:border-success',
      currentValidationState === 'warning' && 'border-warning focus:border-warning',
      currentValidationState === 'error' && 'border-danger focus:border-danger'
    ),
    glass: cn(
      'bg-glass-card border-glass-border backdrop-blur-sm text-text-primary',
      'focus:border-glass-border focus:bg-glass-card/95',
      currentValidationState === 'success' && 'border-success/50 focus:border-success',
      currentValidationState === 'warning' && 'border-warning/50 focus:border-warning',
      currentValidationState === 'error' && 'border-danger/50 focus:border-danger'
    ),
    outline: cn(
      'bg-transparent border-2 border-border-default text-text-primary',
      'focus:border-primary focus:bg-bg-surface/20',
      currentValidationState === 'success' && 'border-success focus:border-success',
      currentValidationState === 'warning' && 'border-warning focus:border-warning',
      currentValidationState === 'error' && 'border-danger focus:border-danger'
    ),
    minimal: cn(
      'bg-transparent border-0 border-b-2 border-border-default rounded-none text-text-primary',
      'focus:border-primary',
      currentValidationState === 'success' && 'border-success focus:border-success',
      currentValidationState === 'warning' && 'border-warning focus:border-warning',
      currentValidationState === 'error' && 'border-danger focus:border-danger'
    ),
  };
  
  // Validation message classes
  const validationMessageClasses = cn(
    'mt-gap-xs text-token-sm',
    currentValidationState === 'success' && 'text-success',
    currentValidationState === 'warning' && 'text-warning',
    currentValidationState === 'error' && 'text-danger',
    currentValidationState === 'default' && 'text-text-muted'
  );
  
  // Placeholder color based on theme
  const placeholderColor = activeTheme === 'dark' ? '#65757f' : '#9ca3af';
  
  // Password toggle handler
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  
  return (
    <View className={containerClasses}>
      {/* Label */}
      {label && (
        <Text className={labelClasses}>
          {label}
        </Text>
      )}
      
      {/* Input Container for password toggle */}
      <View className="relative">
        <TextInput
          className={cn(
            baseInputClasses,
            variantClasses[variant],
            showPasswordToggle && 'pr-12', // Add padding for toggle button
            className
          )}
          placeholderTextColor={placeholderColor}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          editable={!disabled}
          {...props}
        />
        
        {/* Password Toggle Button */}
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            className="absolute right-component-sm top-1/2 -translate-y-1/2"
            disabled={disabled}
          >
            <Text className="text-text-muted text-token-base">
              {isPasswordVisible ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Validation Message */}
      {validationMessage && (
        <Text className={validationMessageClasses}>
          {validationMessage}
        </Text>
      )}
    </View>
  );
}

/**
 * Text Area component for multi-line input
 */
interface TextAreaProps extends InputProps {
  /** Number of lines to show */
  numberOfLines?: number;
  /** Maximum height for the text area */
  maxHeight?: number;
}

export function TextArea({
  numberOfLines = 3,
  maxHeight,
  className,
  ...props
}: TextAreaProps) {
  const textAreaClasses = cn(
    'text-top', // Align text to top for multiline
    maxHeight && `max-h-[${maxHeight}px]`,
    className
  );
  
  return (
    <Input
      {...props}
      className={textAreaClasses}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
    />
  );
}