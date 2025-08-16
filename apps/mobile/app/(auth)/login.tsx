import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Auth from '../../components/Auth';

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1 justify-center">
        <Auth />
      </View>
    </SafeAreaView>
  );
}