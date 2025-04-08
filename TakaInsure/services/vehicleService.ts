import { VehicleInfo, VehicleDetectionResult, PlateDetectionResult } from '../types/vehicle';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { getApiUrl } from './networkService';

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
    const API_URL = await getApiUrl();
    
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
    const API_URL = await getApiUrl();
    
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
 * Upload an image to Supabase storage
 */
const uploadImageToStorage = async (imageUri: string, folder: string, filename: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const filePath = `${folder}/${filename}.${fileExt}`;
    console.log(filePath)
    const { data, error } = await supabase
      .storage
      .from('takainsure')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image to Supabase storage:', error);
      return null;
    }
    
    // Get public URL of the uploaded file
    const { data: urlData } = supabase
      .storage
      .from('takainsure')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    return null;
  }
};

/**
 * Service to register a vehicle
 */
export const registerVehicle = async (vehicleInfo: VehicleInfo): Promise<string> => {
  try {
    // Get user data to associate with the vehicle
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id || null;
    
    if (!policyHolderId) {
      throw new Error('No policyholder ID found - user must be logged in');
    }
    
    // Upload vehicle images to storage if provided
    let carImageUrl = null;
    let plateImageUrl = null;
    
    if (vehicleInfo.carImageUri) {
      const filename = `car_${new Date().getTime()}`;
      carImageUrl = await uploadImageToStorage(vehicleInfo.carImageUri, 'vehicles', filename);
    }
    
    if (vehicleInfo.plateImageUri) {
      const filename = `plate_${new Date().getTime()}`;
      plateImageUrl = await uploadImageToStorage(vehicleInfo.plateImageUri, 'plates', filename);
    }
    
    // Prepare vehicle data for insertion
    const vehicleData = {
      policyholder_id: policyHolderId,
      plate_number: vehicleInfo.plateNumber,
      car_make: vehicleInfo.carMake,
      car_model: vehicleInfo.carModel,
      car_year: vehicleInfo.carYear,
      car_image_url: carImageUrl,
      plate_image_url: plateImageUrl,
      status: 'active'
    };
    
    // Insert into vehicles table
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select();
    
    if (error) {
      console.error('Error registering vehicle in Supabase:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to create vehicle record');
    }
    
    const vehicleId = data[0].vehicle_id;
    return vehicleId;
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
    
    // Get vehicles from Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('policyholder_id', policyHolderId);
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
    
    // Format the vehicles
    const formattedVehicles = data.map(vehicle => ({
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
    
    return formattedVehicles;
  } catch (error) {
    console.error('Get user vehicles error:', error);
    return [];
  }
};

/**
 * Service to get a specific vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<VehicleInfo | null> => {
  try {
    // Get vehicle from Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single();
    
    if (error) {
      console.error(`Error fetching vehicle ${vehicleId}:`, error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Format the vehicle
    return {
      id: data.vehicle_id,
      plateNumber: data.plate_number,
      carMake: data.car_make,
      carModel: data.car_model,
      carYear: data.car_year,
      carImageUri: data.car_image_url,
      plateImageUri: data.plate_image_url,
      timestamp: data.created_at,
      status: data.status,
      policyHolderId: data.policyholder_id
    };
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
    // Prepare update data
    const updateData: any = {};
    
    if (updates.plateNumber) updateData.plate_number = updates.plateNumber;
    if (updates.carMake) updateData.car_make = updates.carMake;
    if (updates.carModel) updateData.car_model = updates.carModel;
    if (updates.carYear) updateData.car_year = updates.carYear;
    if (updates.status) updateData.status = updates.status;
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Update in Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('vehicle_id', vehicleId)
      .select();
    
    if (error) {
      console.error(`Error updating vehicle ${vehicleId}:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to update vehicle');
    }
    
    // Format the updated vehicle
    return {
      id: data[0].vehicle_id,
      plateNumber: data[0].plate_number,
      carMake: data[0].car_make,
      carModel: data[0].car_model,
      carYear: data[0].car_year,
      carImageUri: data[0].car_image_url,
      plateImageUri: data[0].plate_image_url,
      timestamp: data[0].created_at,
      status: data[0].status,
      policyHolderId: data[0].policyholder_id
    };
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
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Upload car image if provided
    if (carImageUri) {
      const filename = `car_${vehicleId}_${new Date().getTime()}`;
      const carImageUrl = await uploadImageToStorage(carImageUri, 'vehicles', filename);
      if (carImageUrl) {
        updateData.car_image_url = carImageUrl;
      }
    }
    
    // Upload plate image if provided
    if (plateImageUri) {
      const filename = `plate_${vehicleId}_${new Date().getTime()}`;
      const plateImageUrl = await uploadImageToStorage(plateImageUri, 'plates', filename);
      if (plateImageUrl) {
        updateData.plate_image_url = plateImageUrl;
      }
    }
    
    // Update in Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('vehicle_id', vehicleId)
      .select();
    
    if (error) {
      console.error(`Error updating vehicle images ${vehicleId}:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to update vehicle images');
    }
    
    // Format the updated vehicle
    return {
      id: data[0].vehicle_id,
      plateNumber: data[0].plate_number,
      carMake: data[0].car_make,
      carModel: data[0].car_model,
      carYear: data[0].car_year,
      carImageUri: data[0].car_image_url,
      plateImageUri: data[0].plate_image_url,
      timestamp: data[0].created_at,
      status: data[0].status,
      policyHolderId: data[0].policyholder_id
    };
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
    // Delete from Supabase
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicleId);
    
    if (error) {
      console.error(`Error deleting vehicle ${vehicleId}:`, error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Delete vehicle ${vehicleId} error:`, error);
    throw error;
  }
};