import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { SetInputRow } from './SetInputRow';
import type { SetInput } from '../../lib/shared-types';

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetInput[];
  unit: 'kg' | 'lbs';
}

interface ExerciseCardProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, updates: Partial<SetInput>) => void;
  onAddSet: () => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onSetCompleted: (exerciseIndex: number, setIndex: number) => void;
  onStartRestTimer: (seconds?: number) => void;
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  isExpanded,
  onToggleExpansion,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onSetCompleted,
  onStartRestTimer,
}: ExerciseCardProps) {
  const completedSets = exercise.sets.filter(set => set.weight && set.reps).length;
  const totalSets = exercise.sets.length;

  return (
    <Card className="mb-4">
      {/* Exercise Header */}
      <TouchableOpacity onPress={onToggleExpansion} className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {exercise.exerciseName}
            </Text>
            <Text className="text-sm text-gray-500">
              {completedSets} / {totalSets} sets completed
            </Text>
          </View>
          
          <View className="flex-row items-center gap-3">
            {/* Progress Circle */}
            <View className="relative">
              <View className="w-10 h-10 rounded-full border-2 border-gray-200 items-center justify-center">
                <Text className="text-xs font-medium text-gray-600">
                  {Math.round((completedSets / totalSets) * 100)}%
                </Text>
              </View>
              {completedSets > 0 && (
                <View 
                  className="absolute inset-0 rounded-full border-2 border-green-500"
                  style={{
                    transform: [{
                      rotate: `${(completedSets / totalSets) * 360}deg`
                    }]
                  }}
                />
              )}
            </View>
            
            {/* Expand/Collapse Icon */}
            <MaterialIcons 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={24} 
              color="#6B7280" 
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Sets List (when expanded) */}
      {isExpanded && (
        <View className="px-4 pb-4">
          {/* Set Headers */}
          <View className="flex-row items-center py-2 border-b border-gray-200 mb-2">
            <Text className="w-12 text-xs font-medium text-gray-500 text-center">Set</Text>
            <Text className="flex-1 text-xs font-medium text-gray-500 text-center">Weight</Text>
            <Text className="flex-1 text-xs font-medium text-gray-500 text-center">Reps</Text>
            <Text className="w-12 text-xs font-medium text-gray-500 text-center">RPE</Text>
            <View className="w-8" />
          </View>

          {/* Set Rows */}
          {exercise.sets.map((set, setIndex) => (
            <SetInputRow
              key={set.id}
              set={set}
              setIndex={setIndex}
              exerciseIndex={exerciseIndex}
              onUpdate={onUpdateSet}
              onRemove={onRemoveSet}
              onCompleted={onSetCompleted}
              onStartRestTimer={onStartRestTimer}
            />
          ))}

          {/* Add Set Button */}
          <TouchableOpacity
            onPress={onAddSet}
            className="mt-3 bg-gray-100 rounded-lg py-3 flex-row items-center justify-center"
          >
            <MaterialIcons name="add" size={20} color="#6B7280" />
            <Text className="ml-2 text-gray-600 font-medium">Add Set</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}