// Updates to TakaInsure/app/(app)/claim/analysis.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVehicleById } from '../../../services/vehicleService';

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
};

export default function AnalysisScreen() {
  const router = useRouter();
  const { claimType, hasAnalysis } = useLocalSearchParams();
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    status: 'processing',
    progress: 0,
    ownership: null,
    damage: null,
  });
  const [loading, setLoading] = useState(true);
  const [storedImages, setStoredImages] = useState<string[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState<any>(null);
  const [claimData, setClaimData] = useState<any>(null);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    setLoading(true);
    
    try {
      // Get stored claim data
      const incidentDate = await AsyncStorage.getItem('incidentDate');
      const incidentLocation = await AsyncStorage.getItem('incidentLocation');
      const incidentDescription = await AsyncStorage.getItem('incidentDescription');
      
      setClaimData({
        incidentDate,
        incidentLocation,
        incidentDescription
      });
      
      // Get stored analysis results
      const analysisResultsStr = await AsyncStorage.getItem('claimAnalysisResults');
      const imageUrisStr = await AsyncStorage.getItem('claimImageUris');
      
      let analysisResults = null;
      if (analysisResultsStr) {
        analysisResults = JSON.parse(analysisResultsStr);
      }
      
      let imageUris: string[] = [];
      if (imageUrisStr) {
        imageUris = JSON.parse(imageUrisStr);
        setStoredImages(imageUris);
      }
      
      // If we already have analysis results, use them
      if (analysisResults && hasAnalysis === 'true') {
        setAnalysis({
          status: 'complete',
          progress: 100,
          ownership: {
            verified: true,
            confidence: 89,
            details: {
              ownerName: 'Current User',
              matchConfidence: 89,
            },
          },
          damage: {
            severity: analysisResults.severity,
            estimatedCost: analysisResults.estimatedCost,
            affectedAreas: analysisResults.affectedAreas || [],
          },
        });
        
        // Try to get vehicle information if this is a car claim
        if (claimType === 'car_accident') {
          await loadVehicleInfo();
        }
      } else {
        // Otherwise, simulate the analysis process
        simulateAnalysis();
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
      Alert.alert('Error', 'Failed to load analysis data. Please try again.');
      simulateAnalysis();
    } finally {
      setLoading(false);
    }
  };
  
  const loadVehicleInfo = async () => {
    try {
      // For now, we'll get the first vehicle from the user's vehicles
      const vehiclesStr = await AsyncStorage.getItem('userVehicles');
      if (vehiclesStr) {
        const vehicles = JSON.parse(vehiclesStr);
        if (vehicles && vehicles.length > 0) {
          const vehicle = await getVehicleById(vehicles[0].id);
          if (vehicle) {
            setCurrentVehicle(vehicle);
            
            // Update analysis with vehicle info
            setAnalysis(prev => ({
              ...prev,
              vehicle: {
                make: vehicle.carMake,
                model: vehicle.carModel,
                year: parseInt(vehicle.carYear || '2023'),
                confidence: 95,
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading vehicle info:', error);
    }
  };

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
      {/* Images Preview */}
      {storedImages.length > 0 && (
        <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <Text className="text-primary font-bold text-lg mb-3">Uploaded Evidence</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {storedImages.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                className="w-24 h-24 rounded-lg mr-2"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}
    
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