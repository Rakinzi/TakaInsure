import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types for claim data
type IncidentType = 'car_accident' | 'property_damage' | 'personal_injury' | 'other';

export default function NewClaimScreen() {
  const router = useRouter();
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);

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
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-4"
            placeholder="YYYY-MM-DD"
            value={incidentDate}
            onChangeText={setIncidentDate}
          />

          <Text className="text-primary font-bold mb-2">Where did the incident occur?</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 mb-4"
            placeholder="Enter location"
            value={incidentLocation}
            onChangeText={setIncidentLocation}
          />

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