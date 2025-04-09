import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserClaims } from '../../../services/claimService';
import { formatZimbabwePhone } from '../../../services/supabaseAuth';

type Claim = {
  claim_id: string;
  incident_date: string;
  incident_location: string;
  incident_description: string;
  claim_amount: number;
  claim_status: string;
  created_at: string;
  evidence_urls: any;
  policy: {
    policy_id: string;
    coverage_amount: number;
    insurance_product: {
      product_name: string;
    };
  };
  vehicle?: {
    car_make: string;
    car_model: string;
    plate_number: string;
  };
};

export default function ClaimsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const claimData = await getUserClaims();
      setClaims(claimData);
    } catch (error) {
      console.error('Error loading claims:', error);
      Alert.alert('Error', 'Failed to load your claims. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaim = (claimId: string) => {
    router.push({
      pathname: '/claim/details',
      params: { claimId }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    // Make first letter uppercase, rest lowercase
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const renderClaimItem = ({ item }: { item: Claim }) => (
    <TouchableOpacity
      onPress={() => handleViewClaim(item.claim_id)}
      className="bg-white rounded-xl p-4 shadow-sm mb-4 border-l-4 border-secondary"
    >
      <View className="flex-row justify-between mb-1">
        <Text className="text-primary font-bold">{item.policy?.insurance_product?.product_name || 'Insurance Claim'}</Text>
        <View className={`px-2 py-0.5 rounded-full ${getStatusColor(item.claim_status)}`}>
          <Text className={`text-xs font-medium ${getStatusColor(item.claim_status)}`}>{getStatusLabel(item.claim_status)}</Text>
        </View>
      </View>
      
      <Text className="text-gray-500 text-xs mb-2">Claim ID: {item.claim_id.substring(0, 8)}...</Text>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Date of Incident</Text>
        <Text className="text-secondary font-medium">{formatDate(item.incident_date)}</Text>
      </View>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Claim Amount</Text>
        <Text className="text-secondary font-medium">${item.claim_amount ? item.claim_amount.toLocaleString() : 'Pending'}</Text>
      </View>
      
      {item.vehicle && (
        <View className="flex-row justify-between">
          <Text className="text-gray-600">Vehicle</Text>
          <Text className="text-gray-700">{item.vehicle.car_make} {item.vehicle.car_model}</Text>
        </View>
      )}
      
      <View className="mt-3 pt-2 border-t border-gray-200">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          <Text className="text-primary font-medium">Tap to view details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <View className="p-6">
        <Text className="text-primary text-2xl font-bold mb-2">My Claims</Text>
        <Text className="text-gray-600 mb-6">
          View and manage your insurance claims
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading your claims...</Text>
        </View>
      ) : (
        <View className="flex-1 px-6">
          {claims.length > 0 ? (
            <FlatList
              data={claims}
              renderItem={renderClaimItem}
              keyExtractor={(item) => item.claim_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshing={loading}
              onRefresh={loadClaims}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-primary font-bold text-lg mb-2">No Claims Found</Text>
              <Text className="text-center text-gray-600 mb-6">
                You haven't filed any insurance claims yet.
              </Text>
              
              <TouchableOpacity
                onPress={() => router.push('/claim/new')}
                className="bg-secondary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">File a New Claim</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}