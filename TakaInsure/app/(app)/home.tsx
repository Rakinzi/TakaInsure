import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserData = {
  full_name: string;
  policyholder_id: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (userDataStr) {
        const parsedUserData = JSON.parse(userDataStr);
        console.log('User data loaded successfully');
        setUserData(parsedUserData);
      } else {
        console.log('No user data found in AsyncStorage');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      // Always set loading to false, even if there's an error
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNewClaim = () => {
    router.push('/claim/new');
  };
  
  const handleViewPolicies = () => {
    router.push('/policy');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading your dashboard...</Text>
          
          {/* Debug button to bypass loading state */}
          <TouchableOpacity 
            onPress={() => setLoading(false)} 
            className="mt-8 bg-gray-500 p-3 rounded-lg"
          >
            <Text className="text-white">Continue to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="bg-primary p-6 rounded-b-3xl shadow-md">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-light text-lg">Welcome back,</Text>
              <Text className="text-light text-2xl font-bold">{userData?.full_name || 'User'}</Text>
            </View>
            <TouchableOpacity onPress={handleProfile} className="bg-tertiary p-2 rounded-full">
              <Image
                source={require('../../assets/images/react-logo.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          
          <View className="bg-light p-4 rounded-xl">
            <Text className="text-primary font-bold mb-1">Policy Holder ID</Text>
            <Text className="text-secondary text-lg">{userData?.policyholder_id || 'Not available'}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="p-6">
          <Text className="text-primary text-xl font-bold mb-4">Quick Actions</Text>
          
          <TouchableOpacity 
            onPress={handleNewClaim}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
          >
            <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/react-logo.png')}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">File New Claim</Text>
              <Text className="text-gray-500">Upload evidence and get instant analysis</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleViewPolicies}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-tertiary"
          >
            <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/react-logo.png')}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">My Policies</Text>
              <Text className="text-gray-500">View your blockchain-secured policies</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {}}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-primary"
          >
            <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/react-logo.png')}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">My Claims</Text>
              <Text className="text-gray-500">View your claim history and status</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Blockchain Information */}
        <View className="p-6 pt-0">
          <View className="bg-primary/10 p-4 rounded-xl mb-6">
            <Text className="text-primary font-bold mb-2">Blockchain Technology</Text>
            <Text className="text-gray-700 mb-3">
              All TakaInsure policies use blockchain technology to ensure transparency, security, and faster claim settlements.
            </Text>
            <TouchableOpacity 
              onPress={handleViewPolicies}
              className="bg-primary py-2 px-4 rounded-lg self-start"
            >
              <Text className="text-white font-semibold">View Your Policies</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Section */}
        <View className="p-6 pt-0">
          <Text className="text-primary text-xl font-bold mb-4">Information</Text>
          
          <View className="bg-secondary/10 p-4 rounded-xl mb-6">
            <Text className="text-primary font-bold mb-2">Need Help?</Text>
            <Text className="text-gray-700 mb-3">
              Contact our support team via WhatsApp for immediate assistance.
            </Text>
            <TouchableOpacity className="bg-secondary py-2 px-4 rounded-lg self-start">
              <Text className="text-white font-semibold">Contact Support</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-tertiary/20 p-4 rounded-xl items-center"
          >
            <Text className="text-tertiary font-bold">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}