import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVehicleById } from '../../../services/vehicleService';
import { VehicleInfo } from '../../../types/vehicle';
import { getApiUrl } from '../../../services/networkService';

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [carImageUri, setCarImageUri] = useState<string | null>(null);
  const [plateImageUri, setPlateImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleDetails(vehicleId as string);
    }
  }, [vehicleId]);

  const loadVehicleDetails = async (id: string) => {
    try {
      setLoading(true);
      const vehicleData = await getVehicleById(id);
      setVehicle(vehicleData);
      
      if (vehicleData) {
        await loadImageUrls(vehicleData);
      }
    } catch (error) {
      console.error('Error loading vehicle details:', error);
      Alert.alert(
        'Error',
        'Could not load vehicle details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const loadImageUrls = async (vehicleData: VehicleInfo) => {
    try {
      const apiUrl = await getApiUrl();
      const baseUrl = apiUrl.includes('/api') ? apiUrl.split('/api')[0] : apiUrl;
      
      // Process car image URL
      if (vehicleData.carImageUri) {
        if (vehicleData.carImageUri.startsWith('http')) {
          setCarImageUri(vehicleData.carImageUri);
        } else if (vehicleData.carImageUri.startsWith('/api')) {
          setCarImageUri(`${baseUrl}${vehicleData.carImageUri}`);
        } else {
          setCarImageUri(`${apiUrl}/vehicle/image/${vehicleData.id}/car`);
        }
      }
      
      // Process plate image URL
      if (vehicleData.plateImageUri) {
        if (vehicleData.plateImageUri.startsWith('http')) {
          setPlateImageUri(vehicleData.plateImageUri);
        } else if (vehicleData.plateImageUri.startsWith('/api')) {
          setPlateImageUri(`${baseUrl}${vehicleData.plateImageUri}`);
        } else {
          setPlateImageUri(`${apiUrl}/vehicle/image/${vehicleData.id}/plate`);
        }
      }
    } catch (error) {
      console.error('Error processing image URLs:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading vehicle details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-primary text-xl font-bold mb-2">Vehicle Not Found</Text>
          <Text className="text-center text-gray-600 mb-6">
            The vehicle you're looking for could not be found or may have been removed.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/vehicle')}
            className="bg-secondary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Go Back to Vehicles</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Vehicle Details</Text>
        <Text className="text-gray-600 mb-6">
          View information about your registered vehicle
        </Text>

        {/* Vehicle Image */}
        {carImageUri ? (
          <View className="mb-6">
            <Image
              source={{ uri: carImageUri }}
              className="w-full h-48 rounded-xl"
              resizeMode="cover"
              onError={() => {
                console.log('Failed to load car image:', carImageUri);
                setCarImageUri(null);
              }}
            />
          </View>
        ) : (
          <View className="w-full h-48 bg-gray-300 mb-6 rounded-xl items-center justify-center">
            <Text className="text-gray-500">No vehicle image available</Text>
          </View>
        )}

        {/* Vehicle Information Card */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-xl mb-4">
            {vehicle.carMake} {vehicle.carModel} {vehicle.carYear && `(${vehicle.carYear})`}
          </Text>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">License Plate</Text>
            <Text className="text-secondary font-bold">{vehicle.plateNumber}</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">Make</Text>
            <Text className="text-gray-700">{vehicle.carMake}</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">Model</Text>
            <Text className="text-gray-700">{vehicle.carModel}</Text>
          </View>
          
          {vehicle.carYear && (
            <View className="flex-row justify-between mb-3">
              <Text className="text-primary font-medium">Year</Text>
              <Text className="text-gray-700">{vehicle.carYear}</Text>
            </View>
          )}
          
          <View className="flex-row justify-between">
            <Text className="text-primary font-medium">Registration Date</Text>
            <Text className="text-gray-700">{formatDate(vehicle.timestamp)}</Text>
          </View>
        </View>

        {/* Data Security Information */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-3">Data Verification</Text>
          
          <View className="bg-green-100 px-3 py-2 rounded-lg mb-4">
            <Text className="text-green-800">
              This vehicle's information is securely stored in our database
            </Text>
          </View>
          
          <Text className="text-gray-700 mb-3">
            Your vehicle data is protected with enterprise-grade security and can only be accessed by authorized personnel.
          </Text>
        </View>

        {/* License Plate Image */}
        {plateImageUri && (
          <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <Text className="text-primary font-bold text-lg mb-3">License Plate Image</Text>
            <Image
              source={{ uri: plateImageUri }}
              className="w-full h-32 rounded-lg"
              resizeMode="cover"
              onError={() => {
                console.log('Failed to load plate image:', plateImageUri);
                setPlateImageUri(null);
              }}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row space-x-4 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/policy')}
            className="bg-secondary flex-1 p-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold">Get Insurance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary flex-1 p-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold">Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}