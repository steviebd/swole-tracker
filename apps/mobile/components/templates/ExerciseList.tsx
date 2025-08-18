import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '../ui';

interface Exercise {
  id: string;
  name: string;
}

interface ExerciseListProps {
  exercises: Exercise[];
  onExerciseChange: (id: string, name: string) => void;
  onAddExercise: () => void;
  onRemoveExercise: (id: string) => void;
  onMoveExercise: (fromIndex: number, toIndex: number) => void;
}

interface ExerciseItemProps {
  exercise: Exercise;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ExerciseItem({
  exercise,
  index,
  canMoveUp,
  canMoveDown,
  canRemove,
  onNameChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseItemProps) {
  const handleRemove = () => {
    Alert.alert(
      'Remove Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  };

  return (
    <View className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
      <View className="flex-row items-center gap-3">
        {/* Order Number */}
        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
          <Text className="text-blue-600 font-medium text-sm">{index + 1}</Text>
        </View>

        {/* Exercise Input */}
        <View className="flex-1">
          <Input
            value={exercise.name}
            onChangeText={onNameChange}
            placeholder={`Exercise ${index + 1}`}
            autoCapitalize="words"
            containerClassName="mb-0"
          />
        </View>

        {/* Move Controls */}
        <View className="flex-row gap-1">
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!canMoveUp}
            className={`p-2 rounded ${canMoveUp ? 'bg-gray-100' : 'bg-gray-50'}`}
          >
            <MaterialIcons
              name="keyboard-arrow-up"
              size={20}
              color={canMoveUp ? '#374151' : '#9CA3AF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!canMoveDown}
            className={`p-2 rounded ${canMoveDown ? 'bg-gray-100' : 'bg-gray-50'}`}
          >
            <MaterialIcons
              name="keyboard-arrow-down"
              size={20}
              color={canMoveDown ? '#374151' : '#9CA3AF'}
            />
          </TouchableOpacity>

          {canRemove && (
            <TouchableOpacity
              onPress={handleRemove}
              className="p-2 rounded bg-red-50"
            >
              <MaterialIcons name="delete" size={20} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export function ExerciseList({
  exercises,
  onExerciseChange,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
}: ExerciseListProps) {
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onMoveExercise(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < exercises.length - 1) {
      onMoveExercise(index, index + 1);
    }
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-gray-700 text-sm font-medium">
          Exercises ({exercises.length})
        </Text>
        <TouchableOpacity
          onPress={onAddExercise}
          className="bg-blue-600 rounded-lg px-3 py-2 flex-row items-center gap-1"
        >
          <MaterialIcons name="add" size={16} color="white" />
          <Text className="text-white font-medium text-sm">Add Exercise</Text>
        </TouchableOpacity>
      </View>

      {exercises.length === 0 ? (
        <TouchableOpacity
          onPress={onAddExercise}
          className="border-2 border-dashed border-gray-300 rounded-lg py-12 items-center bg-gray-50"
        >
          <MaterialIcons name="fitness-center" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 text-lg font-medium mt-2">
            Add your first exercise
          </Text>
          <Text className="text-gray-400 text-sm mt-1">
            Tap here to get started
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          {exercises.map((exercise, index) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < exercises.length - 1}
              canRemove={exercises.length > 1}
              onNameChange={(name) => onExerciseChange(exercise.id, name)}
              onRemove={() => onRemoveExercise(exercise.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}