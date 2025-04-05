import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function RecommendationScreen() {
  const router = useRouter();
  const { claimType, severity, cost } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<InsurancePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    generatePackageRecommendations();
  }, [claimType, severity, cost]);

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

    setLoading(true);

    try {
      // In a real app, this would be an API call to your blockchain-based insurance system
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
    } catch (error) {
      console.error('Error subscribing to insurance:', error);
      Alert.alert('Error', 'Failed to subscribe to insurance package. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Recommended Insurance</Text>
        <Text className="text-gray-600 mb-6">
          Based on our AI analysis, we've created personalized insurance recommendations for you
        </Text>

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
      </ScrollView>
    </SafeAreaView>
  );
}