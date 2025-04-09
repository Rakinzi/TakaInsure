import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserPaymentHistory } from '../../../services/paymentService';
import { PaymentRecord } from '../../../services/paymentService';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const history = await getUserPaymentHistory();
      setPayments(history);
    } catch (error) {
      console.error('Error loading payment history:', error);
      Alert.alert('Error', 'Failed to load your payment history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => (
    <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-primary font-bold">Premium Payment</Text>
        <View className={`px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
          <Text className={`text-xs font-medium ${getStatusColor(item.status)}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>
      
      <Text className="text-gray-500 text-xs mb-3">
        Ref: {item.transaction_reference.substring(0, 18)}...
      </Text>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Amount</Text>
        <Text className="text-secondary font-bold">{formatAmount(item.amount)}</Text>
      </View>
      
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Date</Text>
        <Text className="text-gray-700">{formatDate(item.payment_date)}</Text>
      </View>
      
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Method</Text>
        <Text className="text-gray-700">
          {item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <View className="p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Payment History</Text>
        <Text className="text-gray-600 mb-6">
          View all your insurance premium payments
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading payment history...</Text>
        </View>
      ) : (
        <View className="flex-1 px-6">
          {payments.length > 0 ? (
            <FlatList
              data={payments}
              renderItem={renderPaymentItem}
              keyExtractor={(item, index) => 
                item.payment_id || item.transaction_reference || `payment-${index}`
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshing={loading}
              onRefresh={loadPaymentHistory}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-primary font-bold text-lg mb-2">No Payments Found</Text>
              <Text className="text-center text-gray-600 mb-6">
                No premium payments have been recorded yet.
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}