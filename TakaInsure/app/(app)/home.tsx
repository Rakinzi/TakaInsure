import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../contexts/UserContext';
import { getUserVehicles } from '../../services/vehicleService';
import { getPoliciesByPolicyholder, PolicyWithProduct } from '../../services/policyService';
import { getUserClaims, ClaimWithDetails } from '../../services/claimService';
import { VehicleInfo } from '../../types/vehicle';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [policies, setPolicies] = useState<PolicyWithProduct[]>([]);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!user || !user.policyholder_id) {
        console.error('No user data found');
        return;
      }
      
      // Load vehicles
      const vehicleData = await getUserVehicles();
      setVehicles(vehicleData);
      
      // Load policies
      const policyData = await getPoliciesByPolicyholder(user.policyholder_id);
      setPolicies(policyData);
      
      // Load claims
      const claimData = await getUserClaims();
      setClaims(claimData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
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

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleViewVehicles = () => {
    router.push('/vehicle');
  };

  const handleViewClaims = () => {
    // We could implement a claims screen, but for now just show an alert
    Alert.alert(
      'Coming Soon',
      'The claims management screen is coming soon. Check back later!'
    );
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
            <TouchableOpacity onPress={handleProfile} className="bg-white p-2 rounded-full">
              <Image
                source={require('../../../assets/images/logo.png')}
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

        {/* Stats Section */}
        <View className="p-6">
          <Text className="text-primary text-xl font-bold mb-4">Account Summary</Text>
          
          <View className="flex-row space-x-4 mb-6">
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center">
              <Text className="text-secondary text-2xl font-bold">{vehicles.length}</Text>
              <Text className="text-primary">Vehicles</Text>
            </View>
            
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center">
              <Text className="text-secondary text-2xl font-bold">{policies.length}</Text>
              <Text className="text-primary">Policies</Text>
            </View>
            
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center">
              <Text className="text-secondary text-2xl font-bold">{claims.length}</Text>
              <Text className="text-primary">Claims</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="p-6 pt-0">
          <Text className="text-primary text-xl font-bold mb-4">Quick Actions</Text>
          
          <TouchableOpacity 
            onPress={handleNewClaim}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
          >
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../../assets/images/claim.png')}
                className="w-8 h-8"
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
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../../assets/images/compliant.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">My Policies</Text>
              <Text className="text-gray-500">View your secured database policies</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleViewVehicles}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-green-500"
          >
            <View className="bg-green-100 p-4 rounded-lg mr-4">
              <Image
                source={require('../../../assets/images/secured.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">My Vehicles</Text>
              <Text className="text-gray-500">Manage your registered vehicles</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleViewClaims}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-primary"
          >
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../../assets/images/secured.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">My Claims</Text>
              <Text className="text-gray-500">View your claim history and status</Text>
            </View>
          </TouchableOpacity>

          {/* Network Settings button in quick actions */}
          <TouchableOpacity 
            onPress={handleSettings}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-blue-500"
          >
            <View className="bg-blue-100 p-4 rounded-lg mr-4">
              <Image
                source={require('../../../assets/images/logo.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">Network Settings</Text>
              <Text className="text-gray-500">Configure API connection</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Database Information */}
        <View className="p-6 pt-0">
          <View className="bg-primary/10 p-4 rounded-xl mb-6">
            <Text className="text-primary font-bold mb-2">Secure Database Technology</Text>
            <Text className="text-gray-700 mb-3">
              All TakaInsure policies use secure database technology to ensure transparency, security, and faster claim settlements.
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