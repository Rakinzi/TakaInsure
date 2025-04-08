import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../services/supabaseClient';
import { createInsuranceProduct, createPolicy } from '../../../services/policyService';

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

type PolicyTransaction = {
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  success: boolean;
};

export default function RecommendationScreen() {
  const router = useRouter();
  const { claimType, severity, cost } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [packages, setPackages] = useState<InsurancePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<PolicyTransaction | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [policyId, setPolicyId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    generatePackageRecommendations();
  }, [claimType, severity, cost]);

  const loadUserData = async () => {
    try {
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (userDataStr) {
        const parsedUserData = JSON.parse(userDataStr);
        setUserData(parsedUserData);
      } else {
        // Try to construct minimal user data from individual storage items
        const policyHolderId = await AsyncStorage.getItem('policyHolderId');
        const phoneNumber = await AsyncStorage.getItem('phoneNumber');
        
        if (policyHolderId && phoneNumber) {
          setUserData({
            policyholder_id: policyHolderId,
            full_name: 'User', // Default name
            contact_details: phoneNumber,
          });
        } else {
          console.log('No user data found in AsyncStorage');
          // If we can't get user data, redirect to login
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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
          'Verified policy',
          'Smart processing',
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
          'Verified policy',
          'Smart processing',
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
          'Verified policy',
          'Smart processing',
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

    if (!userData || !userData.policyholder_id) {
      Alert.alert('Authentication Required', 'Please log in to subscribe to an insurance package.');
      return;
    }

    setLoading(true);
    setProcessingStep('Initializing your insurance policy...');

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
      
      // Update status
      setProcessingStep('Creating your insurance policy...');
      
      // First check if insurance product already exists
      const { data: existingProducts, error: queryError } = await supabase
        .from('insurance_product')
        .select('product_id')
        .ilike('product_name', `%${packageType}%`)
        .eq('status', 'active');
        
      if (queryError) {
        console.error('Error checking for existing products:', queryError);
        throw new Error(`Database error: ${queryError.message}`);
      }
      
      let productId;
      
      // If product exists, use it, otherwise create a new one
      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].product_id;
      } else {
        // We need to create a new product
        setProcessingStep('Setting up insurance details...');
        
        // Create insurance product
        const productData = {
          product_name: `${packageType} Coverage Plan`,
          product_description: packageData.description,
          coverage_amount: packageData.coverageAmount,
          premium_amount: packageData.premium,
          policy_term: packageData.term,
          eligibility_criteria: 'Open to all registered users.',
          exclusions: 'Pre-existing conditions may not be covered.',
          status: 'active'
        };
        
        const newProductId = await createInsuranceProduct(productData);
        if (!newProductId) {
          throw new Error('Failed to create insurance product');
        }
        
        productId = newProductId;
      }
      
      // Calculate dates
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + packageData.term);
      const endDateString = endDate.toISOString().split('T')[0];
      
      // Create the policy
      setProcessingStep('Finalizing your policy...');
      const newPolicyId = await createPolicy(
        userData.policyholder_id,
        productId,
        packageData.coverageAmount,
        packageData.premium,
        startDate,
        endDateString,
        'monthly',
        {
          source: 'app',
          claimType: claimType,
          severity: severity,
          cost: cost || 0
        }
      );
      
      if (!newPolicyId) {
        throw new Error('Failed to create policy');
      }
      
      setPolicyId(newPolicyId);
      
      // Create a simple transaction record for UI display
      const timestamp = new Date().toISOString();
      setTransaction({
        transactionHash: `pol_${newPolicyId.substring(0, 8)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        timestamp,
        success: true
      });
      
      // Show success message
      Alert.alert(
        'Success',
        'Your insurance package has been activated and securely stored in our database.',
        [
          {
            text: 'View Dashboard',
            onPress: () => router.replace('/(app)/home'),
          },
        ]
      );
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
        Your insurance policy is being recorded in our secure database system for maximum transparency and security.
      </Text>
    </View>
  );

  const renderTransactionDetails = () => {
    if (!transaction) return null;
    
    return (
      <View className="bg-white rounded-xl p-6 mb-6">
        <Text className="text-primary font-bold text-lg mb-3">Policy Confirmation</Text>
        <Text className="text-green-700 font-semibold mb-4">Transaction Successful</Text>
        
        <View className="bg-gray-50 p-4 rounded-lg mb-4">
          <Text className="text-primary font-medium mb-1">Reference ID</Text>
          <Text className="text-gray-600 font-mono text-sm">{transaction.transactionHash}</Text>
        </View>
        
        <View className="flex-row">
          <View className="flex-1 mr-2">
            <Text className="text-primary font-medium mb-1">Entry ID</Text>
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
              <Text className="text-primary font-semibold mb-2">Why choose TakaInsure?</Text>
              <Text className="text-gray-700">
                All our insurance packages use secure database technology to ensure transparency, 
                security, and faster claim settlements through automated processing.
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
              <Text className="text-primary font-semibold mb-2">Security Benefits</Text>
              <Text className="text-gray-700 mb-2">
                Your insurance policy will be secured in our database system, offering:
              </Text>
              <View className="ml-3">
                <Text className="text-gray-600 mb-1">• Transparent policy terms</Text>
                <Text className="text-gray-600 mb-1">• Automated claim processing</Text>
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