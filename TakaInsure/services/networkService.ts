// Updates to TakaInsure/services/networkService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Default API URL - this will be overridden if configured in settings
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

/**
 * Get device's IP address if possible
 */
export const getDeviceIP = async (): Promise<string | null> => {
  try {
    const networkState = await NetInfo.fetch();
    
    if (networkState.isConnected && networkState.type === 'wifi' && networkState.details) {
      // Cast details to any to access ipAddress property
      const details = networkState.details as any;
      return details.ipAddress || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting device IP:', error);
    return null;
  }
};

/**
 * Get the configured API URL or fall back to the default
 */
export const getApiUrl = async (): Promise<string> => {
  try {
    // First try to get a saved API URL (if user has configured it)
    const savedApiUrl = await AsyncStorage.getItem('apiUrl');
    if (savedApiUrl) {
      console.log('Using saved API URL:', savedApiUrl);
      
      // Make sure the URL ends with /api
      if (!savedApiUrl.endsWith('/api')) {
        return savedApiUrl.endsWith('/') ? `${savedApiUrl}api` : `${savedApiUrl}/api`;
      }
      
      return savedApiUrl;
    }
    
    // Try to auto-discover the IP if we're on a physical device
    if (Platform.OS !== 'web') {
      const deviceIP = await getDeviceIP();
      if (deviceIP) {
        // For simulator/emulator - might be able to use the host machine's API
        // Check if we're in iOS simulator (which can use localhost)
        if (Platform.OS === 'ios' && deviceIP.startsWith('192.168.')) {
          const autoUrl = `http://${deviceIP}:5000/api`;
          
          // Store this for next time
          await AsyncStorage.setItem('autoDetectedApiUrl', autoUrl);
          
          // Just log this was detected, don't use it yet
          console.log('Auto-detected possible API URL:', autoUrl);
        }
      }
    }
    
    // Use the default as fallback
    console.log('Using default API URL:', DEFAULT_API_URL);
    return DEFAULT_API_URL;
  } catch (error) {
    console.warn('Could not determine API URL, falling back to default', error);
    return DEFAULT_API_URL;
  }
};

/**
 * Get the base URL without the /api suffix
 */
export const getBaseUrl = async (): Promise<string> => {
  const apiUrl = await getApiUrl();
  return apiUrl.endsWith('/api') 
    ? apiUrl.substring(0, apiUrl.length - 4) 
    : apiUrl;
};

/**
 * Set a custom API URL (for development and testing)
 */
export const setApiUrl = async (url: string): Promise<void> => {
  // Ensure URL has the correct format with /api endpoint
  if (!url.endsWith('/api')) {
    url = url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  await AsyncStorage.setItem('apiUrl', url);
};

/**
 * Reset the API URL to default
 */
export const resetApiUrl = async (): Promise<void> => {
  await AsyncStorage.removeItem('apiUrl');
};

/**
 * Helper function to get the full URL for an image
 * This handles converting relative paths to full URLs
 */
export const getFullImageUrl = async (relativePath: string | null): Promise<string | null> => {
  if (!relativePath) return null;
  
  // If it's already a full URL, return it
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  
  // Remove any leading / from the path
  const normalizedPath = relativePath.startsWith('/') 
    ? relativePath.substring(1)
    : relativePath;
  
  // Get the base URL (without /api)
  const baseUrl = await getBaseUrl();
  
  // If relativePath starts with api/, remove that prefix since baseUrl already has it
  if (normalizedPath.startsWith('api/')) {
    return `${baseUrl}/${normalizedPath.substring(4)}`;
  }
  
  // Otherwise, append the path to the base URL
  return `${baseUrl}/${normalizedPath}`;
};