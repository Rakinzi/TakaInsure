import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../../contexts/UserContext';

type PolicyData = {
  id: string;
  packageType: string;
  coverageAmount: number;
  premium: number;
  term: number;
  features: string[];
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: string;
  policyholderName: string;
  policyHolderId: string;
};

export default function PolicyDetailsScreen() {
  const router = useRouter();
  const { policyId } = useLocalSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);

  useEffect(() => {
    loadPolicyData();
  }, [policyId]);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch data from an API or blockchain
      // For demo purposes, we'll get the policy from AsyncStorage
      const policiesJson = await AsyncStorage.getItem('userPolicies');
      if (policiesJson) {
        const policies = JSON.parse(policiesJson);
        const policy = policies.find((p: PolicyData) => p.id === policyId);
        
        if (policy) {
          setPolicyData(policy);
        }
      }
    } catch (error) {
      console.error('Error loading policy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlockchainDetails = () => {
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

  const getRemainingTerm = (dateString?: string) => {
    if (!dateString || !policyData) return 'N/A';
    
    const startDate = new Date(dateString);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + policyData.term);
    
    const today = new Date();
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
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
          Review your blockchain-secured insurance policy
        </Text>

        {policyData ? (
          <>
            <View className="bg-secondary/10 rounded-xl p-5 mb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-primary font-bold">Policy ID:</Text>
                <Text className="text-secondary font-bold">{policyData.id}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-primary font-bold">Status:</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-800 font-medium">Active</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Coverage Details</Text>
              
              <View className="bg-light p-3 rounded-lg mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Package</Text>
                  <Text className="text-secondary font-bold">{policyData.packageType}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Coverage Amount</Text>
                  <Text className="text-secondary font-bold">${policyData.coverageAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Monthly Premium</Text>
                  <Text className="text-secondary font-bold">${policyData.premium.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-primary font-medium">Term</Text>
                  <Text className="text-secondary font-bold">{policyData.term} months</Text>
                </View>
              </View>
              
              <View className="bg-light p-3 rounded-lg">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-primary font-medium">Activation Date</Text>
                  <Text className="text-gray-700">{formatDate(policyData.timestamp)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-primary font-medium">Remaining Term</Text>
                  <Text className="text-gray-700">{getRemainingTerm(policyData.timestamp)}</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Covered Features</Text>
              
              <View className="ml-2">
                {policyData.features.map((feature, index) => (
                  <Text key={index} className="text-gray-600 mb-2">• {feature}</Text>
                ))}
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Blockchain Security</Text>
              
              <Text className="text-gray-600 mb-3">
                Your policy is secured on the blockchain for maximum transparency and security.
                This creates an immutable record that cannot be altered.
              </Text>
              
              {policyData.transactionHash ? (
                <View className="bg-gray-50 p-3 rounded-lg mb-3">
                  <Text className="text-gray-500">Transaction Hash</Text>
                  <Text className="text-gray-700 font-mono text-xs">{policyData.transactionHash}</Text>
                </View>
              ) : null}
              
              <TouchableOpacity
                onPress={handleViewBlockchainDetails}
                className="bg-primary p-3 rounded-lg items-center"
              >
                <Text className="text-white font-medium">View Blockchain Details</Text>
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