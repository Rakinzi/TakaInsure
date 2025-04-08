import { supabase } from './supabaseClient';
import { VehicleInfo } from '../types/vehicle';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service to register a vehicle in Supabase
 */
export const registerVehicleInSupabase = async (vehicleInfo: VehicleInfo): Promise<string | null> => {
  try {
    // Get user data to associate with the vehicle
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id || null;

    if (!policyHolderId) {
      throw new Error('No policyholder ID found - user must be logged in');
    }

    // Prepare the vehicle data
    const vehicleData = {
      plate_number: vehicleInfo.plateNumber,
      car_make: vehicleInfo.carMake,
      car_model: vehicleInfo.carModel,
      car_year: vehicleInfo.carYear || null,
      car_image_url: vehicleInfo.carImageUri || null,
      plate_image_url: vehicleInfo.plateImageUri || null,
      policyholder_id: policyHolderId,
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

    if (data && data.length > 0) {
      return data[0].vehicle_id;
    }

    return null;
  } catch (error) {
    console.error('Error in registerVehicleInSupabase:', error);
    throw error;
  }
};

/**
 * Service to get policies for a policyholder
 */
export const getPoliciesByPolicyholder = async (policyHolderId: string) => {
  try {
    const { data, error } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .eq('policyholder_id', policyHolderId);

    if (error) {
      console.error('Error getting policies:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPoliciesByPolicyholder:', error);
    throw error;
  }
};

/**
 * Service to create a new policy
 */
export const createPolicy = async (
  policyHolderId: string,
  productId: string,
  coverageAmount: number,
  premiumAmount: number,
  startDate: string,
  endDate: string,
  vehicleId?: string
) => {
  try {
    // Create the policy
    const policyData = {
      policyholder_id: policyHolderId,
      product_id: productId,
      coverage_amount: coverageAmount,
      premium_amount: premiumAmount,
      start_date: startDate,
      end_date: endDate,
      status: 'active'
    };

    const { data, error } = await supabase
      .from('policy')
      .insert([policyData])
      .select();

    if (error) {
      console.error('Error creating policy:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to create policy - no data returned');
    }

    const policyId = data[0].policy_id;

    // If a vehicle ID was provided, create the vehicle-policy association
    if (vehicleId) {
      const { error: associationError } = await supabase
        .from('vehicle_policies')
        .insert([{
          vehicle_id: vehicleId,
          policy_id: policyId
        }]);

      if (associationError) {
        console.error('Error creating vehicle-policy association:', associationError);
        // We don't throw here, as the policy was already created
      }
    }

    return policyId;
  } catch (error) {
    console.error('Error in createPolicy:', error);
    throw error;
  }
};

/**
 * Service to create a new claim
 */
export const createClaim = async (
  policyHolderId: string,
  policyId: string,
  incidentDate: string,
  incidentLocation: string,
  incidentDescription: string,
  claimAmount: number,
  vehicleId?: string,
  evidenceUrls?: string[]
) => {
  try {
    // Prepare claim data
    const claimData = {
      policyholder_id: policyHolderId,
      policy_id: policyId,
      vehicle_id: vehicleId || null,
      incident_date: incidentDate,
      incident_location: incidentLocation,
      incident_description: incidentDescription,
      claim_amount: claimAmount,
      claim_status: 'pending',
      evidence_urls: evidenceUrls ? JSON.stringify(evidenceUrls) : null
    };

    const { data, error } = await supabase
      .from('claim')
      .insert([claimData])
      .select();

    if (error) {
      console.error('Error creating claim:', error);
      throw error;
    }

    if (data && data.length > 0) {
      return data[0].claim_id;
    }

    return null;
  } catch (error) {
    console.error('Error in createClaim:', error);
    throw error;
  }
};

/**
 * Service to get claims for a policyholder
 */
export const getClaimsByPolicyholder = async (policyHolderId: string) => {
  try {
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*),
        vehicle:vehicle_id (*)
      `)
      .eq('policyholder_id', policyHolderId);

    if (error) {
      console.error('Error getting claims:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClaimsByPolicyholder:', error);
    throw error;
  }
};

/**
 * Service to get a specific insurance product
 */
export const getInsuranceProduct = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('insurance_product')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (error) {
      console.error('Error getting insurance product:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getInsuranceProduct:', error);
    throw error;
  }
};

/**
 * Service to get all available insurance products
 */
export const getAllInsuranceProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('insurance_product')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error getting insurance products:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllInsuranceProducts:', error);
    throw error;
  }
};

/**
 * Service to update claim status
 */
export const updateClaimStatus = async (claimId: string, newStatus: string, notes?: string) => {
  try {
    const updateData: any = { 
      claim_status: newStatus,
      updated_at: new Date().toISOString()
    };

    // If notes provided, we need to handle the evidence_urls which is a JSONB field
    if (notes) {
      // First get the current claim to access its evidence_urls
      const { data: currentClaim, error: fetchError } = await supabase
        .from('claim')
        .select('evidence_urls')
        .eq('claim_id', claimId)
        .single();

      if (fetchError) {
        console.error('Error fetching claim for notes update:', fetchError);
      } else if (currentClaim) {
        // Parse the existing evidence_urls or initialize new object
        let metadata: any = {};
        
        if (currentClaim.evidence_urls) {
          try {
            if (typeof currentClaim.evidence_urls === 'string') {
              metadata = JSON.parse(currentClaim.evidence_urls);
            } else {
              metadata = currentClaim.evidence_urls;
            }
          } catch (e) {
            console.error('Error parsing evidence_urls JSON:', e);
          }
        }
        
        // Add notes to metadata
        if (!metadata.notes) {
          metadata.notes = [];
        }
        
        metadata.notes.push({
          timestamp: new Date().toISOString(),
          status: newStatus,
          text: notes
        });
        
        updateData.evidence_urls = metadata;
      }
    }

    const { error } = await supabase
      .from('claim')
      .update(updateData)
      .eq('claim_id', claimId);

    if (error) {
      console.error('Error updating claim status:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in updateClaimStatus:', error);
    throw error;
  }
};

/**
 * Service to upload files to Supabase storage
 */
export const uploadFileToStorage = async (
  filePath: string,
  folderName: string,
  fileName: string
): Promise<string | null> => {
  try {
    const response = await fetch(filePath);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from('takainsure')
      .upload(`${folderName}/${fileName}`, blob);

    if (error) {
      console.error('Error uploading file to Supabase storage:', error);
      throw error;
    }

    if (data && data.path) {
      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('takainsure')
        .getPublicUrl(data.path);

      return urlData?.publicUrl || null;
    }

    return null;
  } catch (error) {
    console.error('Error in uploadFileToStorage:', error);
    throw error;
  }
};

export default {
  registerVehicleInSupabase,
  getPoliciesByPolicyholder,
  createPolicy,
  createClaim,
  getClaimsByPolicyholder,
  getInsuranceProduct,
  getAllInsuranceProducts,
  updateClaimStatus,
  uploadFileToStorage
};