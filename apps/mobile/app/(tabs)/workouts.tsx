import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../components/providers/AuthProvider';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import type { WorkoutSession } from '../../lib/shared-types';

interface WorkoutCardProps {
  workout: WorkoutSession;
  onPress: () => void;
}

function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const exerciseCount = workout.exercises?.length || 0;
  const date = new Date(workout.workoutDate);
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="p-4 mb-3">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {workout.template?.name || 'Unnamed Workout'}
            </Text>
            <Text className="text-sm text-gray-500">
              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </View>
        
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </Text>
          
          <View className="flex-row items-center">
            <MaterialIcons name="fitness-center" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {workout.exercises.filter(ex => ex.weight || ex.reps).length} sets
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Skeleton width="70%" height={20} className="mb-2" />
          <Skeleton width="50%" height={16} />
        </View>
        <Skeleton width={24} height={24} />
      </View>
      <View className="flex-row items-center justify-between mt-3">
        <Skeleton width="40%" height={16} />
        <Skeleton width="30%" height={16} />
      </View>
    </Card>
  );
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  // Only fetch workouts if user is authenticated
  const { data: workouts, isLoading } = trpc.workouts.getRecent.useQuery(
    { limit: 20 },
    {
      enabled: !!session, // Only run query when authenticated
    }
  );

  const handleWorkoutPress = (workout: WorkoutSession) => {
    router.push(`/workout/${workout.id}`);
  };

  // Show loading if not authenticated yet
  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4 text-gray-800">Workout History</Text>
          {[...Array(5)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4 text-gray-800">Workout History</Text>
          {[...Array(5)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4 text-gray-800">Workout History</Text>
          <EmptyState
            title="No workouts yet"
            description="Start your first workout from a template to see your history here"
            icon="🏋️"
            actionTitle="Browse Templates"
            onAction={() => router.push('/')}
            className="flex-1"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1">
        {/* Header */}
        <View className="p-4 pb-2">
          <Text className="text-2xl font-bold text-gray-800">Workout History</Text>
          <Text className="text-sm text-gray-600">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} completed
          </Text>
        </View>

        {/* Workouts List */}
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => handleWorkoutPress(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}