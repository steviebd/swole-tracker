import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { WorkoutSessionView } from '../../components/workout/WorkoutSessionView';
import type { WorkoutSession } from '../../lib/shared-types';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id, 10);

  const { data: session, isLoading, error } = trpc.workouts.getById.useQuery(
    { id: sessionId },
    {
      enabled: !!sessionId && !isNaN(sessionId),
    }
  );

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => {
      router.push('/');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to delete workout: ${error.message}`);
    },
  });

  const handleGoBack = () => {
    router.back();
  };

  const handleDeleteWorkout = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWorkout.mutate({ id: sessionId }),
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !session) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="flex-1 justify-center items-center p-5">
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text className="text-xl font-bold mb-2 text-gray-800">
            Workout Not Found
          </Text>
          <Text className="text-base text-gray-600 text-center mb-6">
            {error?.message || 'The workout session could not be loaded.'}
          </Text>
          <TouchableOpacity
            onPress={handleGoBack}
            className="bg-blue-600 rounded-lg py-3 px-6"
          >
            <Text className="text-white text-base font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
              {session.template?.name || 'Workout Session'}
            </Text>
            <Text className="text-sm text-gray-500">
              {new Date(session.workoutDate).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDeleteWorkout}>
            <MaterialIcons name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Workout Session Content */}
      <WorkoutSessionView
        session={session as WorkoutSession}
        onWorkoutSaved={() => {
          // Optionally refresh data or navigate away
          router.push('/');
        }}
      />
    </SafeAreaView>
  );
}