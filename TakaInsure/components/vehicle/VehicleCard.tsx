import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { VehicleInfo } from '../../types/vehicle';

interface VehicleCardProps {
  vehicle: VehicleInfo;
  showActions?: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ 
  vehicle, 
  showActions = true 
}) => {
  const router = useRouter();
  
  const handleViewDetails = () => {
    router.push({
      pathname: '/vehicle/details',
      params: { vehicleId: vehicle.id }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently added';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  return (
    <TouchableOpacity 
      className="bg-white rounded-xl p-4 shadow-sm mb-4 border-l-4 border-secondary"
      onPress={handleViewDetails}
    >
      <View className="flex-row">
        {vehicle.carImageUri ? (
          <Image
            source={{ uri: vehicle.carImageUri }}
            className="w-24 h-24 rounded-lg mr-4"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-24 bg-gray-200 rounded-lg mr-4 items-center justify-center">
            <Text className="text-gray-500">No image</Text>
          </View>
        )}
        
        <View className="flex-1">
          <View className="flex-row justify-between mb-1">
            <Text className="text-primary font-bold text-lg">{vehicle.carMake} {vehicle.carModel}</Text>
            <View className="bg-green-100 px-2 py-0.5 rounded-full">
              <Text className="text-green-800 text-xs font-medium">Verified</Text>
            </View>
          </View>
          
          <Text className="text-secondary font-bold">{vehicle.plateNumber}</Text>
          
          {vehicle.carYear && (
            <Text className="text-gray-600 mt-1">Year: {vehicle.carYear}</Text>
          )}
          
          <Text className="text-gray-500 text-xs mt-2">
            Added: {formatDate(vehicle.timestamp)}
          </Text>
        </View>
      </View>
      
      {showActions && (
        <View className="flex-row justify-end mt-3 pt-2 border-t border-gray-200">
          <TouchableOpacity 
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={handleViewDetails}
          >
            <Text className="text-white">View Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default VehicleCard;