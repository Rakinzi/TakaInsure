import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { VehicleInfo } from '../../types/vehicle';
import ImagePickerButton from './ImagePickerButton';
import { detectCarMakeModel, detectLicensePlate } from '../../services/vehicleService';

interface VehicleFormProps {
  initialData?: Partial<VehicleInfo>;
  onSubmit: (data: VehicleInfo) => Promise<void>;
  submitButtonText?: string;
  loading?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData = {},
  onSubmit,
  submitButtonText = 'Submit Vehicle Information',
  loading = false,
}) => {
  const [plateNumber, setPlateNumber] = useState(initialData.plateNumber || '');
  const [carMake, setCarMake] = useState(initialData.carMake || '');
  const [carModel, setCarModel] = useState(initialData.carModel || '');
  const [carYear, setCarYear] = useState(initialData.carYear || '');
  
  const [carImage, setCarImage] = useState<string | null>(initialData.carImageUri || null);
  const [plateImage, setPlateImage] = useState<string | null>(initialData.plateImageUri || null);
  
  const [carLoading, setCarLoading] = useState(false);
  const [plateLoading, setPlateLoading] = useState(false);
  const [isManualPlate, setIsManualPlate] = useState(false);
  
  const handleCarImageSelected = (uri: string) => {
    setCarImage(uri);
    processCarImage(uri);
  };
  
  const handlePlateImageSelected = (uri: string) => {
    setPlateImage(uri);
    processPlateImage(uri);
  };
  
  const processCarImage = async (uri: string) => {
    setCarLoading(true);
    try {
      const result = await detectCarMakeModel(uri);
      if (result) {
        setCarMake(result.make);
        setCarModel(result.model);
        if (result.year) {
          setCarYear(result.year);
        }
      }
    } catch (error) {
      console.error('Error processing car image:', error);
      Alert.alert(
        'Detection Failed',
        'Could not detect car make and model. Please enter manually.'
      );
    } finally {
      setCarLoading(false);
    }
  };
  
  const processPlateImage = async (uri: string) => {
    setPlateLoading(true);
    setIsManualPlate(false);
    try {
      const result = await detectLicensePlate(uri);
      if (result && result.plateNumber) {
        setPlateNumber(result.plateNumber);
      } else {
        setIsManualPlate(true);
        Alert.alert(
          'License Plate Not Detected',
          'Please enter the license plate manually.'
        );
      }
    } catch (error) {
      console.error('Error processing plate image:', error);
      setIsManualPlate(true);
      Alert.alert(
        'Detection Failed',
        'Could not detect the license plate. Please enter it manually.'
      );
    } finally {
      setPlateLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    // Validate required fields
    if (!carImage) {
      Alert.alert('Missing Information', 'Please upload a photo of your vehicle');
      return;
    }
    
    if (!plateNumber) {
      Alert.alert('Missing Information', 'Please provide your vehicle license plate number');
      return;
    }
    
    if (!carMake || !carModel) {
      Alert.alert('Missing Information', 'Please provide your vehicle make and model');
      return;
    }
    
    const vehicleData: VehicleInfo = {
      plateNumber,
      carMake,
      carModel,
      carYear: carYear || undefined,
      carImageUri: carImage ?? undefined,
      plateImageUri: plateImage ?? undefined,
    };
    
    try {
      await onSubmit(vehicleData);
    } catch (error) {
      console.error('Form submission error:', error);
      Alert.alert(
        'Submission Failed',
        'There was an error submitting your vehicle information. Please try again.'
      );
    }
  };
  
  return (
    <ScrollView>
      {/* Car Photo Section */}
      <ImagePickerButton
        title="Vehicle Photo"
        subtitle="Take or upload a clear photo of your vehicle"
        imageUri={carImage}
        onImageSelected={handleCarImageSelected}
        loading={carLoading}
        loadingText="Analyzing vehicle..."
        height={200}
      />
      
      {carMake && carModel && (
        <View className="mt-1 mb-4 p-3 bg-green-50 rounded-lg">
          <Text className="text-green-800 font-medium mb-1">Detected Vehicle:</Text>
          <Text className="text-green-800">Make: {carMake}</Text>
          <Text className="text-green-800">Model: {carModel}</Text>
          {carYear && <Text className="text-green-800">Year: {carYear}</Text>}
        </View>
      )}

      {/* License Plate Section */}
      <ImagePickerButton
        title="License Plate"
        subtitle="Take a photo of your license plate or enter the number manually"
        imageUri={plateImage}
        onImageSelected={handlePlateImageSelected}
        loading={plateLoading}
        loadingText="Reading plate number..."
        height={150}
      />
      
      <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <Text className="text-primary font-medium mb-2">License Plate Number</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white"
          placeholder="Enter license plate number"
          value={plateNumber}
          onChangeText={setPlateNumber}
          autoCapitalize="characters"
        />
        
        {plateNumber && !isManualPlate && (
          <View className="mt-2 p-2 bg-green-50 rounded-lg">
            <Text className="text-green-800">Detected plate: {plateNumber}</Text>
          </View>
        )}
        
        <TouchableOpacity
          onPress={() => setIsManualPlate(true)}
          className="mt-2"
        >
          <Text className="text-secondary">Enter manually instead</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Vehicle Info Section */}
      <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <Text className="text-primary font-bold text-lg mb-3">Vehicle Details</Text>
        <Text className="text-gray-600 mb-3">
          Please verify or manually enter your vehicle details below
        </Text>
        
        <Text className="text-primary font-medium mb-2">Make</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white mb-3"
          placeholder="e.g. Toyota, Ford, Honda"
          value={carMake}
          onChangeText={setCarMake}
        />
        
        <Text className="text-primary font-medium mb-2">Model</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white mb-3"
          placeholder="e.g. Corolla, F-150, Civic"
          value={carModel}
          onChangeText={setCarModel}
        />
        
        <Text className="text-primary font-medium mb-2">Year (Optional)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white"
          placeholder="e.g. 2018"
          value={carYear}
          onChangeText={setCarYear}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className={`${loading ? 'bg-gray-400' : 'bg-secondary'} rounded-xl p-4 items-center mb-6`}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-lg">{submitButtonText}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default VehicleForm;