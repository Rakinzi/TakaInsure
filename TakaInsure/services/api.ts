import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variable if available, otherwise use localhost for development
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
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
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // You could implement token refresh logic here
      // For now, we'll just redirect to login
      
      // Clear storage and redirect to login (to be handled by the component)
      await AsyncStorage.multiRemove(['userToken', 'policyHolderId', 'phoneNumber']);
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// API functions for authentication
export const authAPI = {
  login: async (policyHolderId: string, phoneNumber: string) => {
    try {
      // In a real app, this would be a real API call
      // For demo purposes, we're just simulating a successful login
      console.log('Logging in with:', { policyHolderId, phoneNumber });
      
      // Simulate API response
      return {
        success: true,
        data: {
          token: 'sample-jwt-token',
          user: {
            id: policyHolderId,
            phone: phoneNumber,
            name: 'John Doe',
          },
        },
      };
      
      // Real API call would look like this:
      // const response = await api.post('/auth/login', { policyHolderId, phoneNumber });
      // return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // In a real app, you might want to invalidate the token on the server
      // await api.post('/auth/logout');
      
      // Clear stored credentials
      await AsyncStorage.multiRemove(['userToken', 'policyHolderId', 'phoneNumber']);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
};

// API functions for claims
export const claimsAPI = {
  submitClaim: async (claimData: any, images: any[]) => {
    try {
      console.log('Submitting claim:', { claimData, imageCount: images.length });
      
      // Simulate a successful response
      return {
        success: true,
        data: {
          claimId: `CLM${Math.floor(Math.random() * 1000000)}`,
          status: 'pending',
          submittedAt: new Date().toISOString(),
        },
      };
      
      // Real implementation would use FormData to upload images
      // const formData = new FormData();
      // formData.append('incidentDate', claimData.incidentDate);
      // formData.append('incidentLocation', claimData.incidentLocation);
      // formData.append('incidentDescription', claimData.incidentDescription);
      // formData.append('incidentType', claimData.incidentType);
      
      // images.forEach((image, index) => {
      //   formData.append(`images[${index}]`, {
      //     uri: image.uri,
      //     type: image.type,
      //     name: image.name,
      //   });
      // });
      
      // const response = await api.post('/claims', formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data',
      //   },
      // });
      // return response.data;
    } catch (error) {
      console.error('Submit claim error:', error);
      throw error;
    }
  },
  
  getClaims: async () => {
    try {
      // Simulate API response
      return {
        success: true,
        data: [
          {
            id: 'CLM123456',
            type: 'car_accident',
            status: 'processing',
            date: '2025-04-01',
            amount: 3500,
          },
          {
            id: 'CLM789012',
            type: 'property_damage',
            status: 'approved',
            date: '2025-03-15',
            amount: 1200,
          },
        ],
      };
      
      // Real API call:
      // const response = await api.get('/claims');
      // return response.data;
    } catch (error) {
      console.error('Get claims error:', error);
      throw error;
    }
  },
};

// API functions for insurance packages
export const insuranceAPI = {
  getPackages: async () => {
    try {
      // Simulate API response
      return {
        success: true,
        data: [
          {
            id: 'basic',
            name: 'Basic Coverage',
            coverageAmount: 2000,
            premium: 25,
            term: 12,
          },
          {
            id: 'standard',
            name: 'Standard Protection',
            coverageAmount: 4000,
            premium: 45,
            term: 12,
          },
          {
            id: 'premium',
            name: 'Premium Shield',
            coverageAmount: 6000,
            premium: 65,
            term: 12,
          },
        ],
      };
      
      // Real API call:
      // const response = await api.get('/insurance/packages');
      // return response.data;
    } catch (error) {
      console.error('Get packages error:', error);
      throw error;
    }
  },
  
  subscribeToPackage: async (packageId: string) => {
    try {
      console.log('Subscribing to package:', packageId);
      
      // Simulate API response
      return {
        success: true,
        data: {
          id: packageId,
          activationDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          transactionHash: '0x' + Math.random().toString(16).substring(2, 34),
        },
      };
      
      // Real API call:
      // const response = await api.post('/insurance/subscribe', { packageId });
      // return response.data;
    } catch (error) {
      console.error('Subscribe error:', error);
      throw error;
    }
  },
};

// API functions for user profile
export const userAPI = {
  getProfile: async () => {
    try {
      // Simulate API response
      const policyHolderId = await AsyncStorage.getItem('policyHolderId') || 'Unknown';
      const phoneNumber = await AsyncStorage.getItem('phoneNumber') || 'Unknown';
      
      return {
        success: true,
        data: {
          fullName: 'John Doe',
          phoneNumber,
          policyHolderId,
          dateOfBirth: '1985-06-15',
          address: '123 Lilly St, Sunway City, Ruwa',
          activePolicies: 1,
          activeClaims: 2,
        },
      };
      
      // Real API call:
      // const response = await api.get('/user/profile');
      // return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },
};

export default api;