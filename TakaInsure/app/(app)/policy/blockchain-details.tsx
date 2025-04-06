import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import blockchainService from '../../../services/blockchainService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TransactionHistory = {
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  eventName: string;
};

export default function BlockchainDetailsScreen() {
  const router = useRouter();
  const { policyId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState<any>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);

  useEffect(() => {
    loadPolicyData();
    generateMockTransactionHistory();
  }, [policyId]);

  const loadPolicyData = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch data from the blockchain
      // For demo purposes, we'll get the policy from AsyncStorage
      const policiesJson = await AsyncStorage.getItem('userPolicies');
      if (policiesJson) {
        const policies = JSON.parse(policiesJson);
        const policy = policies.find((p: any) => p.id === policyId);
        
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

  const generateMockTransactionHistory = () => {
    // In a real app, this would fetch the transaction history from the blockchain
    // For demo purposes, we'll generate mock data
    
    // Generate policy creation event
    const creationDate = new Date();
    creationDate.setDate(creationDate.getDate() - 30); // 30 days ago
    
    const mockHistory: TransactionHistory[] = [
      {
        transactionHash: '0x' + Math.random().toString(16).substring(2, 42),
        blockNumber: 10000000 + Math.floor(Math.random() * 100000),
        timestamp: creationDate.toISOString(),
        eventName: 'PolicyCreated',
      },
    ];
    
    // Add premium payment event
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - 28); // 28 days ago
    
    mockHistory.push({
      transactionHash: '0x' + Math.random().toString(16).substring(2, 42),
      blockNumber: mockHistory[0].blockNumber + 1000,
      timestamp: paymentDate.toISOString(),
      eventName: 'PremiumPaid',
    });
    
    // If we have a stored policy, use its transaction hash for the first event
    if (policyData && policyData.transactionHash) {
      mockHistory[0].transactionHash = policyData.transactionHash;
      mockHistory[0].blockNumber = policyData.blockNumber || mockHistory[0].blockNumber;
      mockHistory[0].timestamp = policyData.timestamp || mockHistory[0].timestamp;
    }
    
    setTransactionHistory(mockHistory);
  };

  const getEventDescription = (eventName: string) => {
    switch (eventName) {
      case 'PolicyCreated':
        return 'Policy created and recorded on blockchain';
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
      default:
        return 'Transaction recorded';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading blockchain data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Blockchain Details</Text>
        <Text className="text-gray-600 mb-6">
          Transparent and immutable record of your insurance policy
        </Text>

        {policyData ? (
          <>
            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Smart Contract Data</Text>
              
              <View className="bg-light p-3 rounded-lg mb-3">
                <View className="mb-2">
                  <Text className="text-gray-500">Policy ID</Text>
                  <Text className="text-primary font-medium">{policyData.id}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Package Type</Text>
                  <Text className="text-primary font-medium">{policyData.packageType}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Coverage Amount</Text>
                  <Text className="text-primary font-medium">${policyData.coverageAmount.toLocaleString()}</Text>
                </View>
                
                <View className="mb-2">
                  <Text className="text-gray-500">Premium</Text>
                  <Text className="text-primary font-medium">${policyData.premium.toLocaleString()}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-500">Policy Term</Text>
                  <Text className="text-primary font-medium">{policyData.term} months</Text>
                </View>
              </View>
              
              <View className="bg-gray-50 p-4 rounded-lg mb-3">
                <Text className="text-primary font-medium mb-1">Creation Transaction Hash</Text>
                <Text className="text-gray-600 font-mono text-xs">{policyData.transactionHash}</Text>
              </View>
              
              <View className="bg-secondary/10 p-3 rounded-lg">
                <Text className="text-primary font-medium mb-1">Smart Contract Benefits</Text>
                <View className="ml-2">
                  {policyData.features
                    .filter((f: string) => f.includes('blockchain') || f.includes('smart contract'))
                    .map((feature: string, index: number) => (
                      <Text key={index} className="text-gray-600 mb-1">• {feature}</Text>
                    ))
                  }
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
              <Text className="text-primary font-bold text-lg mb-3">Transaction History</Text>
              
              {transactionHistory.length > 0 ? (
                transactionHistory.map((tx, index) => (
                  <View key={index} className="bg-light p-3 rounded-lg mb-3">
                    <View className="flex-row justify-between">
                      <Text className="text-primary font-medium">{getEventDescription(tx.eventName)}</Text>
                      <Text className="text-gray-500 text-xs">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View className="mt-2">
                      <Text className="text-gray-500 text-xs">Transaction Hash</Text>
                      <Text className="text-gray-600 font-mono text-xs">{tx.transactionHash}</Text>
                    </View>
                    
                    <View className="flex-row mt-2">
                      <View className="flex-1">
                        <Text className="text-gray-500 text-xs">Block</Text>
                        <Text className="text-gray-600">{tx.blockNumber}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-500 text-xs">Time</Text>
                        <Text className="text-gray-600">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-gray-600 text-center py-4">No transaction history available</Text>
              )}
            </View>

            <View className="bg-primary/10 rounded-xl p-5 mb-6">
              <Text className="text-primary font-semibold mb-2">What is Blockchain?</Text>
              <Text className="text-gray-700 mb-3">
                Blockchain is a decentralized, tamper-proof ledger that records transactions across
                many computers. For your insurance policy, this means:
              </Text>
              <View className="ml-3">
                <Text className="text-gray-600 mb-1">• Your policy cannot be altered or deleted</Text>
                <Text className="text-gray-600 mb-1">• Terms and conditions are transparent</Text>
                <Text className="text-gray-600 mb-1">• Claim processing is automated and fair</Text>
                <Text className="text-gray-600">• You can verify all transactions independently</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-primary font-bold text-lg mb-2">Policy Not Found</Text>
            <Text className="text-center text-gray-600">
              The policy details could not be found on the blockchain.
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