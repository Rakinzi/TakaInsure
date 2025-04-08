import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Claim = {
  claim_id: string;
  policy_id: string;
  policyholder_id: string;
  vehicle_id?: string;
  incident_date: string;
  incident_location?: string;
  incident_description?: string;
  claim_amount?: number;
  claim_status: string;
  evidence_urls?: any;
  created_at: string;
  updated_at: string;
};

export type ClaimWithDetails = Claim & {
  policy?: any;
  vehicle?: any;
};

/**
 * Upload an image to Supabase storage
 */
const uploadImageToStorage = async (imageUri: string, folder: string, filename: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const filePath = `${folder}/${filename}.${fileExt}`;
    
    const { data, error } = await supabase
      .storage
      .from('takainsure')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image to Supabase storage:', error);
      return null;
    }
    
    // Get public URL of the uploaded file
    const { data: urlData } = supabase
      .storage
      .from('takainsure')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    return null;
  }
};

/**
 * Create a new claim
 */
export const createClaim = async (
  policyId: string,
  incidentDate: string,
  incidentLocation: string,
  incidentDescription: string,
  claimAmount?: number,
  vehicleId?: string,
  evidenceImages?: string[]
): Promise<string | null> => {
  try {
    // Get user data to find policyholder ID
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id;
    
    if (!policyHolderId) {
      throw new Error('No policyholder ID found - user must be logged in');
    }
    
    // Process evidence images if provided
    const evidenceUrls: string[] = [];
    
    if (evidenceImages && evidenceImages.length > 0) {
      // Upload each image to storage
      for (let i = 0; i < evidenceImages.length; i++) {
        const filename = `claim_evidence_${new Date().getTime()}_${i}`;
        const imageUrl = await uploadImageToStorage(evidenceImages[i], 'claims', filename);
        if (imageUrl) {
          evidenceUrls.push(imageUrl);
        }
      }
    }
    
    // Prepare claim data
    const claimData = {
      policy_id: policyId,
      policyholder_id: policyHolderId,
      vehicle_id: vehicleId || null,
      incident_date: incidentDate,
      incident_location: incidentLocation,
      incident_description: incidentDescription,
      claim_amount: claimAmount,
      claim_status: 'pending',
      evidence_urls: evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null
    };
    
    // Insert into claim table
    const { data, error } = await supabase
      .from('claim')
      .insert([claimData])
      .select();
    
    if (error) {
      console.error('Error creating claim:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to create claim record');
    }
    
    const claimId = data[0].claim_id;
    return claimId;
  } catch (error) {
    console.error('Error in createClaim:', error);
    throw error;
  }
};

/**
 * Get all claims for the current user
 */
export const getUserClaims = async (): Promise<ClaimWithDetails[]> => {
  try {
    // Get user data to find policyholder ID
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id;
    
    if (!policyHolderId) {
      console.error('No policyholder ID found in user data');
      return [];
    }
    
    // Get claims from Supabase
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*),
        vehicle:vehicle_id (*)
      `)
      .eq('policyholder_id', policyHolderId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching claims:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserClaims:', error);
    return [];
  }
};

/**
 * Get a specific claim by ID
 */
export const getClaimById = async (claimId: string): Promise<ClaimWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*),
        vehicle:vehicle_id (*)
      `)
      .eq('claim_id', claimId)
      .single();
    
    if (error) {
      console.error(`Error fetching claim ${claimId}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error in getClaimById ${claimId}:`, error);
    return null;
  }
};

/**
 * Update a claim's status
 */
export const updateClaimStatus = async (
  claimId: string, 
  newStatus: string,
  notes?: string
): Promise<boolean> => {
  try {
    // Prepare update data
    const updateData: any = {
      claim_status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Handle metadata/notes in evidence_urls (JSONB field)
    if (notes) {
      // First get the current data
      const { data: currentClaim, error: fetchError } = await supabase
        .from('claim')
        .select('evidence_urls')
        .eq('claim_id', claimId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching claim ${claimId} for notes update:`, fetchError);
      } else {
        // Parse evidence_urls
        let metadata: any = {};
        
        if (currentClaim?.evidence_urls) {
          try {
            if (typeof currentClaim.evidence_urls === 'string') {
              metadata = JSON.parse(currentClaim.evidence_urls);
            } else {
              metadata = currentClaim.evidence_urls;
            }
          } catch (e) {
            console.error('Error parsing evidence_urls:', e);
          }
        }
        
        // Ensure notes array exists
        if (!metadata.notes) {
          metadata.notes = [];
        }
        
        // Add note
        metadata.notes.push({
          timestamp: new Date().toISOString(),
          status: newStatus,
          text: notes
        });
        
        // Set in update data
        updateData.evidence_urls = metadata;
      }
    }
    
    // Update claim
    const { error } = await supabase
      .from('claim')
      .update(updateData)
      .eq('claim_id', claimId);
    
    if (error) {
      console.error(`Error updating claim ${claimId} status:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in updateClaimStatus ${claimId}:`, error);
    return false;
  }
};

/**
 * Process a claim payment
 */
export const processClaimPayment = async (
  claimId: string,
  amount: number,
  paymentMethod: string,
  transactionReference: string
): Promise<string | null> => {
  try {
    // First, get the claim to get policyholder_id
    const { data: claim, error: claimError } = await supabase
      .from('claim')
      .select('policyholder_id')
      .eq('claim_id', claimId)
      .single();
    
    if (claimError) {
      console.error(`Error fetching claim ${claimId} for payment:`, claimError);
      throw claimError;
    }
    
    // Prepare payment data
    const paymentData = {
      claim_id: claimId,
      amount: amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
      status: 'completed'
    };
    
    // Insert payment record
    const { data, error } = await supabase
      .from('claim_payment')
      .insert([paymentData])
      .select();
    
    if (error) {
      console.error('Error creating claim payment:', error);
      throw error;
    }
    
    // Update claim status to paid
    await updateClaimStatus(claimId, 'paid', `Payment of $${amount} processed via ${paymentMethod}`);
    
    if (data && data.length > 0) {
      return data[0].payment_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error in processClaimPayment:', error);
    throw error;
  }
};

/**
 * Get claims for a policy
 */
export const getClaimsForPolicy = async (policyId: string): Promise<ClaimWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        vehicle:vehicle_id (*)
      `)
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching claims for policy ${policyId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in getClaimsForPolicy ${policyId}:`, error);
    return [];
  }
};

/**
 * Get claims for a vehicle
 */
export const getClaimsForVehicle = async (vehicleId: string): Promise<ClaimWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('claim')
      .select(`
        *,
        policy (*)
      `)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching claims for vehicle ${vehicleId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in getClaimsForVehicle ${vehicleId}:`, error);
    return [];
  }
};

export default {
  createClaim,
  getUserClaims,
  getClaimById,
  updateClaimStatus,
  processClaimPayment,
  getClaimsForPolicy,
  getClaimsForVehicle,
};