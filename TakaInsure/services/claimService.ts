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

// Export other existing functions
export default {
  uploadClaimImageForAnalysis,
  uploadClaimImages,
  createClaimWithAnalysis,
  getUserClaims,
  // Include other existing functions here
};