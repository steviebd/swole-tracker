import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { Card } from '../ui/Card';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './RestTimer';
import { RPESelector } from './RPESelector';
import type { 
  WorkoutSession, 
  ExerciseInput, 
  SetInput,
  SaveWorkoutInput 
} from '../../lib/shared-types';

interface WorkoutSessionViewProps {
  session: WorkoutSession;
  onWorkoutSaved: () => void;
}

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetInput[];
  unit: 'kg' | 'lbs';
}

export function WorkoutSessionView({ session, onWorkoutSaved }: WorkoutSessionViewProps) {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTime, setRestTime] = useState(90); // Default 90 seconds
  const [showRPESelector, setShowRPESelector] = useState(false);
  const [currentSetRPE, setCurrentSetRPE] = useState<number | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set([0]));

  const saveWorkout = trpc.workouts.save.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Workout saved successfully!');
      onWorkoutSaved();
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to save workout: ${error.message}`);
    },
  });

  // Initialize exercises from template
  useEffect(() => {
    if (session.template?.exercises) {
      const initialExercises: ExerciseData[] = session.template.exercises.map((templateExercise) => ({
        templateExerciseId: templateExercise.id,
        exerciseName: templateExercise.exerciseName,
        sets: [generateNewSet()],
        unit: 'kg', // TODO: Get from user preferences
      }));
      setExercises(initialExercises);
    }
  }, [session.template]);

  const generateNewSet = (): SetInput => ({
    id: Math.random().toString(36).substr(2, 9),
    weight: undefined,
    reps: undefined,
    sets: 1,
    unit: 'kg',
    rpe: undefined,
    rest: undefined,
    isEstimate: false,
    isDefaultApplied: false,
  });

  const updateSet = (exerciseIndex: number, setIndex: number, updates: Partial<SetInput>) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise) {
        exercise.sets[setIndex] = { ...exercise.sets[setIndex], ...updates };
      }
      return newExercises;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise) {
        exercise.sets.push(generateNewSet());
      }
      return newExercises;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise && exercise.sets.length > 1) {
        exercise.sets.splice(setIndex, 1);
      }
      return newExercises;
    });
  };

  const startRestTimer = (seconds: number = 90) => {
    setRestTime(seconds);
    setShowRestTimer(true);
  };

  const handleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    // Mark set as completed and potentially start rest timer
    const exercise = exercises[exerciseIndex];
    const set = exercise?.sets[setIndex];
    
    if (set && (set.weight || set.reps)) {
      // Auto-start rest timer if set has data
      startRestTimer(set.rest || 90);
    }
  };

  const toggleExerciseExpansion = (exerciseIndex: number) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseIndex)) {
        newSet.delete(exerciseIndex);
      } else {
        newSet.add(exerciseIndex);
      }
      return newSet;
    });
  };

  const handleSaveWorkout = async () => {
    try {
      const payload: SaveWorkoutInput = {
        sessionId: session.id,
        exercises: exercises.map(exercise => ({
          templateExerciseId: exercise.templateExerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.filter(set => 
            set.weight !== undefined || set.reps !== undefined || (set.sets && set.sets > 0)
          ),
          unit: exercise.unit,
        })),
        device_type: 'ios', // TODO: Detect device type
        theme_used: 'system', // TODO: Get from theme context
      };

      await saveWorkout.mutateAsync(payload);
    } catch (error) {
      console.error('Error saving workout:', error);
    }
  };

  const handleCompleteWorkout = () => {
    Alert.alert(
      'Complete Workout',
      'Are you ready to complete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: handleSaveWorkout,
        },
      ]
    );
  };

  if (!session.template) {
    return (
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-lg text-gray-600">No template found for this workout</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Workout Progress */}
        <Card className="mb-4 p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-gray-900">
              Workout Progress
            </Text>
            <Text className="text-sm text-gray-500">
              {exercises.filter(ex => ex.sets.some(set => set.weight || set.reps)).length} / {exercises.length} exercises
            </Text>
          </View>
          <View className="bg-gray-200 rounded-full h-2">
            <View 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ 
                width: `${(exercises.filter(ex => ex.sets.some(set => set.weight || set.reps)).length / exercises.length) * 100}%` 
              }}
            />
          </View>
        </Card>

        {/* Exercise Cards */}
        {exercises.map((exercise, exerciseIndex) => (
          <ExerciseCard
            key={`${exercise.exerciseName}-${exerciseIndex}`}
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            isExpanded={expandedExercises.has(exerciseIndex)}
            onToggleExpansion={() => toggleExerciseExpansion(exerciseIndex)}
            onUpdateSet={updateSet}
            onAddSet={() => addSet(exerciseIndex)}
            onRemoveSet={removeSet}
            onSetCompleted={handleSetCompleted}
            onStartRestTimer={startRestTimer}
          />
        ))}

        {/* Bottom Spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Action Bar */}
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleSaveWorkout}
            disabled={saveWorkout.isPending}
            className="flex-1 bg-blue-600 rounded-lg py-3 disabled:opacity-50"
          >
            <Text className="text-white text-center font-medium">
              {saveWorkout.isPending ? 'Saving...' : 'Save Progress'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCompleteWorkout}
            disabled={saveWorkout.isPending}
            className="flex-1 bg-green-600 rounded-lg py-3 disabled:opacity-50"
          >
            <Text className="text-white text-center font-medium">
              Complete Workout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest Timer Modal */}
      {showRestTimer && (
        <RestTimer
          initialTime={restTime}
          onClose={() => setShowRestTimer(false)}
          onComplete={() => setShowRestTimer(false)}
        />
      )}

      {/* RPE Selector Modal */}
      {showRPESelector && (
        <RPESelector
          currentRPE={currentSetRPE}
          onSelect={(rpe) => {
            setCurrentSetRPE(rpe);
            setShowRPESelector(false);
          }}
          onClose={() => setShowRPESelector(false)}
        />
      )}
    </View>
  );
}