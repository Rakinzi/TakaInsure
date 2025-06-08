import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabaseClient';
import { getPoliciesByPolicyholder } from '../../services/policyService';
import { getUserVehicles } from '../../services/vehicleService';
import { getUserClaims } from '../../services/claimService';
import { checkDailyPremiumPayment } from '../../services/paymentService';
import PremiumPaymentModal from '../../components/payment/PremiumPaymentModal';
import * as Speech from 'expo-speech';



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
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDue, setPaymentDue] = useState(false);
  const [dailyPremiumAmount, setDailyPremiumAmount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  // Check for daily payment on component mount
  useEffect(() => {
    if (!loading && userData) {
      checkDailyPayment();
    }
  }, [loading, userData]);

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

  // Add refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reload all data
      await loadUserData();
      
      // After user data is loaded, check for daily payment
      if (userData) {
        await checkDailyPayment();
      }
      
      // Show refresh feedback to user
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Refresh Failed', 'Unable to refresh your data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [userData]);

  const checkDailyPayment = async () => {
    try {
      // Check if daily payment is needed
      const paymentNeeded = await checkDailyPremiumPayment();

      if (paymentNeeded) {
        console.log('Daily premium payment is needed');

        // Calculate the daily premium amount
        // In a real app, this would come from the backend
        // For this demo, we'll get active policies and calculate it

        const { data: policies } = await supabase
          .from('policy')
          .select('premium_amount')
          .eq('policyholder_id', userData?.policyholder_id)
          .eq('status', 'active');

        if (policies && policies.length > 0) {
          // Calculate total monthly premium
          const totalMonthlyPremium = policies.reduce(
            (sum, policy) => sum + (policy.premium_amount || 0),
            0
          );

          // Calculate daily amount (monthly amount / 30 days)
          const dailyAmount = totalMonthlyPremium / 30;

          // Set state
          setDailyPremiumAmount(Math.round(dailyAmount * 100) / 100);
          setPaymentDue(true);
          setShowPaymentModal(true);
        }
      } else {
        // Reset payment due state if no payment is needed
        // This ensures that after a successful payment and refresh, the banner disappears
        setPaymentDue(false);
      }
    } catch (error) {
      console.error('Error checking daily payment:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentDue(false);
    // Optionally show a success message or update UI
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
      await AsyncStorage.multiRemove(['userToken', 'userData', 'policyHolderId', 'phoneNumber', 'lastPremiumPaymentDate']);
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
    router.push('/claim/list');
  };

  const handleViewPayments = () => {
    router.push('/payments');
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2962ff']} // Use your primary color here
            tintColor={'#2962ff'} // For iOS
          />
        }
      >
        {/* Loading indicator */}
        {loading && !refreshing && (
          <View className="absolute w-full h-full items-center justify-center bg-black/10 z-10">
            <ActivityIndicator size="large" color="#2962ff" />
          </View>
        )}

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

        {/* Payment Due Banner (if payment is due) */}
        {paymentDue && (
          <TouchableOpacity
            onPress={() => setShowPaymentModal(true)}
            className="mx-6 mt-4 bg-yellow-100 p-4 rounded-xl border border-yellow-300"
          >
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-yellow-800 font-medium flex-1">
                Daily premium payment of ${dailyPremiumAmount.toFixed(2)} is due
              </Text>
              <Text className="text-secondary font-bold">Pay Now</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Section */}
        <View className="p-6">
          <Text className="text-primary text-xl font-bold mb-4">Account Summary</Text>

          <View className="flex-row space-x-4 mb-6 ">
            <TouchableOpacity
              onLongPress={() => Speech.speak("You have " + vehicleCount + " vehicles registered")}
              className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center mr-4">
              <Text className="text-secondary text-2xl font-bold">{vehicleCount}</Text>
              <Text className="text-primary">Vehicles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onLongPress={() => Speech.speak("You have " + policyCount + " policies registered")}
              className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center mr-4">
              <Text className="text-secondary text-2xl font-bold">{policyCount}</Text>
              <Text className="text-primary">Policies</Text>
            </TouchableOpacity>

            <TouchableOpacity
            onLongPress={()=> Speech.speak("You have " + claimCount + " claims registered")}
            className="flex-1 bg-white p-4 rounded-xl shadow-sm items-center">
              <Text className="text-secondary text-2xl font-bold">{claimCount}</Text>
              <Text className="text-primary">Claims</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="p-6 pt-0">
          <Text className="text-primary text-xl font-bold mb-4">Quick Actions</Text>

          <TouchableOpacity
            onPress={handleNewClaim}
            onLongPress={() => Speech.speak("File New Claim. Upload evidence and get instant analysis")}
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
            onLongPress={() => Speech.speak("My Policies. View your secured database policies")}
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
            onLongPress={() => Speech.speak("My Vehicles. Manage your registered vehicles")}
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
            onLongPress={() => Speech.speak("My Claims. View your claim history and status")}
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

          {/* Payment History */}
          <TouchableOpacity
            onPress={handleViewPayments}
            onLongPress={() => Speech.speak("Payment History. Track your premium payments")}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
          >
            <View className="bg-tertiary/20 p-4 rounded-lg mr-4">
              <Image
                source={require('../../assets/images/transactionshistory.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-primary text-lg font-bold">Payment History</Text>
              <Text className="text-gray-500">Track your premium payments</Text>
            </View>
          </TouchableOpacity>

          {/* Network Settings button in quick actions */}
          <TouchableOpacity
            onPress={handleSettings}
            onLongPress={() => Speech.speak("Network Settings. Configure API connection")}
            className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-black"
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

      {/* Premium Payment Modal */}
      <PremiumPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={dailyPremiumAmount}
      />
    </SafeAreaView>
  );
}