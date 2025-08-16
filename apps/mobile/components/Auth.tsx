import React, { useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { Button, Input } from './ui';
import { useAuth } from './providers/AuthProvider';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp, isLoading } = useAuth();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.error) {
          Alert.alert('Sign Up Error', result.error);
        } else if (result.requiresVerification) {
          Alert.alert(
            'Check Your Email',
            'Please check your inbox for email verification!'
          );
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          Alert.alert('Sign In Error', result.error);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
  };

  return (
    <View className="mt-10 p-6 bg-white mx-4 rounded-lg shadow-sm">
      <Text className="text-2xl font-bold text-center mb-6 text-gray-900">
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </Text>
      
      <Input
        label="Email"
        onChangeText={setEmail}
        value={email}
        placeholder="email@address.com"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
        containerClassName="mb-4"
      />
      
      <Input
        label="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry={true}
        placeholder={isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
        autoCapitalize="none"
        editable={!isLoading}
        containerClassName="mb-6"
      />
      
      <Button 
        title={isSignUp ? 'Create Account' : 'Sign In'} 
        loading={isLoading}
        onPress={handleSubmit}
        className="mb-4"
        disabled={!email.trim() || !password.trim()}
      />
      
      <Button 
        title={isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        variant="outline"
        onPress={toggleMode}
        disabled={isLoading}
      />
    </View>
  );
}

