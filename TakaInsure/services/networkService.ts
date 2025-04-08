import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HOST_IP = '192.168.1.107'; // CHANGE THIS TO YOUR COMPUTER'S IP ADDRESS

// Default API URL with the host IP for physical devices
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${HOST_IP}:5000/api`;

export const getApiUrl = async (): Promise<string> => {
  try {
    // First try to get a saved API URL (if user has configured it)
    const savedApiUrl = await AsyncStorage.getItem('apiUrl');
    if (savedApiUrl) {
      console.log('Using saved API URL:', savedApiUrl);
      return savedApiUrl;
    }
    console.log('Using default API URL:', DEFAULT_API_URL);
    return DEFAULT_API_URL;
  } catch (error) {
    console.warn('Could not determine API URL, falling back to default', error);
    return DEFAULT_API_URL;
  }
};

/**
 * Set a custom API URL (for development and testing)
 */
export const setApiUrl = async (url: string): Promise<void> => {
  if (!url.endsWith('/api')) {
    url = url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  await AsyncStorage.setItem('apiUrl', url);
};

export const resetApiUrl = async (): Promise<void> => {
  await AsyncStorage.removeItem('apiUrl');
};