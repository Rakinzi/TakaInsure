import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiUrl } from './networkService';

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

export type DamageAnalysisResult = {
  severity: 'minor' | 'moderate' | 'severe';
  estimatedCost: number;
  affectedAreas: string[];
  boxes?: any[];
  confidences?: number[];
  classes?: string[];
};

/**
 * Upload an image for claim analysis to the Flask backend
 */
export const uploadClaimImageForAnalysis = async (
  imageUri: string
): Promise<DamageAnalysisResult | null> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Append the file to form data
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    // Get API URL
    const API_URL = await getApiUrl();
    console.log(`Uploading image to ${API_URL}/car-damage/detection for analysis`);

    // Send to car damage detection API
    const response = await axios.post(
      `${API_URL}/car-damage/detection`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Damage analysis response:', response.data);

    if (response.data) {
      // Map the response to our expected format
      const result: DamageAnalysisResult = {
        severity: determineSeverity(response.data),
        estimatedCost: estimateCost(response.data),
        affectedAreas: response.data.classes || [],
        boxes: response.data.boxes || [],
        confidences: response.data.confidences || [],
        classes: response.data.classes || [],
      };
      return result;
    }

    return null;
  } catch (error) {
    console.error('Error analyzing claim image:', error);
    throw error;
  }
};

// Helper function to determine severity based on detection results
const determineSeverity = (detectionResult: any): 'minor' | 'moderate' | 'severe' => {
  if (!detectionResult || !detectionResult.classes || detectionResult.classes.length === 0) {
    return 'minor';
  }

  // Count damage types
  const damageTypes = detectionResult.classes;
  const severeTypes = ['damaged windshield', 'damaged hood', 'damaged bumper'];
  
  // Check confidence levels
  const highConfidences = (detectionResult.confidences || []).filter(
    (conf: number) => conf > 80
  ).length;
  
  // Check number of affected areas
  if (damageTypes.length >= 3 || damageTypes.some((type: any) => severeTypes.includes(type))) {
    return 'severe';
  } else if (damageTypes.length >= 2 || highConfidences >= 2) {
    return 'moderate';
  }
  
  return 'minor';
};

// Helper function to estimate cost based on detection results
const estimateCost = (detectionResult: any): number => {
  if (!detectionResult || !detectionResult.classes || detectionResult.classes.length === 0) {
    return 750; // Base cost
  }

  // Define cost estimates for different damage types
  const costMap: Record<string, number> = {
    'damaged door': 1200,
    'damaged window': 800,
    'damaged headlight': 600,
    'damaged mirror': 400,
    'dent': 700,
    'damaged hood': 1500,
    'damaged bumper': 1800,
    'damaged wind shield': 2000
  };

  // Calculate total cost
  let totalCost = 500; // Base cost
  detectionResult.classes.forEach((damageType: string, index: number) => {
    const confidence = detectionResult.confidences?.[index] || 50;
    const baseCost = costMap[damageType] || 500;
    // Adjust cost based on confidence
    const adjustedCost = baseCost * (confidence / 100);
    totalCost += adjustedCost;
  });

  return Math.round(totalCost);
};

/**
 * Upload claim images to Flask backend
 */
export const uploadClaimImages = async (
  claimId: string,
  imageUris: string[]
): Promise<string[]> => {
  try {
    const uploadedUrls: string[] = [];
    
    // Upload each image
    for (let i = 0; i < imageUris.length; i++) {
      const imageUri = imageUris[i];
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Append the file to form data
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
      
      // Append metadata
      formData.append('claim_id', claimId);
      formData.append('image_index', i.toString());
      
      // Get API URL
      const API_URL = await getApiUrl();
      
      // Upload to server
      const response = await axios.post(
        `${API_URL}/claim/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data && response.data.success && response.data.imageUrl) {
        uploadedUrls.push(response.data.imageUrl);
      }
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading claim images:', error);
    throw error;
  }
};

/**
 * Create a new claim with analysis data
 */
export const createClaimWithAnalysis = async (
  policyId: string | null,
  incidentDate: string,
  incidentLocation: string,
  incidentDescription: string,
  analysisResults: DamageAnalysisResult,
  imageUris: string[],
  vehicleId?: string
): Promise<string | null> => {
  try {
    // Get user data to find policyholder ID
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const policyHolderId = user?.policyholder_id;
    
    if (!policyHolderId) {
      throw new Error('No policyholder ID found - user must be logged in');
    }
    
    // Create a temporary claim ID for image uploads
    const tempClaimId = `temp_${new Date().getTime()}`;
    
    // Upload evidence images if provided
    const evidenceUrls: string[] = [];
    
    if (imageUris && imageUris.length > 0) {
      const uploadedUrls = await uploadClaimImages(tempClaimId, imageUris);
      evidenceUrls.push(...uploadedUrls);
    }
    
    // Prepare claim data
    const claimData = {
      policy_id: policyId,
      policyholder_id: policyHolderId,
      vehicle_id: vehicleId || null,
      incident_date: incidentDate,
      incident_location: incidentLocation,
      incident_description: incidentDescription,
      claim_amount: analysisResults.estimatedCost,
      claim_status: 'pending',
      evidence_urls: JSON.stringify({
        images: evidenceUrls,
        analysis: {
          severity: analysisResults.severity,
          estimatedCost: analysisResults.estimatedCost,
          affectedAreas: analysisResults.affectedAreas
        }
      })
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
    
    // Store claim ID for future reference
    await AsyncStorage.setItem('currentClaimId', claimId);
    
    return claimId;
  } catch (error) {
    console.error('Error in createClaimWithAnalysis:', error);
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

export const getClaimById = async (claimId: string): Promise<ClaimWithDetails | null> => {
  try {
    // Validate claim ID format
    if (!claimId) {
      throw new Error('Claim ID is required');
    }
    
    // Get claim from Supabase
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

export const updateClaimStatus = async (
  claimId: string, 
  newStatus: string, 
  note?: string
): Promise<boolean> => {
  try {
    // Validate inputs
    if (!claimId || !newStatus) {
      throw new Error('Claim ID and new status are required');
    }
    
    // Prepare update data
    const updateData: any = {
      claim_status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // If note is provided, append it to the evidence_urls
    if (note) {
      // First get the current claim to access its evidence_urls
      const { data: currentClaim, error: fetchError } = await supabase
        .from('claim')
        .select('evidence_urls')
        .eq('claim_id', claimId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching claim ${claimId}:`, fetchError);
      } else if (currentClaim) {
        // Parse evidence_urls
        let evidenceData: any = {};
        
        if (currentClaim.evidence_urls) {
          if (typeof currentClaim.evidence_urls === 'string') {
            try {
              evidenceData = JSON.parse(currentClaim.evidence_urls);
            } catch (e) {
              console.error('Error parsing evidence_urls:', e);
            }
          } else {
            evidenceData = currentClaim.evidence_urls;
          }
        }
        
        // Add note to notes array
        if (!evidenceData.notes) {
          evidenceData.notes = [];
        }
        
        evidenceData.notes.push({
          timestamp: new Date().toISOString(),
          status: newStatus,
          note: note
        });
        
        // Update the evidence_urls field
        updateData.evidence_urls = evidenceData;
      }
    }
    
    // Update the claim
    const { error } = await supabase
      .from('claim')
      .update(updateData)
      .eq('claim_id', claimId);
    
    if (error) {
      console.error(`Error updating claim ${claimId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in updateClaimStatus ${claimId}:`, error);
    return false;
  }
};

/**
 * Create a payment for a claim
 */
export const processClaimPayment = async (
  claimId: string,
  amount: number
): Promise<boolean> => {
  try {
    // Get the claim to verify it's approved
    const { data: claim, error: claimError } = await supabase
      .from('claim')
      .select('claim_status, policyholder_id')
      .eq('claim_id', claimId)
      .single();
    
    if (claimError || !claim) {
      console.error(`Error fetching claim ${claimId}:`, claimError);
      return false;
    }
    
    // Only approved claims can be paid
    if (claim.claim_status !== 'approved') {
      console.error(`Cannot pay claim ${claimId}: status is ${claim.claim_status}`);
      return false;
    }
    
    // Insert payment record
    const { error: paymentError } = await supabase
      .from('claim_payment')
      .insert([{
        claim_id: claimId,
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: 'bank_transfer',
        transaction_reference: `claim_payment_${Date.now()}`,
        status: 'completed'
      }]);
    
    if (paymentError) {
      console.error(`Error creating payment for claim ${claimId}:`, paymentError);
      return false;
    }
    
    // Update claim status to paid
    const { error: updateError } = await supabase
      .from('claim')
      .update({
        claim_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('claim_id', claimId);
    
    if (updateError) {
      console.error(`Error updating claim status to paid:`, updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing claim payment for ${claimId}:`, error);
    return false;
  }
};

// Export all functions
export default {
  uploadClaimImageForAnalysis,
  uploadClaimImages,
  createClaimWithAnalysis,
  getUserClaims,
  getClaimById,
  updateClaimStatus,
  processClaimPayment
};