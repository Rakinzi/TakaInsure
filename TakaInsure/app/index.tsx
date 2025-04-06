import { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-6">
        <Image
          source={require('../assets/images/takainsure.jpg')}
          className="w-full h-auto"
          resizeMode="contain"
        />
        {Platform.OS === "ios"  ? (
          <>
        <Text className="text-primary text-center text-lg">
        Expanding Access to Microinsurance for the 
        </Text>
        <Text className="text-primary text-center text-lg mb-8">
        Informal Sector
        </Text>
        </>
        ) :(
        <Text className="text-primary text-center text-lg mb-8">
          Expanding Access to Microinsurance for the Informal Sector
        </Text>
        )
        
        }

        
        {/*  */}

        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-secondary w-full py-4 rounded-xl items-center"
        >
          <Text className="text-light font-bold text-lg">Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}