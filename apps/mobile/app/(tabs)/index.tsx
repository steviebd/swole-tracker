import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TemplatesList } from '../../components/templates/TemplatesList';

export default function TemplatesScreen() {
  const router = useRouter();

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900">Templates</Text>
          <TouchableOpacity
            onPress={handleCreateTemplate}
            className="bg-blue-600 rounded-lg px-3 py-2"
          >
            <Text className="text-white font-medium text-sm">+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Templates List */}
      <TemplatesList />
    </SafeAreaView>
  );
}