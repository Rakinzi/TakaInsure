import { VehicleInfo, VehicleDetectionResult, PlateDetectionResult } from '../types/vehicle';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://takainsure.app/api';

/**
 * Creates a form data object from an image URI
 */
const createImageFormData = (imageUri: string, fieldName: string = 'file') => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  formData.append(fieldName, {
    uri: imageUri,
    name: filename,
    type,
  } as any);
  
  return formData;
};

/**
 * Get authentication header with the user token
 */
const getAuthHeader = async () => {
  const userToken = await AsyncStorage.getItem('userToken');
  return {
    Authorization: `Bearer ${userToken}`,
  };
};

/**
 * Service to detect license plate from image
 */
export const detectLicensePlate = async (imageUri: string): Promise<PlateDetectionResult | null> => {
  try {
    const formData = createImageFormData(imageUri);
    
    const response = await axios.post(
      `${API_URL}/license-plate/detect`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.result) {
      return {
        plateNumber: response.data.result,
        confidence: response.data.confidence || 0.8,
      };
    }
    
    return null;
  } catch (error) {
    console.error('License plate detection error:', error);
    throw error;
  }
};

/**
 * Service to detect car make and model from image
 */
export const detectCarMakeModel = async (imageUri: string): Promise<VehicleDetectionResult | null> => {
  try {
    const formData = createImageFormData(imageUri);
    
    const response = await axios.post(
      `${API_URL}/car-recognition/detect`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const carResult = response.data.results.find((r: any) => 
        r.class === 'car' && r.predictions && r.predictions.length > 0);
      
      if (carResult && carResult.predictions[0]) {
        const prediction = carResult.predictions[0];
        
        // Extract year if present in the model string
        const yearMatch = prediction.model.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : undefined;
        
        return {
          make: prediction.make,
          model: prediction.model,
          year,
          confidence: parseFloat(prediction.prob),
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Car make/model detection error:', error);
    throw error;
  }
};

/**
 * Service to register a vehicle
 */
export const registerVehicle = async (vehicleInfo: VehicleInfo): Promise<string> => {
  try {
    const formData = new FormData();
    
    // Add vehicle details
    formData.append('plate_number', vehicleInfo.plateNumber);
    formData.append('car_make', vehicleInfo.carMake);
    formData.append('car_model', vehicleInfo.carModel);
    if (vehicleInfo.carYear) formData.append('car_year', vehicleInfo.carYear);
    
    // Add car image if exists
    if (vehicleInfo.carImageUri) {
      const carFilename = vehicleInfo.carImageUri.split('/').pop() || 'car.jpg';
      const carMatch = /\.(\w+)$/.exec(carFilename);
      const carType = carMatch ? `image/${carMatch[1]}` : 'image/jpeg';
      
      formData.append('car_image', {
        uri: vehicleInfo.carImageUri,
        name: carFilename,
        type: carType,
      } as any);
    }
    
    // Add plate image if exists
    if (vehicleInfo.plateImageUri) {
      const plateFilename = vehicleInfo.plateImageUri.split('/').pop() || 'plate.jpg';
      const plateMatch = /\.(\w+)$/.exec(plateFilename);
      const plateType = plateMatch ? `image/${plateMatch[1]}` : 'image/jpeg';
      
      formData.append('plate_image', {
        uri: vehicleInfo.plateImageUri,
        name: plateFilename,
        type: plateType,
      } as any);
    }
    
    const headers = await getAuthHeader();
    
    const response = await axios.post(
      `${API_URL}/vehicle/register`,
      formData,
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.success) {
      // Save the vehicle info locally
      const vehicleId = response.data.vehicleId;
      
      // Update the vehicle info with blockchain reference and ID
      const updatedVehicleInfo = {
        ...vehicleInfo,
        id: vehicleId,
        blockchainReference: response.data.blockchainReference,
        timestamp: new Date().toISOString(),
      };
      
      // Get existing vehicles or initialize new array
      const existingVehiclesJson = await AsyncStorage.getItem('userVehicles');
      const existingVehicles = existingVehiclesJson ? JSON.parse(existingVehiclesJson) : [];
      
      // Add the new vehicle
      existingVehicles.push(updatedVehicleInfo);
      
      // Save updated list
      await AsyncStorage.setItem('userVehicles', JSON.stringify(existingVehicles));
      
      return vehicleId;
    } else {
      throw new Error(response.data.error || 'Failed to register vehicle');
    }
  } catch (error) {
    console.error('Vehicle registration error:', error);
    throw error;
  }
};

/**
 * Service to get all user vehicles
 */
export const getUserVehicles = async (): Promise<VehicleInfo[]> => {
  try {
    // First try to get from local storage for faster response
    const localVehiclesJson = await AsyncStorage.getItem('userVehicles');
    const localVehicles = localVehiclesJson ? JSON.parse(localVehiclesJson) : [];
    
    // Then fetch from API to ensure we have the latest data
    const headers = await getAuthHeader();
    
    try {
      const response = await axios.get(
        `${API_URL}/vehicle/list`,
        { headers }
      );
      
      if (response.data && response.data.vehicles) {
        // Update local storage with latest data
        await AsyncStorage.setItem('userVehicles', JSON.stringify(response.data.vehicles));
        return response.data.vehicles;
      }
    } catch (apiError) {
      console.warn('Failed to fetch vehicles from API, using local data:', apiError);
      // If API fails, return local data
      return localVehicles;
    }
    
    return localVehicles;
  } catch (error) {
    console.error('Get user vehicles error:', error);
    throw error;
  }
};

/**
 * Service to get a specific vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<VehicleInfo | null> => {
  try {
    // First check local storage
    const vehiclesJson = await AsyncStorage.getItem('userVehicles');
    const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : [];
    
    const localVehicle = vehicles.find((v: VehicleInfo) => v.id === vehicleId);
    
    // If found locally, return it
    if (localVehicle) return localVehicle;
    
    // Otherwise fetch from API
    const headers = await getAuthHeader();
    
    const response = await axios.get(
      `${API_URL}/vehicle/${vehicleId}`,
      { headers }
    );
    
    if (response.data && response.data.vehicle) {
      return response.data.vehicle;
    }
    
    return null;
  } catch (error) {
    console.error(`Get vehicle ${vehicleId} error:`, error);
    throw error;
  }
};