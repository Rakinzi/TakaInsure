import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserVehicles } from '../../../services/vehicleService';
import { VehicleInfo } from '../../../types/vehicle';
import VehicleCard from '../../../components/vehicle/VehicleCard';

export default function VehicleListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const userVehicles = await getUserVehicles();
      setVehicles(userVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = () => {
    router.push('/vehicle/capture');
  };

  const renderVehicleItem = ({ item }: { item: VehicleInfo }) => (
    <VehicleCard vehicle={item} />
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <View className="p-6">
        <Text className="text-primary text-2xl font-bold mb-2">My Vehicles</Text>
        <Text className="text-gray-600 mb-6">
          Manage your vehicles for insurance coverage
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading your vehicles...</Text>
        </View>
      ) : (
        <View className="flex-1 px-6">
          {vehicles.length > 0 ? (
            <FlatList
              data={vehicles}
              renderItem={renderVehicleItem}
              keyExtractor={(item) => item.id || item.plateNumber}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshing={loading}
              onRefresh={loadVehicles}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-primary font-bold text-lg mb-2">No Vehicles Found</Text>
              <Text className="text-center text-gray-600 mb-6">
                You haven't added any vehicles yet. Add a vehicle to get started with insurance coverage.
              </Text>
              
              <TouchableOpacity
                onPress={handleAddVehicle}
                className="bg-secondary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Add a Vehicle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {vehicles.length > 0 && (
        <View className="p-6 pt-0">
          <TouchableOpacity
            onPress={handleAddVehicle}
            className="bg-secondary p-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-lg">Add Another Vehicle</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}