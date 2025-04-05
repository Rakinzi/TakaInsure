import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

type UploadedImage = {
  uri: string;
  type: string;
  name?: string;
  isUploading?: boolean;
};

export default function UploadClaimScreen() {
  const router = useRouter();
  const { claimType } = useLocalSearchParams();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);

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
        };
        setImages([...images, newImage]);
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
        };
        setImages([...images, newImage]);
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
  };

  const submitClaim = async () => {
    if (images.length === 0) {
      Alert.alert('Missing Evidence', 'Please upload at least one image as evidence for your claim.');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call to upload images and process them
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to analysis screen
      router.push({
        pathname: '/claim/analysis',
        params: { claimType }
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
                <Image source={{ uri: image.uri }} className="h-32 rounded-lg" />
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
          disabled={loading}
          className={`${
            loading ? 'bg-gray-400' : 'bg-secondary'
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