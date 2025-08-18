import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SetInput } from '../../lib/shared-types';

interface SetInputRowProps {
  set: SetInput;
  setIndex: number;
  exerciseIndex: number;
  onUpdate: (exerciseIndex: number, setIndex: number, updates: Partial<SetInput>) => void;
  onRemove: (exerciseIndex: number, setIndex: number) => void;
  onCompleted: (exerciseIndex: number, setIndex: number) => void;
  onStartRestTimer: (seconds?: number) => void;
}

export function SetInputRow({
  set,
  setIndex,
  exerciseIndex,
  onUpdate,
  onRemove,
  onCompleted,
  onStartRestTimer,
}: SetInputRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localWeight, setLocalWeight] = useState(set.weight?.toString() || '');
  const [localReps, setLocalReps] = useState(set.reps?.toString() || '');

  const isCompleted = !!(set.weight && set.reps);

  const handleWeightChange = (text: string) => {
    setLocalWeight(text);
    const weight = parseFloat(text);
    if (!isNaN(weight) && weight > 0) {
      onUpdate(exerciseIndex, setIndex, { weight });
    } else if (text === '') {
      onUpdate(exerciseIndex, setIndex, { weight: undefined });
    }
  };

  const handleRepsChange = (text: string) => {
    setLocalReps(text);
    const reps = parseInt(text, 10);
    if (!isNaN(reps) && reps > 0) {
      onUpdate(exerciseIndex, setIndex, { reps });
    } else if (text === '') {
      onUpdate(exerciseIndex, setIndex, { reps: undefined });
    }
  };

  const handleRPEPress = () => {
    Alert.prompt(
      'Rate of Perceived Exertion',
      'Enter RPE (6-10)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: (value) => {
            const rpe = parseInt(value || '', 10);
            if (!isNaN(rpe) && rpe >= 6 && rpe <= 10) {
              onUpdate(exerciseIndex, setIndex, { rpe });
            }
          },
        },
      ],
      'plain-text',
      set.rpe?.toString() || ''
    );
  };

  const handleSetComplete = () => {
    if (set.weight && set.reps) {
      onCompleted(exerciseIndex, setIndex);
      onStartRestTimer(set.rest || 90);
    }
  };

  const handleRemoveSet = () => {
    Alert.alert(
      'Remove Set',
      'Are you sure you want to remove this set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(exerciseIndex, setIndex),
        },
      ]
    );
  };

  return (
    <View className={`flex-row items-center py-2 ${isCompleted ? 'bg-green-50' : ''}`}>
      {/* Set Number */}
      <View className="w-12 items-center">
        <Text className="text-sm font-medium text-gray-700">
          {setIndex + 1}
        </Text>
      </View>

      {/* Weight Input */}
      <View className="flex-1 px-2">
        <TextInput
          value={localWeight}
          onChangeText={handleWeightChange}
          placeholder="0"
          keyboardType="numeric"
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-center text-sm"
          selectTextOnFocus
        />
      </View>

      {/* Reps Input */}
      <View className="flex-1 px-2">
        <TextInput
          value={localReps}
          onChangeText={handleRepsChange}
          placeholder="0"
          keyboardType="numeric"
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-center text-sm"
          selectTextOnFocus
        />
      </View>

      {/* RPE Button */}
      <TouchableOpacity onPress={handleRPEPress} className="w-12 items-center">
        <View className={`w-8 h-8 rounded-full items-center justify-center ${
          set.rpe ? 'bg-blue-600' : 'bg-gray-200'
        }`}>
          <Text className={`text-xs font-medium ${
            set.rpe ? 'text-white' : 'text-gray-500'
          }`}>
            {set.rpe || '?'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View className="w-8 items-center">
        {isCompleted ? (
          <TouchableOpacity onPress={handleSetComplete}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleRemoveSet}>
            <MaterialIcons name="remove-circle-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}