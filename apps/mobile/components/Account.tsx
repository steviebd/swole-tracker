import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { View, Alert, Text } from 'react-native';
import { Button, Input, LoadingScreen } from './ui';
import { useAuth } from './providers/AuthProvider';

export default function Account() {
  const { session, signOut, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session.user.id)
        .single();
        
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error Loading Profile', error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setUpdating(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session.user.id,
        username: username.trim(),
        website: website.trim(),
        avatar_url: avatarUrl.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error Updating Profile', error.message);
      }
    } finally {
      setUpdating(false);
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1">
        <LoadingScreen message="Loading profile..." backgroundColor="bg-gray-100" />
      </View>
    );
  }

  return (
    <View className="mt-10 p-6 bg-white mx-4 rounded-lg shadow-sm">
      <Text className="text-2xl font-bold text-center mb-6 text-gray-900">
        Profile
      </Text>
      
      <Input 
        label="Email" 
        value={session?.user?.email || ''} 
        editable={false}
        className="bg-gray-100"
        containerClassName="mb-4"
      />
      
      <Input 
        label="Username" 
        value={username} 
        onChangeText={setUsername}
        placeholder="Enter your username"
        editable={!updating}
        containerClassName="mb-4"
      />
      
      <Input 
        label="Website" 
        value={website} 
        onChangeText={setWebsite}
        placeholder="https://your-website.com"
        autoCapitalize="none"
        keyboardType="url"
        editable={!updating}
        containerClassName="mb-6"
      />

      <Button
        title={updating ? 'Updating...' : 'Update Profile'}
        onPress={updateProfile}
        loading={updating}
        disabled={updating}
        className="mb-3"
      />

      <Button 
        title={authLoading ? 'Signing Out...' : 'Sign Out'} 
        variant="outline"
        onPress={handleSignOut}
        loading={authLoading}
        disabled={authLoading}
      />
    </View>
  );
}

