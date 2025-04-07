import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native'; // Add ScrollView
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehicleForm from '../../../components/vehicle/VehicleForm';
import { VehicleInfo } from '../../../types/vehicle';
import { registerVehicle } from '../../../services/vehicleService';

export default function VehicleCaptureScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (vehicleData: VehicleInfo) => {
    setLoading(true);
   
    try {
      // Register the vehicle
      await registerVehicle(vehicleData);
     
      // Show success message
      Alert.alert(
        'Vehicle Added',
        'Your vehicle has been successfully registered and stored on the blockchain for secure record-keeping.',
        [
          {
            text: 'View My Vehicles',
            onPress: () => router.replace('/vehicle'),
          },
        ]
      );
    } catch (error) {
      console.error('Error registering vehicle:', error);
      Alert.alert(
        'Registration Failed',
        'There was an error registering your vehicle. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1"> {/* Wrap entire content in ScrollView */}
        <View className="p-6">
          <Text className="text-gray-600 mb-6">
            Provide your vehicle information for insurance coverage
          </Text>
         
          <VehicleForm
            onSubmit={handleSubmit}
            loading={loading}
            submitButtonText="Register Vehicle"
          />
         
          <View className="bg-primary/10 rounded-xl p-4 mb-6">
            <Text className="text-primary font-medium">Vehicle Information Security</Text>
            <Text className="text-gray-700 mt-1">
              Your vehicle details are securely stored on the blockchain, ensuring they cannot be altered or tampered with. This provides a transparent and reliable record for insurance purposes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}