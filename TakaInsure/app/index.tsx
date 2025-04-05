import { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        // User is already logged in, redirect to home screen
        setTimeout(() => {
          router.replace('/(app)/home');
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const handleGetStarted = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-center items-center p-6">
        <Image
          source={require('../assets/images/react-logo.png')}
          className="w-32 h-32 mb-8"
          resizeMode="contain"
        />
        <Text className="text-4xl font-bold text-light mb-2">TakaInsure</Text>
        <Text className="text-light text-center text-lg mb-8">
          Expanding Access to Microinsurance for the Informal Sector
        </Text>
        
        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-tertiary w-full py-4 rounded-xl items-center"
        >
          <Text className="text-light font-bold text-lg">Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}