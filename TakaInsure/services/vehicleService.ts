import { VehicleInfo, VehicleDetectionResult, PlateDetectionResult } from '../types/vehicle';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getVehiclesFromSupabase, getVehicleFromSupabase } from './supabaseClient';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    
    // Get user data to associate with the vehicle
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id || null;
    
    // Add vehicle details
    formData.append('plate_number', vehicleInfo.plateNumber);
    formData.append('car_make', vehicleInfo.carMake);
    formData.append('car_model', vehicleInfo.carModel);
    if (vehicleInfo.carYear) formData.append('car_year', vehicleInfo.carYear);
    if (policyHolderId) formData.append('policyholder_id', policyHolderId);
    
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
      
      // Update the vehicle info with ID
      const updatedVehicleInfo = {
        ...vehicleInfo,
        id: vehicleId,
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
    // Get user data to find policyholder ID
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id;
    
    if (!policyHolderId) {
      console.error('No policyholder ID found in user data');
      return [];
    }
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(policyHolderId)) {
      console.error('Invalid policyholder ID format - not a valid UUID');
      return [];
    }
    
    // Try to get directly from Supabase first
    try {
      const vehicles = await getVehiclesFromSupabase(policyHolderId);
      
      if (vehicles && vehicles.length > 0) {
        const formattedVehicles = vehicles.map(vehicle => ({
          id: vehicle.vehicle_id,
          plateNumber: vehicle.plate_number,
          carMake: vehicle.car_make,
          carModel: vehicle.car_model,
          carYear: vehicle.car_year,
          carImageUri: vehicle.car_image_url,
          plateImageUri: vehicle.plate_image_url,
          timestamp: vehicle.created_at,
          status: vehicle.status,
          policyHolderId: vehicle.policyholder_id
        }));
        
        // Update local storage with latest data
        await AsyncStorage.setItem('userVehicles', JSON.stringify(formattedVehicles));
        
        return formattedVehicles;
      }
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, trying API fallback:', supabaseError);
    }
    
    // Fallback to API if Supabase fails
    try {
      const headers = await getAuthHeader();
      
      const response = await axios.get(
        `${API_URL}/vehicle/list?policyholder_id=${policyHolderId}`,
        { headers }
      );
      
      if (response.data && response.data.vehicles) {
        // Update local storage with latest data
        await AsyncStorage.setItem('userVehicles', JSON.stringify(response.data.vehicles));
        return response.data.vehicles;
      }
    } catch (apiError) {
      console.warn('Failed to fetch vehicles from API:', apiError);
      // If API fails, return local data
      const localVehiclesJson = await AsyncStorage.getItem('userVehicles');
      return localVehiclesJson ? JSON.parse(localVehiclesJson) : [];
    }
    
    // If all methods fail, return empty array
    return [];
  } catch (error) {
    console.error('Get user vehicles error:', error);
    
    // Return cached data from local storage as fallback
    const localVehiclesJson = await AsyncStorage.getItem('userVehicles');
    return localVehiclesJson ? JSON.parse(localVehiclesJson) : [];
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
    
    // Try to get directly from Supabase
    try {
      const vehicle = await getVehicleFromSupabase(vehicleId);
      
      if (vehicle) {
        return {
          id: vehicle.vehicle_id,
          plateNumber: vehicle.plate_number,
          carMake: vehicle.car_make,
          carModel: vehicle.car_model,
          carYear: vehicle.car_year,
          carImageUri: vehicle.car_image_url,
          plateImageUri: vehicle.plate_image_url,
          timestamp: vehicle.created_at,
          status: vehicle.status,
          policyHolderId: vehicle.policyholder_id
        };
      }
    } catch (supabaseError) {
      console.warn(`Supabase vehicle query error for ${vehicleId}:`, supabaseError);
    }
    
    // Fallback to API if Supabase fails
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
    return null;
  }
};

/**
 * Service to update a vehicle
 */
export const updateVehicle = async (vehicleId: string, updates: Partial<VehicleInfo>): Promise<VehicleInfo | null> => {
  try {
    const headers = await getAuthHeader();
    
    // Prepare data for API request
    const data: any = {};
    
    if (updates.plateNumber) data.plateNumber = updates.plateNumber;
    if (updates.carMake) data.carMake = updates.carMake;
    if (updates.carModel) data.carModel = updates.carModel;
    if (updates.carYear) data.carYear = updates.carYear;
    if (updates.status) data.status = updates.status;
    
    const response = await axios.put(
      `${API_URL}/vehicle/${vehicleId}`,
      data,
      { headers }
    );
    
    if (response.data && response.data.success && response.data.vehicle) {
      // Update local storage
      const vehiclesJson = await AsyncStorage.getItem('userVehicles');
      const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : [];
      
      const updatedVehicles = vehicles.map((v: VehicleInfo) => 
        v.id === vehicleId ? { ...v, ...response.data.vehicle } : v
      );
      
      await AsyncStorage.setItem('userVehicles', JSON.stringify(updatedVehicles));
      
      return response.data.vehicle;
    } else {
      throw new Error(response.data?.error || 'Failed to update vehicle');
    }
  } catch (error) {
    console.error(`Update vehicle ${vehicleId} error:`, error);
    throw error;
  }
};

/**
 * Service to update a vehicle's images
 */
export const updateVehicleImages = async (
  vehicleId: string, 
  carImageUri?: string, 
  plateImageUri?: string
): Promise<VehicleInfo | null> => {
  try {
    const headers = await getAuthHeader();
    
    const formData = new FormData();
    
    // Add car image if provided
    if (carImageUri) {
      const carFilename = carImageUri.split('/').pop() || 'car.jpg';
      const carMatch = /\.(\w+)$/.exec(carFilename);
      const carType = carMatch ? `image/${carMatch[1]}` : 'image/jpeg';
      
      formData.append('car_image', {
        uri: carImageUri,
        name: carFilename,
        type: carType,
      } as any);
    }
    
    // Add plate image if provided
    if (plateImageUri) {
      const plateFilename = plateImageUri.split('/').pop() || 'plate.jpg';
      const plateMatch = /\.(\w+)$/.exec(plateFilename);
      const plateType = plateMatch ? `image/${plateMatch[1]}` : 'image/jpeg';
      
      formData.append('plate_image', {
        uri: plateImageUri,
        name: plateFilename,
        type: plateType,
      } as any);
    }
    
    const response = await axios.put(
      `${API_URL}/vehicle/${vehicleId}/images`,
      formData,
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.success && response.data.vehicle) {
      // Update local storage
      const vehiclesJson = await AsyncStorage.getItem('userVehicles');
      const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : [];
      
      const updatedVehicles = vehicles.map((v: VehicleInfo) => 
        v.id === vehicleId ? { ...v, ...response.data.vehicle } : v
      );
      
      await AsyncStorage.setItem('userVehicles', JSON.stringify(updatedVehicles));
      
      return response.data.vehicle;
    } else {
      throw new Error(response.data?.error || 'Failed to update vehicle images');
    }
  } catch (error) {
    console.error(`Update vehicle images ${vehicleId} error:`, error);
    throw error;
  }
};

/**
 * Service to delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  try {
    const headers = await getAuthHeader();
    
    const response = await axios.delete(
      `${API_URL}/vehicle/${vehicleId}`,
      { headers }
    );
    
    if (response.data && response.data.success) {
      // Update local storage
      const vehiclesJson = await AsyncStorage.getItem('userVehicles');
      const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : [];
      
      const updatedVehicles = vehicles.filter((v: VehicleInfo) => v.id !== vehicleId);
      
      await AsyncStorage.setItem('userVehicles', JSON.stringify(updatedVehicles));
      
      return true;
    } else {
      throw new Error(response.data?.error || 'Failed to delete vehicle');
    }
  } catch (error) {
    console.error(`Delete vehicle ${vehicleId} error:`, error);
    throw error;
  }
};