import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface RPESelectorProps {
  currentRPE: number | null;
  onSelect: (rpe: number) => void;
  onClose: () => void;
}

const RPE_DESCRIPTIONS = {
  6: 'Very, very light',
  7: 'Very light',
  8: 'Light',
  9: 'Moderate',
  10: 'Hard',
};

export function RPESelector({ currentRPE, onSelect, onClose }: RPESelectorProps) {
  const rpeValues = [6, 7, 8, 9, 10];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="bg-white rounded-2xl p-6 m-4 w-80 max-w-full">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-semibold text-gray-900">
              Rate of Perceived Exertion
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* RPE Scale Description */}
          <Text className="text-sm text-gray-600 mb-6 text-center">
            Rate how hard that set felt on a scale of 6-10
          </Text>

          {/* RPE Options */}
          <View className="space-y-3">
            {rpeValues.map((rpe) => (
              <TouchableOpacity
                key={rpe}
                onPress={() => onSelect(rpe)}
                className={`p-4 rounded-lg border-2 ${
                  currentRPE === rpe
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                      currentRPE === rpe ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <Text className={`font-bold ${
                        currentRPE === rpe ? 'text-white' : 'text-gray-700'
                      }`}>
                        {rpe}
                      </Text>
                    </View>
                    <View>
                      <Text className={`font-medium ${
                        currentRPE === rpe ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        RPE {rpe}
                      </Text>
                      <Text className={`text-sm ${
                        currentRPE === rpe ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {RPE_DESCRIPTIONS[rpe as keyof typeof RPE_DESCRIPTIONS]}
                      </Text>
                    </View>
                  </View>
                  {currentRPE === rpe && (
                    <MaterialIcons name="check" size={20} color="#2563EB" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Clear Selection */}
          {currentRPE && (
            <TouchableOpacity
              onPress={() => onSelect(0)} // Use 0 to represent no RPE
              className="mt-4 p-3 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700 text-center font-medium">
                Clear RPE
              </Text>
            </TouchableOpacity>
          )}

          {/* Info */}
          <View className="mt-6 p-3 bg-blue-50 rounded-lg">
            <Text className="text-xs text-blue-800 text-center">
              💡 RPE helps track exercise intensity and plan future workouts
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}