import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPolicyById, getPolicyActivity } from '../../../services/policyService';

type ActivityItem = {
  type: string;
  timestamp: string;
  id: string;
  blockNumber: number;
  amount?: number;
};

export default function PolicyDetailsScreen() {
  const router = useRouter();
  const { policyId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState<any>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (policyId) {
      loadPolicyData(policyId as string);
    }
  }, [policyId]);

  const loadPolicyData = async (id: string) => {
    try {
      setLoading(true);
      
      // Get policy data
      const policy = await getPolicyById(id);
      setPolicyData(policy);
      
      // Get policy activity
      const activities = await getPolicyActivity(id);
      setActivityHistory(activities);
    } catch (error) {
      console.error('Error loading policy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventDescription = (eventType: string) => {
    switch (eventType) {
      case 'PolicyCreated':
        return 'Policy created and recorded in database';
      case 'PremiumPaid':
        return 'Premium payment processed';
      case 'PolicyUpdated':
        return 'Policy details updated';
      case 'ClaimFiled':
        return 'New claim filed against policy';
      case 'ClaimStatusUpdated':
        return 'Claim status updated';
      case 'ClaimPaid':
        return 'Claim payment processed';
      case 'ClaimApproved':
        return 'Claim has been approved';
      default:
        return 'Transaction recorded';
    }
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
          Detailed record of your insurance policy
        </Text>

        {policyData ? (
          <>
            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Policy Data</Text>
              
              <View className="bg-light p-3 rounded-lg mb-3">
                <View className="mb-2">
                  <Text className="text-gray-500">Policy ID</Text>
                  <Text className="text-primary font-medium">{policyData.policy_id}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Package Type</Text>
                  <Text className="text-primary font-medium">{policyData.insurance_product.product_name}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Coverage Amount</Text>
                  <Text className="text-primary font-medium">${policyData.coverage_amount.toLocaleString()}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Premium</Text>
                  <Text className="text-primary font-medium">${policyData.premium_amount.toLocaleString()}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-500">Policy Term</Text>
                  <Text className="text-primary font-medium">{policyData.insurance_product.policy_term} months</Text>
                </View>
              </View>
              
              <View className="bg-gray-50 p-4 rounded-lg mb-3">
                <Text className="text-primary font-medium mb-1">Database Reference ID</Text>
                <Text className="text-gray-600 font-mono text-xs">{policyData.policy_id}</Text>
              </View>
              
              <View className="bg-secondary/10 p-3 rounded-lg">
                <Text className="text-primary font-medium mb-1">Security Features</Text>
                <View className="ml-2">
                  <Text className="text-gray-600 mb-1">• Tamper-proof database records</Text>
                  <Text className="text-gray-600 mb-1">• Transparent policy terms</Text>
                  <Text className="text-gray-600 mb-1">• Automated claim processing</Text>
                  <Text className="text-gray-600 mb-1">• Fast payment settlements</Text>
                  <Text className="text-gray-600 mb-1">• Secure data encryption</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Policy Activity</Text>
              
              {activityHistory.length > 0 ? (
                activityHistory.map((activity, index) => (
                  <View key={index} className="bg-light p-3 rounded-lg mb-3">
                    <View className="flex-row justify-between">
                      <Text className="text-primary font-medium">{getEventDescription(activity.type)}</Text>
                      <Text className="text-gray-500 text-xs">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View className="mt-2">
                      <Text className="text-gray-500 text-xs">Reference ID</Text>
                      <Text className="text-gray-600 font-mono text-xs">{activity.id}</Text>
                    </View>
                    
                    <View className="flex-row mt-2">
                      <View className="flex-1">
                        <Text className="text-gray-500 text-xs">Entry ID</Text>
                        <Text className="text-gray-600">{activity.blockNumber}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-500 text-xs">Time</Text>
                        <Text className="text-gray-600">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                    
                    {activity.amount && (
                      <View className="mt-2">
                        <Text className="text-gray-500 text-xs">Amount</Text>
                        <Text className="text-gray-600">${activity.amount.toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text className="text-gray-600 text-center py-4">No activity history available</Text>
              )}
            </View>

            <View className="bg-primary/10 rounded-xl p-5 mb-6">
              <Text className="text-primary font-semibold mb-2">Database Security</Text>
              <Text className="text-gray-700 mb-3">
                Our secure database system provides a tamper-resistant record of all policy transactions with:
              </Text>
              <View className="ml-3">
                <Text className="text-gray-600 mb-1">• Your policy information cannot be altered or deleted</Text>
                <Text className="text-gray-600 mb-1">• Terms and conditions are transparent</Text>
                <Text className="text-gray-600 mb-1">• Claim processing is automated and fair</Text>
                <Text className="text-gray-600">• You can verify all transactions in your account</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-primary font-bold text-lg mb-2">Policy Not Found</Text>
            <Text className="text-center text-gray-600">
              The policy details could not be found in our database.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary rounded-xl p-4 items-center mb-6"
        >
          <Text className="text-white font-bold">Back to Policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}