import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../../contexts/UserContext';

type PolicyData = {
  id: string;
  packageType: string;
  coverageAmount: number;
  premium: number;
  term: number;
  timestamp?: string;
};

export default function PolicyListScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyData[]>([]);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch data from an API or blockchain
      // For demo purposes, we'll get the policies from AsyncStorage
      const policiesJson = await AsyncStorage.getItem('userPolicies');
      if (policiesJson) {
        const parsedPolicies = JSON.parse(policiesJson);
        setPolicies(parsedPolicies);
      } else {
        // If no policies found, set empty array
        setPolicies([]);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPolicy = (policyId: string) => {
    router.push({
      pathname: '/(app)/policy/detail',
      params: { policyId }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderPolicyItem = ({ item }: { item: PolicyData }) => (
    <TouchableOpacity
      onPress={() => handleViewPolicy(item.id)}
      className="bg-white rounded-xl p-4 shadow-sm mb-4 border-l-4 border-secondary"
    >
      <View className="flex-row justify-between mb-1">
        <Text className="text-primary font-bold">{item.packageType} Plan</Text>
        <View className="bg-green-100 px-2 py-0.5 rounded-full">
          <Text className="text-green-800 text-xs font-medium">Active</Text>
        </View>
      </View>
      
      <Text className="text-gray-500 text-xs mb-2">Policy ID: {item.id}</Text>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Coverage</Text>
        <Text className="text-secondary font-medium">${item.coverageAmount.toLocaleString()}</Text>
      </View>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Premium</Text>
        <Text className="text-secondary font-medium">${item.premium.toLocaleString()}/month</Text>
      </View>
      
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Activation Date</Text>
        <Text className="text-gray-700">{formatDate(item.timestamp)}</Text>
      </View>
      
      <View className="mt-3 pt-2 border-t border-gray-200">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          <Text className="text-primary font-medium">Blockchain Secured</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <View className="p-6">
        <Text className="text-primary text-2xl font-bold mb-2">My Policies</Text>
        <Text className="text-gray-600 mb-6">
          Manage your active insurance policies
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading your policies...</Text>
        </View>
      ) : (
        <View className="flex-1 px-6">
          {policies.length > 0 ? (
            <FlatList
              data={policies}
              renderItem={renderPolicyItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-primary font-bold text-lg mb-2">No Policies Found</Text>
              <Text className="text-center text-gray-600 mb-6">
                You don't have any active insurance policies yet.
              </Text>
              
              <TouchableOpacity
                onPress={() => router.push('/claim/new')}
                className="bg-secondary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Get Insurance Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}