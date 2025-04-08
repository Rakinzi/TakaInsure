import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPolicyById, PolicyWithProduct } from '../../../services/policyService';

export default function PolicyDetailsScreen() {
  const router = useRouter();
  const { policyId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState<PolicyWithProduct | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data from AsyncStorage
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          setUserData(JSON.parse(userDataStr));
        }
      
        // Load policy details
        if (policyId) {
          await loadPolicyData(policyId as string);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [policyId]);

  const loadPolicyData = async (id: string) => {
    try {
      setLoading(true);
      const policy = await getPolicyById(id);
      setPolicyData(policy);
    } catch (error) {
      console.error('Error loading policy data:', error);
      Alert.alert('Error', 'Failed to load policy details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPolicyDetails = () => {
    router.push({
      pathname: '/policy/blockchain-details',
      params: { policyId }
    });
  };

  const handleFileClaim = () => {
    router.push({
      pathname: '/claim/new',
      params: { policyId }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRemainingTerm = (endDate?: string) => {
    if (!endDate) return 'N/A';
    
    const end = new Date(endDate);
    const today = new Date();
    
    if (end < today) {
      return 'Expired';
    }
    
    const remainingDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${remainingDays} days`;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading policy details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Policy Details</Text>
        <Text className="text-gray-600 mb-6">
          Review your secure insurance policy
        </Text>

        {policyData ? (
          <>
            <View className="bg-secondary/10 rounded-xl p-5 mb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-primary font-bold">Policy ID:</Text>
                <Text className="text-secondary font-bold">{policyData.policy_id}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-primary font-bold">Status:</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-800 font-medium">{policyData.status.charAt(0).toUpperCase() + policyData.status.slice(1)}</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Coverage Details</Text>
              
              <View className="bg-light p-3 rounded-lg mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Package</Text>
                  <Text className="text-secondary font-bold">{policyData.insurance_product.product_name}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Coverage Amount</Text>
                  <Text className="text-secondary font-bold">${policyData.coverage_amount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Monthly Premium</Text>
                  <Text className="text-secondary font-bold">${policyData.premium_amount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-primary font-medium">Term</Text>
                  <Text className="text-secondary font-bold">{policyData.insurance_product.policy_term} months</Text>
                </View>
              </View>
              
              <View className="bg-light p-3 rounded-lg">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Start Date</Text>
                  <Text className="text-gray-700">{formatDate(policyData.start_date)}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">End Date</Text>
                  <Text className="text-gray-700">{formatDate(policyData.end_date)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-primary font-medium">Remaining Term</Text>
                  <Text className="text-gray-700">{getRemainingTerm(policyData.end_date)}</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Policy Description</Text>
              
              <Text className="text-gray-600 mb-3">
                {policyData.insurance_product.product_description}
              </Text>
              
              {policyData.insurance_product.eligibility_criteria && (
                <View className="mb-2">
                  <Text className="text-primary font-bold mb-1">Eligibility:</Text>
                  <Text className="text-gray-600">{policyData.insurance_product.eligibility_criteria}</Text>
                </View>
              )}
              
              {policyData.insurance_product.exclusions && (
                <View>
                  <Text className="text-primary font-bold mb-1">Exclusions:</Text>
                  <Text className="text-gray-600">{policyData.insurance_product.exclusions}</Text>
                </View>
              )}
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Policy Security</Text>
              
              <Text className="text-gray-600 mb-3">
                Your policy is securely stored in our database with enterprise-grade protection. This creates an immutable record that cannot be altered.
              </Text>
              
              <View className="bg-gray-50 p-3 rounded-lg mb-3">
                <Text className="text-gray-500">Policy Reference</Text>
                <Text className="text-gray-700 font-mono text-xs">{policyData.policy_id}</Text>
              </View>
              
              <TouchableOpacity
                onPress={handleViewPolicyDetails}
                className="bg-primary p-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">View Policy Details</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-4 mb-6">
              <TouchableOpacity
                onPress={handleFileClaim}
                className="bg-secondary flex-1 p-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold">File a Claim</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-primary flex-1 p-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold">Back</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-primary font-bold text-lg mb-2">Policy Not Found</Text>
            <Text className="text-center text-gray-600 mb-4">
              The policy with ID {policyId} could not be found.
            </Text>
            
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary p-3 rounded-lg items-center w-full"
            >
              <Text className="text-white font-medium">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}