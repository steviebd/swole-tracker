import React, { useState } from 'react';
import { Alert, View, Text, Animated } from 'react-native';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { useAuth } from './providers/AuthProvider';
import { useTheme } from './providers/ThemeProvider';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const { signIn, signUp, isLoading } = useAuth();
  const { activeTheme } = useTheme();

  // Animation values for micro-interactions
  const [cardOpacity] = useState(new Animated.Value(1));
  const [formScale] = useState(new Animated.Value(1));

  // Enhanced validation function
  const validateForm = () => {
    const errors: typeof validationErrors = {};
    
    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (isSignUp && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Micro-interaction for button press
  const animatePress = () => {
    Animated.sequence([
      Animated.timing(formScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(formScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    // Clear previous states
    setValidationErrors({});
    setSuccessMessage('');
    
    // Validate form
    if (!validateForm()) {
      animatePress();
      return;
    }

    animatePress();

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.error) {
          setValidationErrors({ general: result.error });
        } else if (result.requiresVerification) {
          setSuccessMessage('Check your email for verification link!');
          // Animate success
          Animated.timing(cardOpacity, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setValidationErrors({ general: result.error });
        }
      }
    } catch (error) {
      setValidationErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form and validation states when switching modes
    setEmail('');
    setPassword('');
    setValidationErrors({});
    setSuccessMessage('');
    
    // Reset animations
    cardOpacity.setValue(1);
    formScale.setValue(1);
  };

  return (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ scale: formScale }],
      }}
    >
      <Card variant="glass" className="mx-component-md">
        {/* Header with enhanced typography */}
        <View className="mb-component-lg">
          <Text className="text-token-2xl font-token-bold text-center text-text-primary mb-gap-xs">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text className="text-token-base text-center text-text-muted">
            {isSignUp 
              ? 'Join Swole Tracker to start your fitness journey'
              : 'Sign in to continue your fitness journey'
            }
          </Text>
        </View>

        {/* Success Message */}
        {successMessage && (
          <View className="mb-component-md p-component-sm bg-success/10 border border-success/30 rounded-token-md">
            <Text className="text-success text-token-sm text-center font-token-medium">
              {successMessage}
            </Text>
          </View>
        )}

        {/* General Error Message */}
        {validationErrors.general && (
          <View className="mb-component-md p-component-sm bg-danger/10 border border-danger/30 rounded-token-md">
            <Text className="text-danger text-token-sm text-center font-token-medium">
              {validationErrors.general}
            </Text>
          </View>
        )}
        
        {/* Email Input with Enhanced Validation */}
        <Input
          label="Email Address"
          onChangeText={setEmail}
          value={email}
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoading}
          variant="glass"
          size="lg"
          required
          errorMessage={validationErrors.email}
          containerClassName="mb-component-md"
        />
        
        {/* Password Input with Toggle and Enhanced Validation */}
        <Input
          label="Password"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          showPasswordToggle
          placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
          autoCapitalize="none"
          editable={!isLoading}
          variant="glass"
          size="lg"
          required
          errorMessage={validationErrors.password}
          helperText={isSignUp ? 'Must contain uppercase, lowercase, and number' : undefined}
          containerClassName="mb-component-lg"
        />
        
        {/* Primary Action Button */}
        <Button 
          variant="glass"
          size="lg"
          visualStyle={successMessage ? "success" : "default"}
          loading={isLoading}
          onPress={handleSubmit}
          disabled={!email.trim() || !password.trim() || isLoading}
          className="mb-component-md"
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Button>
        
        {/* Secondary Action Button */}
        <Button 
          variant="ghost"
          size="md"
          onPress={toggleMode}
          disabled={isLoading}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Button>
      </Card>
    </Animated.View>
  );
}

