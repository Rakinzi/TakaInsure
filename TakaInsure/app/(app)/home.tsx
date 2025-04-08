import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabaseClient';
import { getPoliciesByPolicyholder } from '../../services/policyService';
import { getUserVehicles } from '../../services/vehicleService';
import { getUserClaims } from '../../services/claimService';

type UserData = {
  full_name: string;
  policyholder_id: string;
  contact_details?: string;
  date_of_birth?: string;
  address?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (userDataStr) {
        const parsedUserData = JSON.parse(userDataStr);
        setUserData(parsedUserData);
        
        // Now we have the user data, let's fetch their other information
        await Promise.all([
          fetchVehicles(parsedUserData.policyholder_id),
          fetchPolicies(parsedUserData.policyholder_id),
          fetchClaims()
        ]);
      } else {
        // Try to construct minimal user data from individual storage items
        const policyHolderId = await AsyncStorage.getItem('policyHolderId');
        const phoneNumber = await AsyncStorage.getItem('phoneNumber');
        
        if (policyHolderId && phoneNumber) {
          const minimalUserData = {
            policyholder_id: policyHolderId,
            full_name: 'User', // Default name
            contact_details: phoneNumber,
          };
          
          setUserData(minimalUserData);
          
          // Use the minimal user data to fetch other information
          await Promise.all([
            fetchVehicles(policyHolderId),
            fetchPolicies(policyHolderId),
            fetchClaims()
          ]);
        } else {
          console.log('No user data found in AsyncStorage');
          // If we can't get user data, redirect to login
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async (policyHolderId: string) => {
    try {
      const vehicles = await getUserVehicles();
      setVehicleCount(vehicles.length);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicleCount(0);
    }
  };

  const fetchPolicies = async (policyHolderId: string) => {
    try {
      const policies = await getPoliciesByPolicyholder(policyHolderId);
      setPolicyCount(policies.length);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicyCount(0);
    }
  };

  const fetchClaims = async () => {
    try {
      const claims = await getUserClaims();
      setClaimCount(claims.length);
    } catch (error) {
      console.error('Error fetching claims:', error);
      setClaimCount(0);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'policyHolderId', 'phoneNumber']);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
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
              <Text className="text-light text-2xl font-bold">{userData?.full_name || 'User'}</Text>
            </View>
            <TouchableOpacity onPress={handleProfile} className="bg-white p-2 rounded-full">
              <Image
                source={require('../../assets/images/logo.png')}
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

        {/* Stats Section */}
        <View className="p-6">
          <Text className="text-primary text-xl font-bold mb-4">Account Summary</Text>
          
          <View className="flex-row space-x-4 mb-6 ">
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center mr-4">
              <Text className="text-secondary text-2xl font-bold">{vehicleCount}</Text>
              <Text className="text-primary">Vehicles</Text>
            </View>
            
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center mr-4">
              <Text className="text-secondary text-2xl font-bold">{policyCount}</Text>
              <Text className="text-primary">Policies</Text>
            </View>
            
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center">
              <Text className="text-secondary text-2xl font-bold">{claimCount}</Text>
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
                source={require('../../assets/images/claim.png')}
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
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-black"
          >
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/compliant.png')}
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
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
          >
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/electric-car.png')}
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
                source={require('../../assets/images/secured.png')}
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
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
          >
           <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/settings.png')}
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

        {/* Database Information  */}
        {/* <View className="p-6 pt-0">
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
        </View> */}

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