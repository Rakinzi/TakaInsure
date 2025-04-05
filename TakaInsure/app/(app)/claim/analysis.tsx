import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Type for analysis results
type AnalysisResult = {
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  ownership: {
    verified: boolean;
    confidence: number;
    details?: {
      ownerName: string;
      registrationNumber?: string;
      matchConfidence: number;
    };
  } | null;
  damage: {
    severity: 'minor' | 'moderate' | 'severe' | null;
    estimatedCost: number | null;
    affectedAreas: string[];
  } | null;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    confidence: number;
  };
  property?: {
    type: string;
    estimatedValue: number;
  };
};

export default function AnalysisScreen() {
  const router = useRouter();
  const { claimType } = useLocalSearchParams();
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    status: 'processing',
    progress: 0,
    ownership: null,
    damage: null,
  });

  useEffect(() => {
    // Simulate the analysis process
    simulateAnalysis();
  }, []);

  const simulateAnalysis = () => {
    // Start progress at 0
    setAnalysis(prev => ({ ...prev, status: 'processing', progress: 0 }));

    // Simulate OCR processing (ownership verification)
    setTimeout(() => {
      setAnalysis(prev => ({
        ...prev,
        progress: 30,
        ownership: {
          verified: true,
          confidence: 89,
          details: {
            ownerName: 'John Doe',
            registrationNumber: 'ABC123456',
            matchConfidence: 89,
          },
        },
      }));
    }, 2000);

    // Simulate damage assessment
    setTimeout(() => {
      setAnalysis(prev => ({
        ...prev,
        progress: 60,
        damage: {
          severity: 'moderate',
          estimatedCost: 3500,
          affectedAreas: ['Front Bumper', 'Hood', 'Headlight'],
        },
      }));
    }, 4000);

    // Simulate vehicle/property identification
    setTimeout(() => {
      setAnalysis(prev => ({
        ...prev,
        progress: 90,
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          year: 2019,
          confidence: 95,
        },
      }));
    }, 6000);

    // Complete the analysis
    setTimeout(() => {
      setAnalysis(prev => ({ ...prev, status: 'complete', progress: 100 }));
    }, 7000);
  };

  const handleViewRecommendation = () => {
    router.push({
      pathname: '/claim/recommendation',
      params: { 
        claimType,
        severity: analysis.damage?.severity,
        cost: analysis.damage?.estimatedCost?.toString() || '0'
      }
    });
  };

  const renderProgressBar = () => (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
      <View
        className="h-full bg-secondary rounded-full"
        style={{ width: `${analysis.progress}%` }}
      />
    </View>
  );

  const renderProcessingView = () => (
    <View className="items-center justify-center p-8">
      <ActivityIndicator size="large" color="#8E1616" />
      <Text className="text-primary text-center mt-4 font-medium">
        Analyzing your evidence...
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        This may take a few moments. Our AI is processing your uploaded images.
      </Text>
      {renderProgressBar()}
      <Text className="text-right w-full text-gray-500">{analysis.progress}% complete</Text>
    </View>
  );

  const renderAnalysisResults = () => (
    <View>
      {/* Ownership Verification Results */}
      <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <Text className="text-primary font-bold text-lg mb-3">Ownership Verification</Text>
        <View className="bg-green-100 p-3 rounded-lg mb-3">
          <Text className="text-green-800 font-medium">
            ✓ Ownership verified with {analysis.ownership?.confidence}% confidence
          </Text>
        </View>
        <Text className="text-gray-600 mb-1">
          Owner: {analysis.ownership?.details?.ownerName}
        </Text>
        {analysis.ownership?.details?.registrationNumber && (
          <Text className="text-gray-600">
            Registration: {analysis.ownership.details.registrationNumber}
          </Text>
        )}
      </View>

      {/* Damage Assessment Results */}
      <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <Text className="text-primary font-bold text-lg mb-3">Damage Assessment</Text>
        <View className={`p-3 rounded-lg mb-3 ${
          analysis.damage?.severity === 'minor' ? 'bg-green-100' :
          analysis.damage?.severity === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <Text className={`font-medium ${
            analysis.damage?.severity === 'minor' ? 'text-green-800' :
            analysis.damage?.severity === 'moderate' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {analysis.damage?.severity === 'minor' ? 'Minor damage detected' :
             analysis.damage?.severity === 'moderate' ? 'Moderate damage detected' :
             'Severe damage detected'}
          </Text>
        </View>
        <Text className="text-gray-600 mb-1">
          Estimated repair cost: ${analysis.damage?.estimatedCost?.toLocaleString()}
        </Text>
        <Text className="text-gray-600 mb-2">Affected areas:</Text>
        <View className="ml-3">
          {analysis.damage?.affectedAreas.map((area, index) => (
            <Text key={index} className="text-gray-600 mb-1">• {area}</Text>
          ))}
        </View>
      </View>

      {/* Vehicle/Property Identification Results */}
      {claimType === 'car_accident' && analysis.vehicle && (
        <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <Text className="text-primary font-bold text-lg mb-3">Vehicle Identification</Text>
          <Text className="text-gray-600 mb-1">
            Make: {analysis.vehicle.make}
          </Text>
          <Text className="text-gray-600 mb-1">
            Model: {analysis.vehicle.model}
          </Text>
          <Text className="text-gray-600 mb-1">
            Year: {analysis.vehicle.year}
          </Text>
          <Text className="text-gray-600">
            Confidence: {analysis.vehicle.confidence}%
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        onPress={handleViewRecommendation}
        className="bg-secondary rounded-xl p-4 items-center mb-6"
      >
        <Text className="text-white font-bold text-lg">View Insurance Recommendation</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Claim Analysis</Text>
        <Text className="text-gray-600 mb-6">
          Our AI has {analysis.status === 'complete' ? 'analyzed' : 'is analyzing'} your evidence
        </Text>

        {analysis.status === 'processing' ? renderProcessingView() : renderAnalysisResults()}
      </ScrollView>
    </SafeAreaView>
  );
}