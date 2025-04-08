import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './networkService';

// Package types enum
export enum PackageType {
  Basic = 0,
  Standard = 1,
  Premium = 2
}

// Use environment variable if available, otherwise use localhost for development
let API_URL: string;

const initApiUrl = async () => {
  if (!API_URL) {
    API_URL = await getApiUrl();
  }
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
 * Create a mock transaction (simulating blockchain operations)
 * In a real app, this would make actual blockchain transactions
 */
export const createMockTransaction = async (type: 'policy' | 'claim' | 'vehicle'): Promise<any> => {
  await initApiUrl(); // Ensure API_URL is initialized
  
  // For a demo, we'll generate a fake transaction hash
  const transactionHash = '0x' + Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)).join('');
  
  // Mock blockchain data
  return {
    success: true,
    transactionHash,
    blockNumber: 12345678 + Math.floor(Math.random() * 10000),
    timestamp: new Date().toISOString(),
  };
};

/**
 * Register a policy on the blockchain
 */
export const registerPolicy = async (
  packageType: PackageType,
  coverageAmount: number,
  premium: number,
  termInDays: number
): Promise<any> => {
  try {
    await initApiUrl(); // Ensure API_URL is initialized
    const headers = await getAuthHeader();
    
    console.log(`Registering policy on blockchain via ${API_URL}/blockchain/policy`);
    
    // In a real app, this would be an actual API call
    // const response = await axios.post(
    //   `${API_URL}/blockchain/policy`,
    //   {
    //     packageType,
    //     coverageAmount,
    //     premium,
    //     termInDays
    //   },
    //   { headers }
    // );
    
    // return response.data;
    
    // For demo purposes, simulate a successful blockchain transaction
    return createMockTransaction('policy');
  } catch (error) {
    console.error('Blockchain policy registration error:', error);
    throw error;
  }
};

/**
 * Register a claim on the blockchain
 */
export const registerClaim = async (policyId: string, claimAmount: number, evidence: string): Promise<any> => {
  try {
    await initApiUrl(); // Ensure API_URL is initialized
    const headers = await getAuthHeader();
    
    console.log(`Registering claim on blockchain via ${API_URL}/blockchain/claim`);
    
    // In a real app, this would be an actual API call
    // const response = await axios.post(
    //   `${API_URL}/blockchain/claim`,
    //   {
    //     policyId,
    //     claimAmount,
    //     evidence
    //   },
    //   { headers }
    // );
    
    // return response.data;
    
    // For demo purposes, simulate a successful blockchain transaction
    return createMockTransaction('claim');
  } catch (error) {
    console.error('Blockchain claim registration error:', error);
    throw error;
  }
};

/**
 * Register a vehicle on the blockchain
 */
export const registerVehicle = async (
  plateNumber: string,
  make: string,
  model: string,
  year?: string
): Promise<any> => {
  try {
    await initApiUrl(); // Ensure API_URL is initialized
    const headers = await getAuthHeader();
    
    console.log(`Registering vehicle on blockchain via ${API_URL}/blockchain/vehicle`);
    
    // In a real app, this would be an actual API call
    // const response = await axios.post(
    //   `${API_URL}/blockchain/vehicle`,
    //   {
    //     plateNumber,
    //     make,
    //     model,
    //     year
    //   },
    //   { headers }
    // );
    
    // return response.data;
    
    // For demo purposes, simulate a successful blockchain transaction
    return createMockTransaction('vehicle');
  } catch (error) {
    console.error('Blockchain vehicle registration error:', error);
    throw error;
  }
};

/**
 * Verify a transaction on the blockchain
 */
export const verifyTransaction = async (transactionHash: string): Promise<any> => {
  try {
    await initApiUrl(); // Ensure API_URL is initialized
    const headers = await getAuthHeader();
    
    console.log(`Verifying transaction on blockchain via ${API_URL}/blockchain/verify`);
    
    // In a real app, this would be an actual API call
    // const response = await axios.get(
    //   `${API_URL}/blockchain/verify/${transactionHash}`,
    //   { headers }
    // );
    
    // return response.data;
    
    // For demo purposes, simulate a successful verification
    return {
      success: true,
      verified: true,
      blockNumber: 12345678,
      timestamp: new Date().toISOString(),
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw error;
  }
};

export default {
  PackageType,
  createMockTransaction,
  registerPolicy,
  registerClaim,
  registerVehicle,
  verifyTransaction
};