import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Types for policy data
 */
export type InsuranceProduct = {
  product_id: string;
  product_name: string;
  product_description: string;
  coverage_amount: number;
  premium_amount: number;
  policy_term: number;
  eligibility_criteria?: string;
  exclusions?: string;
  status: string;
};

export type Policy = {
  policy_id: string;
  policyholder_id: string;
  product_id: string;
  coverage_amount: number;
  premium_amount: number;
  start_date: string;
  end_date: string;
  payment_frequency: string;
  status: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  insurance_product?: InsuranceProduct;
};

export type PolicyWithProduct = Policy & {
  insurance_product: InsuranceProduct;
};

/**
 * Get all insurance products
 */
export const getInsuranceProducts = async (): Promise<InsuranceProduct[]> => {
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
    console.error('Error in getInsuranceProducts:', error);
    throw error;
  }
};

/**
 * Get an insurance product by ID
 */
export const getInsuranceProductById = async (productId: string): Promise<InsuranceProduct | null> => {
  try {
    const { data, error } = await supabase
      .from('insurance_product')
      .select('*')
      .eq('product_id', productId)
      .single();
    
    if (error) {
      console.error(`Error getting insurance product ${productId}:`, error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error in getInsuranceProductById ${productId}:`, error);
    throw error;
  }
};

/**
 * Create a new insurance product
 */
export const createInsuranceProduct = async (product: Omit<InsuranceProduct, 'product_id'>): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('insurance_product')
      .insert([product])
      .select();
    
    if (error) {
      console.error('Error creating insurance product:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      return data[0].product_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error in createInsuranceProduct:', error);
    throw error;
  }
};

/**
 * Get policies for a policyholder
 */
export const getPoliciesByPolicyholder = async (policyHolderId: string): Promise<PolicyWithProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .eq('policyholder_id', policyHolderId)
      .order('created_at', { ascending: false });
    
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
 * Get a policy by ID
 */
export const getPolicyById = async (policyId: string): Promise<PolicyWithProduct | null> => {
  try {
    const { data, error } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .eq('policy_id', policyId)
      .single();
    
    if (error) {
      console.error(`Error getting policy ${policyId}:`, error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error in getPolicyById ${policyId}:`, error);
    throw error;
  }
};

/**
 * Create a new policy
 */
export const createPolicy = async (
  policyHolderId: string,
  productId: string,
  coverageAmount: number,
  premiumAmount: number,
  startDate: string,
  endDate: string,
  paymentFrequency: string = 'monthly',
  metadata: any = {},
  vehicleId?: string
): Promise<string | null> => {
  try {
    // Create the policy record
    const policyData = {
      policyholder_id: policyHolderId,
      product_id: productId,
      coverage_amount: coverageAmount,
      premium_amount: premiumAmount,
      start_date: startDate,
      end_date: endDate,
      payment_frequency: paymentFrequency,
      status: 'active',
      metadata: metadata
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
    
    // If a vehicle ID was provided, create the association
    if (vehicleId) {
      const { error: associationError } = await supabase
        .from('vehicle_policies')
        .insert([{
          vehicle_id: vehicleId,
          policy_id: policyId
        }]);
      
      if (associationError) {
        console.error('Error creating vehicle-policy association:', associationError);
        // We don't throw here as the policy was created successfully
      }
    }
    
    return policyId;
  } catch (error) {
    console.error('Error in createPolicy:', error);
    throw error;
  }
};

/**
 * Get policies for a vehicle
 */
export const getPoliciesForVehicle = async (vehicleId: string): Promise<PolicyWithProduct[]> => {
  try {
    // First get policy IDs from vehicle_policies
    const { data: associations, error: associationError } = await supabase
      .from('vehicle_policies')
      .select('policy_id')
      .eq('vehicle_id', vehicleId);
    
    if (associationError) {
      console.error('Error getting vehicle-policy associations:', associationError);
      throw associationError;
    }
    
    if (!associations || associations.length === 0) {
      return [];
    }
    
    // Extract policy IDs
    const policyIds = associations.map(assoc => assoc.policy_id);
    
    // Then get the policies
    const { data, error } = await supabase
      .from('policy')
      .select(`
        *,
        insurance_product (*)
      `)
      .in('policy_id', policyIds)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting policies for vehicle:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPoliciesForVehicle:', error);
    throw error;
  }
};

/**
 * Update a policy
 */
export const updatePolicy = async (policyId: string, updates: Partial<Policy>): Promise<Policy | null> => {
  try {
    const { data, error } = await supabase
      .from('policy')
      .update(updates)
      .eq('policy_id', policyId)
      .select();
    
    if (error) {
      console.error(`Error updating policy ${policyId}:`, error);
      throw error;
    }
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error in updatePolicy ${policyId}:`, error);
    throw error;
  }
};

/**
 * Get activity history for a policy
 */
export const getPolicyActivity = async (policyId: string): Promise<any[]> => {
  try {
    // First get the policy to get creation date
    const { data: policy, error: policyError } = await supabase
      .from('policy')
      .select('created_at')
      .eq('policy_id', policyId)
      .single();
    
    if (policyError) {
      console.error(`Error getting policy ${policyId}:`, policyError);
      throw policyError;
    }
    
    // Then get any claims related to this policy
    const { data: claims, error: claimsError } = await supabase
      .from('claim')
      .select('claim_id, incident_date, claim_status, created_at, claim_amount')
      .eq('policy_id', policyId);
    
    if (claimsError) {
      console.error(`Error getting claims for policy ${policyId}:`, claimsError);
      // Don't throw, just continue
    }
    
    // Build activity items
    const activities = [];
    
    // Add policy creation
    if (policy) {
      activities.push({
        type: 'PolicyCreated',
        timestamp: policy.created_at,
        id: policyId,
        blockNumber: Date.now() // Using timestamp as a mock block number
      });
    }
    
    // Add claim activities
    if (claims && claims.length > 0) {
      claims.forEach(claim => {
        activities.push({
          type: 'ClaimFiled',
          timestamp: claim.created_at,
          id: claim.claim_id,
          blockNumber: Date.now() + 1 // Using timestamp as a mock block number
        });
        
        // If claim has been paid or processed, add that activity
        if (claim.claim_status === 'paid' || claim.claim_status === 'approved') {
          // Add 1 day to created_at for this mock activity
          const processedDate = new Date(claim.created_at);
          processedDate.setDate(processedDate.getDate() + 1);
          
          activities.push({
            type: claim.claim_status === 'paid' ? 'ClaimPaid' : 'ClaimApproved',
            timestamp: processedDate.toISOString(),
            id: claim.claim_id,
            amount: claim.claim_amount,
            blockNumber: Date.now() + 2 // Using timestamp as a mock block number
          });
        }
      });
    }
    
    // Sort by timestamp, newest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return activities;
  } catch (error) {
    console.error(`Error in getPolicyActivity ${policyId}:`, error);
    return [];
  }
};