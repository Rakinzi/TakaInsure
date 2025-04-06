import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

// Types for claim data
type IncidentType = 'car_accident' | 'property_damage' | 'personal_injury' | 'other';

export default function NewClaimScreen() {
  const router = useRouter();
  const [incidentDate, setIncidentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleNext = () => {
    // Basic validation
    if (!incidentDate || !incidentLocation || !incidentDescription || !incidentType) {
      Alert.alert('Missing Information', 'Please fill in all fields before proceeding.');
      return;
    }

    // Save the initial claim data and navigate to upload screen
    const claimData = {
      incidentDate,
      incidentLocation,
      incidentDescription,
      incidentType,
    };

    try {
      // In a real app, you would save this to AsyncStorage or state management
      router.push({
        pathname: '/claim/upload',
        params: { claimType: incidentType }
      });
    } catch (error) {
      console.error('Error proceeding to upload:', error);
      Alert.alert('Error', 'There was a problem creating your claim. Please try again.');
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    const currentDate = date || new Date();
    setShowDatePicker(Platform.OS === 'ios'); // Only iOS keeps the picker open
    if (date) {
      setIncidentDate(currentDate.toISOString());
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  const getLocationAsync = async () => {
    setGettingLocation(true);
    try {
      // Ask for location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature');
        setGettingLocation(false);
        return;
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Get address from coordinates
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (geocode.length > 0) {
        const address = geocode[0];
        const locationString = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        
        setIncidentLocation(locationString);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please enter it manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const renderIncidentTypeButton = (type: IncidentType, label: string) => (
    <TouchableOpacity
      onPress={() => setIncidentType(type)}
      className={`border rounded-lg p-4 mb-3 ${
        incidentType === type ? 'bg-secondary border-secondary' : 'border-gray-300 bg-white'
      }`}
    >
      <Text
        className={`text-center font-medium ${
          incidentType === type ? 'text-white' : 'text-primary'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-6">New Claim Information</Text>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-primary text-lg font-bold mb-4">
            What type of incident are you claiming for?
          </Text>

          {renderIncidentTypeButton('car_accident', 'Car Accident')}
          {renderIncidentTypeButton('property_damage', 'Property Damage')}
          {renderIncidentTypeButton('personal_injury', 'Personal Injury')}
          {renderIncidentTypeButton('other', 'Other')}
        </View>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-primary font-bold mb-2">When did the incident occur?</Text>
          
          {/* Date picker field */}
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            className="border border-gray-300 rounded-lg p-4 mb-4"
          >
            <Text className="text-gray-700">
              {incidentDate ? formatDate(incidentDate) : 'Select date'}
            </Text>
          </TouchableOpacity>
          
          {/* Date picker modal */}
          {showDatePicker && (
            <DateTimePicker
              value={new Date(incidentDate || Date.now())}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <Text className="text-primary font-bold mb-2">Where did the incident occur?</Text>
          
          {/* Location input with current location button */}
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-lg p-4"
              placeholder="Enter location"
              value={incidentLocation}
              onChangeText={setIncidentLocation}
            />
            
            <TouchableOpacity 
              onPress={getLocationAsync}
              disabled={gettingLocation}
              className="absolute right-2 top-2 bg-secondary p-2 rounded-md"
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-xs">Current Location</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-primary font-bold mb-2">Describe the incident</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 h-32"
            placeholder="Provide details about what happened..."
            value={incidentDescription}
            onChangeText={setIncidentDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleNext}
          className="bg-secondary rounded-xl p-4 items-center mb-6"
        >
          <Text className="text-white font-bold text-lg">Next - Upload Evidence</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}