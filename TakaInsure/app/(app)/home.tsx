import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../contexts/UserContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading, logout } = useUser();

  const handleNewClaim = () => {
    router.push('/claim/new');
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
              <Text className="text-light text-2xl font-bold">{user?.full_name || 'User'}</Text>
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
            <Text className="text-secondary text-lg">{user?.policyholder_id || 'Not available'}</Text>
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
              <Text className="text-primary text-lg font-bold">Claim History</Text>
              <Text className="text-gray-500">View your past and ongoing claims</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
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
              <Text className="text-primary text-lg font-bold">My Insurance</Text>
              <Text className="text-gray-500">View your active insurance packages</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View className="p-6">
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
            onPress={logout}
            className="bg-tertiary/20 p-4 rounded-xl items-center"
          >
            <Text className="text-tertiary font-bold">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}