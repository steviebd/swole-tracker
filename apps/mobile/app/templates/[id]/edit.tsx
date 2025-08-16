import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';
import { TemplateForm } from '../../../components/templates/TemplateForm';
import { LoadingScreen } from '../../../components/ui';

export default function EditTemplateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const templateId = parseInt(id as string, 10);
  const { data: template, isLoading, error } = trpc.templates.getById.useQuery(
    { id: templateId },
    { enabled: !isNaN(templateId) }
  );

  if (isNaN(templateId)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl font-semibold text-red-600 mb-2">Invalid Template ID</Text>
          <Text className="text-gray-600 text-center mb-4">
            The template you are trying to edit could not be found.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !template) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl font-semibold text-red-600 mb-2">Template Not Found</Text>
          <Text className="text-gray-600 text-center mb-4">
            {error?.message || 'The template you are trying to edit could not be found.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 rounded-lg px-4 py-2"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-xl font-bold text-gray-900">Edit Template</Text>
        </View>
      </View>

      {/* Form */}
      <TemplateForm template={template} isEdit={true} />
    </SafeAreaView>
  );
}