import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Account from '../../components/Account';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1">
        <Account />
      </View>
    </SafeAreaView>
  );
}