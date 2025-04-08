import * as Network from 'expo-network';

export const getApiUrl = async (): Promise<string> => {
  try {
    const ip = await Network.getIpAddressAsync();
    return `http://${ip}:5000/api`;
  } catch (error) {
    console.warn('Could not get IP address, falling back to localhost');
    return 'http://localhost:5000/api';
  }
};
