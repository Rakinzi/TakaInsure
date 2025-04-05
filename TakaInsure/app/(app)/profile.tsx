import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../contexts/UserContext';

export default function ProfileScreen() {
  const { user, loading, logout } = useUser();

  const renderProfileInfo = () => {
    if (!user) return null;

    return (
      <>
        <View className="items-center mb-6">
          <View className="bg-secondary rounded-full p-1">
            <Image
              source={require('../../assets/images/react-logo.png')}
              className="w-24 h-24 rounded-full"
            />
          </View>
          <Text className="text-primary text-2xl font-bold mt-4">{user.full_name}</Text>
          <View className="bg-secondary/20 rounded-full px-4 py-1 mt-2">
            <Text className="text-secondary font-medium">Policyholder</Text>
          </View>
        </View>

        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-4">Personal Information</Text>
          
          <View className="mb-3">
            <Text className="text-gray-500">Policy Holder ID</Text>
            <Text className="text-primary font-medium">{user.policyholder_id}</Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-gray-500">Phone Number</Text>
            <Text className="text-primary font-medium">{user.contact_details}</Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-gray-500">Date of Birth</Text>
            <Text className="text-primary font-medium">{user.date_of_birth || 'Not provided'}</Text>
          </View>
          
          <View>
            <Text className="text-gray-500">Address</Text>
            <Text className="text-primary font-medium">{user.address || 'Not provided'}</Text>
          </View>
        </View>

        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-4">Insurance Summary</Text>
          
          <View className="flex-row">
            <View className="flex-1 bg-secondary/10 p-4 rounded-lg mr-2 items-center">
              <Text className="text-secondary text-2xl font-bold">{user.active_policies_count || 0}</Text>
              <Text className="text-primary font-medium">Active Policies</Text>
            </View>
            
            <View className="flex-1 bg-tertiary/10 p-4 rounded-lg ml-2 items-center">
              <Text className="text-tertiary text-2xl font-bold">{user.active_claims_count || 0}</Text>
              <Text className="text-primary font-medium">Active Claims</Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-4">Blockchain Transparency</Text>
          <Text className="text-gray-600 mb-3">
            Your insurance policies and claims are recorded on blockchain for transparency and security.
          </Text>
          
          <TouchableOpacity className="bg-primary p-3 rounded-lg flex-row justify-center items-center">
            <Text className="text-white font-medium ml-2">View Blockchain Records</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={logout}
          className="bg-tertiary/20 p-4 rounded-xl items-center mb-6"
        >
          <Text className="text-tertiary font-bold">Logout</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-6">My Profile</Text>

        {loading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#8E1616" />
            <Text className="text-gray-600 mt-4">Loading profile information...</Text>
          </View>
        ) : (
          renderProfileInfo()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}