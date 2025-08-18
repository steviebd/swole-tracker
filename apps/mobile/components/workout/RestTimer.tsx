import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface RestTimerProps {
  initialTime: number; // in seconds
  onClose: () => void;
  onComplete: () => void;
}

export function RestTimer({ initialTime, onClose, onComplete }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Vibrate when timer completes
            Vibration.vibrate([0, 500, 200, 500]);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, isPaused, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const addTime = (seconds: number) => {
    setTimeLeft(prev => prev + seconds);
  };

  const resetTimer = () => {
    setTimeLeft(initialTime);
    setIsRunning(true);
    setIsPaused(false);
  };

  const progressPercentage = ((initialTime - timeLeft) / initialTime) * 100;

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
            <Text className="text-lg font-semibold text-gray-900">Rest Timer</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Timer Display */}
          <View className="items-center mb-6">
            {/* Circular Progress */}
            <View className="relative mb-4">
              <View className="w-32 h-32 rounded-full border-8 border-gray-200 items-center justify-center">
                <Text className="text-3xl font-bold text-gray-900">
                  {formatTime(timeLeft)}
                </Text>
              </View>
              <View 
                className="absolute inset-0 w-32 h-32 rounded-full border-8 border-blue-600"
                style={{
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  transform: [{ rotate: `${progressPercentage * 3.6}deg` }]
                }}
              />
            </View>

            {/* Status */}
            <Text className="text-sm text-gray-500">
              {timeLeft === 0 ? 'Rest Complete!' : isPaused ? 'Paused' : 'Resting...'}
            </Text>
          </View>

          {/* Controls */}
          <View className="space-y-3">
            {/* Play/Pause and Reset */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={togglePause}
                className="flex-1 bg-blue-600 rounded-lg py-3 flex-row items-center justify-center"
              >
                <MaterialIcons 
                  name={isPaused ? 'play-arrow' : 'pause'} 
                  size={20} 
                  color="white" 
                />
                <Text className="text-white font-medium ml-2">
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={resetTimer}
                className="flex-1 bg-gray-600 rounded-lg py-3 flex-row items-center justify-center"
              >
                <MaterialIcons name="refresh" size={20} color="white" />
                <Text className="text-white font-medium ml-2">Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Add Time Buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => addTime(15)}
                className="flex-1 bg-green-100 rounded-lg py-2"
              >
                <Text className="text-green-800 text-center font-medium">+15s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => addTime(30)}
                className="flex-1 bg-green-100 rounded-lg py-2"
              >
                <Text className="text-green-800 text-center font-medium">+30s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => addTime(60)}
                className="flex-1 bg-green-100 rounded-lg py-2"
              >
                <Text className="text-green-800 text-center font-medium">+1m</Text>
              </TouchableOpacity>
            </View>

            {/* Skip Button */}
            <TouchableOpacity
              onPress={() => {
                setTimeLeft(0);
                setIsRunning(false);
                onComplete();
              }}
              className="bg-orange-100 rounded-lg py-3"
            >
              <Text className="text-orange-800 text-center font-medium">
                Skip Rest
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}