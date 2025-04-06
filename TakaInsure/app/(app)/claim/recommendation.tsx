import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../../contexts/UserContext';
import blockchainService, { PackageType } from '../../../services/blockchainService';

// Type definitions
type InsurancePackage = {
  id: string;
  name: string;
  coverageAmount: number;
  premium: number;
  term: number;
  description: string;
  features: string[];
  recommended: boolean;
};

type BlockchainTransaction = {
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  success: boolean;
};

export default function RecommendationScreen() {
  const router = useRouter();
  const { claimType, severity, cost } = useLocalSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<InsurancePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<BlockchainTransaction | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [policyId, setPolicyId] = useState<string | null>(null);

  useEffect(() => {
    generatePackageRecommendations();
    initializeBlockchain();
  }, [claimType, severity, cost]);

  const initializeBlockchain = async () => {
    try {
      // In a real app, these would be environment variables or config settings
      const rpcUrl = "https://goerli.infura.io/v3/your-infura-key"; // Example Ethereum testnet
      const contractAddress = "0x1234567890123456789012345678901234567890"; // Example contract address
      
      // For demo purposes, we'll just use the mock methods
      // In a real app, you would properly initialize the blockchain service
      // await blockchainService.initialize(rpcUrl, contractAddress);
      
      console.log("Blockchain service ready for use");
    } catch (error) {
      console.error("Failed to initialize blockchain service:", error);
      Alert.alert(
        "Blockchain Connection Error",
        "Could not connect to the blockchain network. Some features may be limited."
      );
    }
  };

  const generatePackageRecommendations = () => {
    // This would come from an API in a real app
    // Here we're generating mock insurance packages based on the claim analysis
    
    const parsedCost = cost ? parseInt(cost as string) : 0;
    const basePremium = Math.max(parsedCost * 0.03, 25);
    const basePackages: InsurancePackage[] = [
      {
        id: 'basic',
        name: 'Basic Coverage',
        coverageAmount: Math.max(parsedCost * 1.5, 2000),
        premium: Math.round(basePremium),
        term: 12,
        description: 'Essential coverage for basic protection',
        features: [
          'Claims up to coverage limit',
          'Basic incident coverage',
          'Standard processing time',
          'Blockchain-verified policy',
          'Smart contract claims processing',
        ],
        recommended: severity === 'minor',
      },
      {
        id: 'standard',
        name: 'Standard Protection',
        coverageAmount: Math.max(parsedCost * 2.5, 4000),
        premium: Math.round(basePremium * 1.8),
        term: 12,
        description: 'Comprehensive coverage for most incidents',
        features: [
          'Higher claim limits',
          'Extended damage coverage',
          'Faster claim processing',
          'Lower deductibles',
          'Blockchain-verified policy',
          'Smart contract claims processing',
          'Transparent policy management',
        ],
        recommended: severity === 'moderate',
      },
      {
        id: 'premium',
        name: 'Premium Shield',
        coverageAmount: Math.max(parsedCost * 4, 6000),
        premium: Math.round(basePremium * 2.5),
        term: 12,
        description: 'Maximum protection for complete peace of mind',
        features: [
          'Highest claim limits',
          'Comprehensive coverage for all damages',
          'Priority claim processing',
          'Zero deductible',
          'Additional benefits package',
          'Blockchain-verified policy',
          'Smart contract claims processing',
          'Transparent policy management',
          'Automatic claim settlement',
        ],
        recommended: severity === 'severe',
      },
    ];

    setPackages(basePackages);
    
    // Set recommended package as selected by default
    const recommended = basePackages.find(pkg => pkg.recommended);
    if (recommended) {
      setSelectedPackage(recommended.id);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      Alert.alert('Selection Required', 'Please select an insurance package to continue.');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to subscribe to an insurance package.');
      return;
    }

    setLoading(true);
    setProcessingStep('Initializing transaction...');

    try {
      // Get the selected package
      const packageData = packages.find(pkg => pkg.id === selectedPackage);
      if (!packageData) {
        throw new Error('Selected package not found');
      }

      // Prepare policy data
      const packageType = selectedPackage === 'basic' 
        ? 'Basic' 
        : selectedPackage === 'standard' 
          ? 'Standard' 
          : 'Premium';
      
      // In a real app, you would have the user's blockchain wallet address
      // For demo purposes, we'll use a placeholder
      const walletAddress = "0xdummy123456789000000000000000000000000000";
      
      // Update status
      setProcessingStep('Creating blockchain record...');
      
      // Call blockchain service
      // In a real app, this would interact with the actual smart contract
      // For demo purposes, we'll use a mock transaction
      const result = await blockchainService.createMockTransaction('policy');
      
      if (result.success) {
        // Store transaction data
        setTransaction(result);
        
        // Generate a policy ID (in a real app, this would come from the blockchain)
        const newPolicyId = `POL${Math.floor(Math.random() * 1000000)}`;
        setPolicyId(newPolicyId);
        
        // Store policy data in local storage for demo purposes
        const policyData = {
          id: newPolicyId,
          packageType,
          coverageAmount: packageData.coverageAmount,
          premium: packageData.premium,
          term: packageData.term,
          features: packageData.features,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          timestamp: result.timestamp,
          policyholderName: user.full_name,
          policyHolderId: user.policyholder_id,
        };
        
        // Save the policy data
        const existingPoliciesJson = await AsyncStorage.getItem('userPolicies');
        const existingPolicies = existingPoliciesJson ? JSON.parse(existingPoliciesJson) : [];
        existingPolicies.push(policyData);
        await AsyncStorage.setItem('userPolicies', JSON.stringify(existingPolicies));
        
        // Show success message
        Alert.alert(
          'Success',
          'Your insurance package has been activated and secured using blockchain technology for transparency and security.',
          [
            {
              text: 'View Dashboard',
              onPress: () => router.replace('/(app)/home'),
            },
          ]
        );
      } else {
        throw new Error('Blockchain transaction failed');
      }
    } catch (error) {
      console.error('Error subscribing to insurance:', error);
      Alert.alert('Error', 'Failed to subscribe to insurance package. Please try again.');
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const renderProcessingView = () => (
    <View className="bg-white rounded-xl p-6 mb-6 items-center">
      <ActivityIndicator size="large" color="#8E1616" className="mb-4" />
      <Text className="text-primary font-bold text-lg mb-2">Processing Your Policy</Text>
      <Text className="text-center text-gray-600 mb-4">{processingStep}</Text>
      <Text className="text-center text-gray-500">
        Your insurance policy is being recorded on the blockchain for maximum transparency and security.
      </Text>
    </View>
  );

  const renderTransactionDetails = () => {
    if (!transaction) return null;
    
    return (
      <View className="bg-white rounded-xl p-6 mb-6">
        <Text className="text-primary font-bold text-lg mb-3">Blockchain Confirmation</Text>
        <Text className="text-green-700 font-semibold mb-4">Transaction Successful</Text>
        
        <View className="bg-gray-50 p-4 rounded-lg mb-4">
          <Text className="text-primary font-medium mb-1">Transaction Hash</Text>
          <Text className="text-gray-600 font-mono text-sm">{transaction.transactionHash}</Text>
        </View>
        
        <View className="flex-row">
          <View className="flex-1 mr-2">
            <Text className="text-primary font-medium mb-1">Block Number</Text>
            <Text className="text-gray-600">{transaction.blockNumber}</Text>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-primary font-medium mb-1">Timestamp</Text>
            <Text className="text-gray-600">
              {new Date(transaction.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
        
        {policyId && (
          <View className="mt-4 bg-secondary/10 p-4 rounded-lg">
            <Text className="text-primary font-medium mb-1">Your Policy ID</Text>
            <Text className="text-secondary font-bold">{policyId}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Recommended Insurance</Text>
        <Text className="text-gray-600 mb-6">
          Based on our AI analysis, we've created personalized insurance recommendations for you
        </Text>

        {loading ? renderProcessingView() : transaction ? renderTransactionDetails() : (
          <>
            <View className="bg-secondary/10 rounded-xl p-5 mb-6">
              <Text className="text-primary font-semibold mb-2">Why blockchain?</Text>
              <Text className="text-gray-700">
                All our insurance packages use blockchain technology to ensure transparency, 
                security, and faster claim settlements through smart contracts.
              </Text>
            </View>

            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => setSelectedPackage(pkg.id)}
                className={`bg-white rounded-xl p-5 shadow-sm mb-4 border-2 ${
                  selectedPackage === pkg.id
                    ? 'border-secondary'
                    : 'border-transparent'
                }`}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-primary font-bold text-lg">{pkg.name}</Text>
                  {pkg.recommended && (
                    <View className="bg-secondary px-3 py-1 rounded-full">
                      <Text className="text-white font-medium text-xs">Recommended</Text>
                    </View>
                  )}
                </View>

                <Text className="text-gray-600 mb-3">{pkg.description}</Text>
                
                <View className="bg-light p-3 rounded-lg mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-primary font-medium">Coverage Amount</Text>
                    <Text className="text-secondary font-bold">${pkg.coverageAmount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-primary font-medium">Monthly Premium</Text>
                    <Text className="text-secondary font-bold">${pkg.premium.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-primary font-medium">Term</Text>
                    <Text className="text-secondary font-bold">{pkg.term} months</Text>
                  </View>
                </View>

                <Text className="text-primary font-medium mb-2">Features:</Text>
                {pkg.features.map((feature, index) => (
                  <Text key={index} className="text-gray-600 mb-1">• {feature}</Text>
                ))}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={handleSubscribe}
              disabled={loading}
              className={`${
                loading ? 'bg-gray-400' : 'bg-secondary'
              } rounded-xl p-4 items-center mt-2 mb-6`}
            >
              <Text className="text-white font-bold text-lg">
                {loading ? 'Processing...' : 'Activate Selected Insurance'}
              </Text>
            </TouchableOpacity>

            <View className="bg-primary/10 rounded-xl p-5 mb-6">
              <Text className="text-primary font-semibold mb-2">Smart Contract Benefits</Text>
              <Text className="text-gray-700 mb-2">
                Your insurance policy will be secured as a smart contract on the blockchain, offering:
              </Text>
              <View className="ml-3">
                <Text className="text-gray-600 mb-1">• Transparent policy terms</Text>
                <Text className="text-gray-600 mb-1">• Automatic claim processing</Text>
                <Text className="text-gray-600 mb-1">• Tamper-proof record keeping</Text>
                <Text className="text-gray-600">• Fast payment settlements</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}