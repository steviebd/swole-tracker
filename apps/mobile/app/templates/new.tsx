import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TemplateForm } from '../../components/templates/TemplateForm';

export default function NewTemplateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1"
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">New Template</Text>
        </View>
      </View>

      {/* Form */}
      <TemplateForm />
    </SafeAreaView>
  );
}