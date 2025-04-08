import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// API URL configuration
class ApiUrlManager {
  private static instance: ApiUrlManager;
  private apiUrl: string | null = null;

  private constructor() {}

  // Singleton pattern to ensure only one instance exists
  public static getInstance(): ApiUrlManager {
    if (!ApiUrlManager.instance) {
      ApiUrlManager.instance = new ApiUrlManager();
    }
    return ApiUrlManager.instance;
  }

  // Method to get the API URL dynamically
  public async getApiUrl(): Promise<string> {
    // Check if URL is already cached
    if (this.apiUrl) {
      return this.apiUrl;
    }

    // Try to get cached URL from AsyncStorage
    const cachedUrl = await AsyncStorage.getItem('API_BASE_URL');
    if (cachedUrl) {
      this.apiUrl = cachedUrl;
      return cachedUrl;
    }

    // Dynamically get IP address
    try {
      const ip = await Network.getIpAddressAsync();
      this.apiUrl = `http://${ip}:5000/api`;
      
      // Cache the URL for future use
      await AsyncStorage.setItem('API_BASE_URL', this.apiUrl);
      
      return this.apiUrl;
    } catch (error) {
      console.warn('Could not get IP address, falling back to localhost');
      this.apiUrl = 'http://localhost:5000/api';
      
      // Cache the fallback URL
      await AsyncStorage.setItem('API_BASE_URL', this.apiUrl);
      
      return this.apiUrl;
    }
  }

  // Method to manually set or override the API URL
  public async setApiUrl(url: string): Promise<void> {
    this.apiUrl = url;
    await AsyncStorage.setItem('API_BASE_URL', url);
  }

  // Method to reset the API URL
  public async resetApiUrl(): Promise<void> {
    this.apiUrl = null;
    await AsyncStorage.removeItem('API_BASE_URL');
  }
}

// Create an axios instance with a dynamic base URL
const createDynamicApiInstance = async () => {
  const apiUrlManager = ApiUrlManager.getInstance();
  const baseURL = await apiUrlManager.getApiUrl();

  const api = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add authentication token
  api.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle common errors
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Handle 401 Unauthorized errors (token expired)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Clear storage and redirect to login
        await AsyncStorage.multiRemove(['userToken', 'policyHolderId', 'phoneNumber']);
        
        return Promise.reject(error);
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

// Export the API URL manager and a function to get the dynamic API instance
export { 
  ApiUrlManager, 
  createDynamicApiInstance 
};