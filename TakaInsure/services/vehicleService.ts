import { VehicleInfo, VehicleDetectionResult, PlateDetectionResult } from '../types/vehicle';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDynamicApiInstance, ApiUrlManager } from './api';

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
 * Base Vehicle Service with Dynamic API Instance
 */
class VehicleService {
  private api: AxiosInstance | null = null;
  private apiUrl: string | null = null;

  /**
   * Ensure API instance is created with dynamic URL
   */
  private async getApiInstance(): Promise<AxiosInstance> {
    if (!this.api) {
      this.api = await createDynamicApiInstance();
      
      // Get and store the current API URL for logging purposes
      const apiUrlManager = ApiUrlManager.getInstance();
      this.apiUrl = await apiUrlManager.getApiUrl();
    }
    return this.api;
  }

  /**
   * Log error with API URL details
   */
  private logErrorWithUrl(context: string, error: any) {
    console.error(`${context} - API URL: ${this.apiUrl}`, error);
  }

  /**
   * Service to detect license plate from image
   */
  async detectLicensePlate(imageUri: string): Promise<PlateDetectionResult | null> {
    try {
      const api = await this.getApiInstance();
      const formData = createImageFormData(imageUri);
      
      const response = await api.post('/license-plate/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data && response.data.result) {
        return {
          plateNumber: response.data.result,
          confidence: response.data.confidence || 0.8,
        };
      }
      
      return null;
    } catch (error) {
      this.logErrorWithUrl('License plate detection error', error);
      throw error;
    }
  }

  /**
   * Service to detect car make and model from image
   */
  async detectCarMakeModel(imageUri: string): Promise<VehicleDetectionResult | null> {
    try {
      const api = await this.getApiInstance();
      const formData = createImageFormData(imageUri);
      
      const response = await api.post('/car-recognition/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
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
      this.logErrorWithUrl('Car make/model detection error', error);
      throw error;
    }
  }

  /**
   * Service to register a vehicle
   */
  async registerVehicle(vehicleInfo: VehicleInfo): Promise<string> {
    try {
      const api = await this.getApiInstance();
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
      
      const response = await api.post('/vehicle/register', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      
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
      this.logErrorWithUrl('Vehicle registration error', error);
      throw error;
    }
  }

  /**
   * Service to get all user vehicles
   */
  async getUserVehicles(): Promise<VehicleInfo[]> {
    try {
      // First try to get from local storage for faster response
      const localVehiclesJson = await AsyncStorage.getItem('userVehicles');
      const localVehicles = localVehiclesJson ? JSON.parse(localVehiclesJson) : [];
      
      // Then fetch from API to ensure we have the latest data
      const api = await this.getApiInstance();
      const headers = await getAuthHeader();
      
      try {
        const response = await api.get('/vehicle/list', { headers });
        
        if (response.data && response.data.vehicles) {
          // Update local storage with latest data
          await AsyncStorage.setItem('userVehicles', JSON.stringify(response.data.vehicles));
          return response.data.vehicles;
        }
      } catch (apiError) {
        this.logErrorWithUrl('Failed to fetch vehicles from API', apiError);
        
        // If API fails, return local data
        return localVehicles;
      }
      
      return localVehicles;
    } catch (error) {
      this.logErrorWithUrl('Get user vehicles error', error);
      throw error;
    }
  }

  /**
   * Service to get a specific vehicle by ID
   */
  async getVehicleById(vehicleId: string): Promise<VehicleInfo | null> {
    try {
      // First check local storage
      const vehiclesJson = await AsyncStorage.getItem('userVehicles');
      const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : [];
      
      const localVehicle = vehicles.find((v: VehicleInfo) => v.id === vehicleId);
      
      // If found locally, return it
      if (localVehicle) return localVehicle;
      
      // Otherwise fetch from API
      const api = await this.getApiInstance();
      const headers = await getAuthHeader();
      
      const response = await api.get(`/vehicle/${vehicleId}`, { headers });
      
      if (response.data && response.data.vehicle) {
        return response.data.vehicle;
      }
      
      return null;
    } catch (error) {
      this.logErrorWithUrl(`Get vehicle ${vehicleId} error`, error);
      throw error;
    }
  }
}

// Export an instance of the service
export const vehicleService = new VehicleService();

// Also export individual methods for backwards compatibility
export const detectLicensePlate = (imageUri: string) => 
  vehicleService.detectLicensePlate(imageUri);

export const detectCarMakeModel = (imageUri: string) => 
  vehicleService.detectCarMakeModel(imageUri);

export const registerVehicle = (vehicleInfo: VehicleInfo) => 
  vehicleService.registerVehicle(vehicleInfo);

export const getUserVehicles = () => 
  vehicleService.getUserVehicles();

export const getVehicleById = (vehicleId: string) => 
  vehicleService.getVehicleById(vehicleId);