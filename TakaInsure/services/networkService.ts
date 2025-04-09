import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Update this IP to your local machine's IP address when testing
const HOST_IP = '192.168.1.107';

// Default API URL with the host IP for physical devices
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${HOST_IP}:5000/api`;

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
    
    // No saved URL, return the default
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