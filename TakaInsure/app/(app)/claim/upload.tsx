// Updates to TakaInsure/app/(app)/claim/upload.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadClaimImageForAnalysis } from '../../../services/claimService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UploadedImage = {
  uri: string;
  type: string;
  name?: string;
  isUploading?: boolean;
  isAnalyzed?: boolean;
};

export default function UploadClaimScreen() {
  const router = useRouter();
  const { claimType, incidentDate, incidentLocation, incidentDescription } = useLocalSearchParams();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload claim evidence.'
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        const newImage: UploadedImage = {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: `image_${Date.now()}.jpg`,
          isUploading: false,
          isAnalyzed: false
        };
        
        const newImages = [...images, newImage];
        setImages(newImages);
        
        // If this is the first image, automatically analyze it
        if (images.length === 0 && claimType === 'car_accident') {
          analyzeImage(newImages.length - 1, newImages);
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera access to take photos for your claim.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedImage = result.assets[0];
        const newImage: UploadedImage = {
          uri: capturedImage.uri,
          type: 'image/jpeg',
          name: `image_${Date.now()}.jpg`,
          isUploading: false,
          isAnalyzed: false
        };
        
        const newImages = [...images, newImage];
        setImages(newImages);
        
        // If this is the first image, automatically analyze it
        if (images.length === 0 && claimType === 'car_accident') {
          analyzeImage(newImages.length - 1, newImages);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    
    // If the analyzed image was removed, clear analysis results
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null);
      setAnalysisResults(null);
    } else if (selectedImageIndex !== null && selectedImageIndex > index) {
      // Adjust selectedImageIndex if a previous image was removed
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const analyzeImage = async (index: number, imageList = images) => {
    if (index < 0 || index >= imageList.length) return;
    
    try {
      setAnalyzing(true);
      setSelectedImageIndex(index);
      
      // Mark the image as being analyzed
      const updatedImages = [...imageList];
      updatedImages[index] = {
        ...updatedImages[index],
        isUploading: true
      };
      setImages(updatedImages);
      
      // Upload and analyze the image
      const analysisResult = await uploadClaimImageForAnalysis(updatedImages[index].uri);
      
      // Store analysis results
      setAnalysisResults(analysisResult);
      
      // Save to session storage for use in the analysis screen
      if (analysisResult) {
        await AsyncStorage.setItem('claimAnalysisResults', JSON.stringify(analysisResult));
        
        // Also store the list of image URIs
        const imageUris = imageList.map(img => img.uri);
        await AsyncStorage.setItem('claimImageUris', JSON.stringify(imageUris));
        
        // Mark the image as analyzed
        const finalImages = [...updatedImages];
        finalImages[index] = {
          ...finalImages[index],
          isUploading: false,
          isAnalyzed: true
        };
        setImages(finalImages);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert(
        'Analysis Error',
        'Failed to analyze the image. Please try again or select a different image.'
      );
      
      // Reset the image status
      const resetImages = [...imageList];
      resetImages[index] = {
        ...resetImages[index],
        isUploading: false,
        isAnalyzed: false
      };
      setImages(resetImages);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitClaim = async () => {
    if (images.length === 0) {
      Alert.alert('Missing Evidence', 'Please upload at least one image as evidence for your claim.');
      return;
    }
    
    if (!analysisResults && claimType === 'car_accident') {
      Alert.alert('Analysis Required', 'Please analyze at least one image before proceeding.');
      return;
    }

    setLoading(true);

    try {
      // Save claim data needed for next screens
      await AsyncStorage.setItem('claimType', claimType as string);
      
      if (incidentDate) {
        await AsyncStorage.setItem('incidentDate', incidentDate as string);
      }
      
      if (incidentLocation) {
        await AsyncStorage.setItem('incidentLocation', incidentLocation as string);
      }
      
      if (incidentDescription) {
        await AsyncStorage.setItem('incidentDescription', incidentDescription as string);
      }

      // Navigate to analysis screen
      router.push({
        pathname: '/claim/analysis',
        params: { 
          claimType,
          hasAnalysis: analysisResults ? 'true' : 'false'
        }
      });
    } catch (error) {
      console.error('Error submitting claim:', error);
      Alert.alert('Error', 'Failed to submit your claim. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getUploadHint = () => {
    switch (claimType) {
      case 'car_accident':
        return 'Upload images of vehicle damage, accident scene, and any relevant documents.';
      case 'property_damage':
        return 'Upload images of the damaged property from multiple angles.';
      case 'personal_injury':
        return 'Upload images of injuries and any medical documents.';
      default:
        return 'Upload images and documents as evidence for your claim.';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Upload Evidence</Text>
        <Text className="text-gray-600 mb-6">{getUploadHint()}</Text>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-primary font-bold mb-4">Add Photos</Text>

          <View className="flex-row flex-wrap">
            {images.map((image, index) => (
              <View key={index} className="w-1/3 p-1 relative">
                <TouchableOpacity 
                  onPress={() => claimType === 'car_accident' ? analyzeImage(index) : null}
                  disabled={image.isUploading}
                  className={`${selectedImageIndex === index ? 'border-2 border-secondary' : ''}`}
                >
                  <Image 
                    source={{ uri: image.uri }} 
                    className="h-32 rounded-lg" 
                  />
                  {image.isUploading && (
                    <View className="absolute inset-0 bg-black bg-opacity-50 items-center justify-center rounded-lg">
                      <ActivityIndicator color="#FFFFFF" />
                      <Text className="text-white text-xs mt-1">Analyzing...</Text>
                    </View>
                  )}
                  {image.isAnalyzed && (
                    <View className="absolute bottom-0 right-0 bg-green-500 p-1 rounded-tl-lg">
                      <Text className="text-white text-xs">Analyzed</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-tertiary rounded-full p-1"
                >
                  <Text className="text-white font-bold text-xs px-2">X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View className="flex-row justify-center space-x-4 my-4">
            <TouchableOpacity
              onPress={takePhoto}
              className="bg-primary rounded-lg p-3 flex-row items-center justify-center flex-1"
            >
              <Text className="text-white font-semibold ml-2">Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={selectImage}
              className="bg-secondary rounded-lg p-3 flex-row items-center justify-center flex-1"
            >
              <Text className="text-white font-semibold ml-2">Select Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {claimType === 'car_accident' && analysisResults && (
          <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <Text className="text-primary font-bold mb-2">Initial Analysis</Text>
            <View className={`p-3 rounded-lg mb-3 ${
              analysisResults.severity === 'minor' ? 'bg-green-100' :
              analysisResults.severity === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <Text className={`font-medium ${
                analysisResults.severity === 'minor' ? 'text-green-800' :
                analysisResults.severity === 'moderate' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {analysisResults.severity === 'minor' ? 'Minor damage detected' :
                 analysisResults.severity === 'moderate' ? 'Moderate damage detected' :
                 'Severe damage detected'}
              </Text>
            </View>
            <Text className="text-gray-600 mb-1">
              Estimated repair cost: ${analysisResults.estimatedCost?.toLocaleString()}
            </Text>
            <Text className="text-gray-600 mb-2">Detected damages:</Text>
            <View className="ml-3">
              {analysisResults.affectedAreas.map((area: string, idx: number) => (
                <Text key={idx} className="text-gray-600 mb-1">• {area}</Text>
              ))}
            </View>
          </View>
        )}
        
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-primary font-bold mb-2">AI Analysis</Text>
          <Text className="text-gray-600 mb-4">
            Our AI will analyze your evidence to:
          </Text>
          <View className="ml-4">
            <Text className="text-gray-600 mb-2">• Verify ownership using OCR technology</Text>
            <Text className="text-gray-600 mb-2">• Assess damage extent</Text>
            <Text className="text-gray-600 mb-2">• Identify vehicle or property details</Text>
            <Text className="text-gray-600">• Recommend appropriate insurance coverage</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={submitClaim}
          disabled={loading || analyzing}
          className={`${
            loading || analyzing ? 'bg-gray-400' : 'bg-secondary'
          } rounded-xl p-4 items-center mb-6`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-lg">Submit for Analysis</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}