import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TemplatesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-2xl font-bold mb-3 text-gray-800">Templates</Text>
        <Text className="text-base text-gray-600 text-center">
          Workout templates will be displayed here
        </Text>
      </View>
    </SafeAreaView>
  );
}