import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiUrl } from './networkService';
import { supabase } from './supabaseClient';
import { formatZimbabwePhone } from './supabaseAuth';

/**
 * Types for payment data
 */
export type PaymentRecord = {
  payment_id: string;
  policy_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string;
  status: string;
};

export type PremiumPaymentResult = {
  success: boolean;
  payment?: PaymentRecord;
  error?: string;
  transactionRef?: string;
};

/**
 * Check if daily premium payment is needed
 */
export const checkDailyPremiumPayment = async (): Promise<boolean> => {
  try {
    // Get the last payment date
    const lastPaymentDateStr = await AsyncStorage.getItem('lastPremiumPaymentDate');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // If there's no record of last payment, or it's a different day, payment is needed
    if (!lastPaymentDateStr || lastPaymentDateStr !== today) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking daily premium payment:', error);
    return false;
  }
};

/**
 * Process daily premium payment for all active policies using the payment API
 */
export const processDailyPremiumPayment = async (): Promise<PremiumPaymentResult> => {
  try {
    // Get user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      return { success: false, error: 'User data not available' };
    }
    
    const user = JSON.parse(userData);
    
    // Get active policies
    const { data: policies, error: policiesError } = await supabase
      .from('policy')
      .select('*')
      .eq('policyholder_id', user.policyholder_id)
      .eq('status', 'active');
      
    if (policiesError) {
      console.error('Error fetching active policies:', policiesError);
      return { success: false, error: 'Failed to fetch active policies' };
    }
    
    if (!policies || policies.length === 0) {
      console.log('No active policies found - no payment needed');
      return { success: true };
    }
    
    // Calculate the total daily premium for all policies
    let totalDailyPremium = 0;
    for (const policy of policies) {
      // Calculate daily premium: monthly premium / days in current month
      const currentDate = new Date();
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      
      const dailyPremium = policy.premium_amount / daysInMonth;
      totalDailyPremium += dailyPremium;
    }
    
    // Round to 2 decimal places
    totalDailyPremium = Math.round(totalDailyPremium * 100) / 100;
    
    if (totalDailyPremium <= 0) {
      console.log('No premium amount due');
      return { success: true };
    }
    
    // Format the amount to 2 decimal places
    const amount = totalDailyPremium.toFixed(2);
    
    // Get the user's phone number and format it
    const phoneNumber = formatZimbabwePhone(user.contact_details);
    const formattedPhone = phoneNumber.replace('+', ''); // Remove + from the phone number
    
    // Get API URL for payment processing
    const API_URL = await getApiUrl();
    
    // Make the payment using the payment API
    const paymentData = {
      amount: amount,
      phoneNumber: formattedPhone,
      description: 'Daily Premium Payment',
      reference: `daily_premium_${new Date().toISOString().split('T')[0]}`,
      username: user.full_name || 'User',
      policyId: policies[0].policy_id // Reference the first policy ID
    };
    
    console.log(`Processing payment via ${API_URL}/payment/process`, paymentData);
    
    const response = await axios.post(
      `${API_URL}/payment/process`,
      paymentData
    );
    
    if (response.data && response.data.success) {
      // Update the last payment date
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('lastPremiumPaymentDate', today);
      
      return {
        success: true,
        transactionRef: response.data.transactionReference,
        payment: {
          payment_id: response.data.transactionReference,
          policy_id: policies[0].policy_id,
          amount: parseFloat(amount),
          payment_date: new Date().toISOString(),
          payment_method: 'ecocash',
          transaction_reference: response.data.transactionReference,
          status: 'pending' // Initial status is pending until confirmed
        }
      };
    } else {
      return {
        success: false,
        error: response.data?.error || 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('Error processing daily premium payment:', error);
    return { success: false, error: 'Failed to process payment' };
  }
};

/**
 * Process a payment using the payment API
 */
export const processPayment = async (
  amount: string, 
  description: string = 'Insurance Premium',
  policyId: string = '',
  referencePrefix: string = 'payment'
): Promise<PremiumPaymentResult> => {
  try {
    // Get user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      return { success: false, error: 'User data not available' };
    }
    
    const user = JSON.parse(userData);
    const phoneNumber = formatZimbabwePhone(user.contact_details);
    const formattedPhone = phoneNumber.replace('+', ''); // Remove + from the phone number
    
    // Generate a reference with timestamp
    const reference = `${referencePrefix}_${Date.now()}`;
    
    // Get API URL
    const API_URL = await getApiUrl();
    
    // Prepare payment data
    const paymentData = {
      amount,
      phoneNumber: formattedPhone,
      description,
      reference,
      username: user.full_name || 'User',
      policyId: policyId || undefined
    };
    
    console.log(`Processing payment via ${API_URL}/payment/process`, paymentData);
    
    // Call the payment API
    const response = await axios.post(
      `${API_URL}/payment/process`,
      paymentData
    );
    
    if (response.data && response.data.success) {
      // Update the last payment date in AsyncStorage
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('lastPremiumPaymentDate', today);
      
      return {
        success: true,
        transactionRef: response.data.transactionReference,
        payment: {
          payment_id: response.data.transactionReference,
          policy_id: policyId,
          amount: parseFloat(amount),
          payment_date: new Date().toISOString(),
          payment_method: 'ecocash',
          transaction_reference: response.data.transactionReference,
          status: 'pending'
        }
      };
    } else {
      return {
        success: false,
        error: response.data?.error || 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, error: 'Failed to process payment' };
  }
};

/**
 * Make a payment for a new claim
 */
export const processClaimPayment = async (
  claimId: string,
  policyId: string,
  amount: string
): Promise<PremiumPaymentResult> => {
  try {
    return await processPayment(
      amount,
      `Claim Payment - Claim ID: ${claimId}`,
      policyId,
      'claim_payment'
    );
  } catch (error) {
    console.error('Error processing claim payment:', error);
    return { success: false, error: 'Failed to process claim payment' };
  }
};

/**
 * Get payment history for a policy
 */
export const getPolicyPaymentHistory = async (policyId: string): Promise<PaymentRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('policy_payments')
      .select('*')
      .eq('policy_id', policyId)
      .order('payment_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPolicyPaymentHistory:', error);
    return [];
  }
};

/**
 * Get all payment history for a user
 */
export const getUserPaymentHistory = async (): Promise<PaymentRecord[]> => {
  try {
    // Get user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      return [];
    }
    
    const user = JSON.parse(userData);
    
    // Get policies for this user
    const { data: policies, error: policiesError } = await supabase
      .from('policy')
      .select('policy_id')
      .eq('policyholder_id', user.policyholder_id);
      
    if (policiesError || !policies || policies.length === 0) {
      return [];
    }
    
    // Get policy ids
    const policyIds = policies.map(p => p.policy_id);
    
    // Get payments for these policies
    const { data, error } = await supabase
      .from('policy_payments')
      .select('*')
      .in('policy_id', policyIds)
      .order('payment_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching user payment history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserPaymentHistory:', error);
    return [];
  }
};

/**
 * Manually make a premium payment
 */
export const makeManualPremiumPayment = async (
  policyId: string,
  amount: number
): Promise<PremiumPaymentResult> => {
  try {
    return await processPayment(
      amount.toString(),
      'Manual Premium Payment',
      policyId,
      'manual_premium'
    );
  } catch (error) {
    console.error('Error making manual premium payment:', error);
    return { success: false, error: 'Failed to process payment' };
  }
};

export default {
  checkDailyPremiumPayment,
  processDailyPremiumPayment,
  processPayment,
  processClaimPayment,
  getPolicyPaymentHistory,
  getUserPaymentHistory,
  makeManualPremiumPayment
};