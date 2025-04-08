import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is not defined. Please check your environment variables.');
}

// Create a custom storage adapter for AsyncStorage
const asyncStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: asyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for direct Supabase access

/**
 * Get vehicles for a specific policyholder
 */
export const getVehiclesFromSupabase = async (policyHolderId: string) => {
  try {
    // Validate that policyHolderId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(policyHolderId)) {
      throw new Error('Invalid policyholder ID format - must be a valid UUID');
    }
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('policyholder_id', policyHolderId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase vehicles query error:', error);
    throw error;
  }
};

/**
 * Get a specific vehicle by ID
 */
export const getVehicleFromSupabase = async (vehicleId: string) => {
  try {
    // Validate that vehicleId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(vehicleId)) {
      throw new Error('Invalid vehicle ID format - must be a valid UUID');
    }
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Supabase vehicle query error for ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Insert a new vehicle record
 */
export const insertVehicleToSupabase = async (vehicleData: any) => {
  try {
    // Ensure the policyholder_id is a valid UUID if it exists
    if (vehicleData.policyholder_id) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidPattern.test(vehicleData.policyholder_id)) {
        throw new Error('Invalid policyholder ID format - must be a valid UUID');
      }
    }
    
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select();
    
    if (error) {
      throw error;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Supabase vehicle insert error:', error);
    throw error;
  }
};

/**
 * Update a vehicle record
 */
export const updateVehicleInSupabase = async (vehicleId: string, updates: any) => {
  try {
    // Validate that vehicleId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(vehicleId)) {
      throw new Error('Invalid vehicle ID format - must be a valid UUID');
    }
    
    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('vehicle_id', vehicleId)
      .select();
    
    if (error) {
      throw error;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Supabase vehicle update error for ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Delete a vehicle record
 */
export const deleteVehicleFromSupabase = async (vehicleId: string) => {
  try {
    // Validate that vehicleId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(vehicleId)) {
      throw new Error('Invalid vehicle ID format - must be a valid UUID');
    }
    
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicleId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Supabase vehicle delete error for ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Get all policies for a policyholder
 */
export const getPoliciesFromSupabase = async (policyHolderId: string) => {
  try {
    // Validate that policyHolderId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(policyHolderId)) {
      throw new Error('Invalid policyholder ID format - must be a valid UUID');
    }
    
    const { data, error } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .eq('policyholder_id', policyHolderId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase policies query error:', error);
    throw error;
  }
};

/**
 * Get all policies for a specific vehicle
 */
export const getVehiclePoliciesFromSupabase = async (vehicleId: string) => {
  try {
    // Validate that vehicleId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(vehicleId)) {
      throw new Error('Invalid vehicle ID format - must be a valid UUID');
    }
    
    // First get all vehicle-policy associations
    const { data: associations, error: associationsError } = await supabase
      .from('vehicle_policies')
      .select('policy_id')
      .eq('vehicle_id', vehicleId);
    
    if (associationsError) {
      throw associationsError;
    }
    
    if (!associations || associations.length === 0) {
      return [];
    }
    
    // Extract policy IDs
    const policyIds = associations.map(a => a.policy_id);
    
    // Then get the policies with their associated products
    const { data: policies, error: policiesError } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .in('policy_id', policyIds);
    
    if (policiesError) {
      throw policiesError;
    }
    
    return policies || [];
  } catch (error) {
    console.error(`Supabase vehicle policies query error for ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Get claims for a policyholder
 */
export const getClaimsFromSupabase = async (policyHolderId: string) => {
  try {
    // Validate that policyHolderId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(policyHolderId)) {
      throw new Error('Invalid policyholder ID format - must be a valid UUID');
    }
    
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*),
        vehicle:vehicle_id (*)
      `)
      .eq('policyholder_id', policyHolderId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase claims query error:', error);
    throw error;
  }
};

/**
 * Get claims for a specific vehicle
 */
export const getVehicleClaimsFromSupabase = async (vehicleId: string) => {
  try {
    // Validate that vehicleId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(vehicleId)) {
      throw new Error('Invalid vehicle ID format - must be a valid UUID');
    }
    
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*),
        vehicle:vehicle_id (*)
      `)
      .eq('vehicle_id', vehicleId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Supabase vehicle claims query error for ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Get a policyholder by their phone number
 */
export const getPolicyholderByPhone = async (phoneNumber: string) => {
  try {
    const { data, error } = await supabase
      .from('policyholder')
      .select('*')
      .eq('contact_details', phoneNumber)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Supabase policyholder query error for phone ${phoneNumber}:`, error);
    throw error;
  }
};

/**
 * Authenticate a policyholder with their ID and phone number
 */
export const authenticatePolicyholder = async (policyHolderId: string, phoneNumber: string) => {
  try {
    // Validate that policyHolderId is a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(policyHolderId)) {
      throw new Error('Invalid policyholder ID format - must be a valid UUID');
    }
    
    // Check if the policyholder exists with matching phone
    const { data, error } = await supabase
      .from('policyholder')
      .select('*')
      .eq('policyholder_id', policyHolderId)
      .eq('contact_details', phoneNumber)
      .single();
    
    if (error) {
      throw new Error('Invalid credentials. Please check your Policyholder ID and phone number.');
    }
    
    if (!data) {
      throw new Error('No matching policyholder found.');
    }
    
    // Create a JWT-like token for simple auth (in a real app, use proper JWT)
    const token = btoa(`${policyHolderId}:${phoneNumber}:${Date.now()}`);
    
    // Store authentication data
    await AsyncStorage.multiSet([
      ['userToken', token],
      ['policyHolderId', policyHolderId],
      ['phoneNumber', phoneNumber],
      ['userData', JSON.stringify(data)]
    ]);
    
    return {
      success: true,
      token,
      user: data
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

export default supabase;