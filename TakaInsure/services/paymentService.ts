import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './networkService';
import axios from 'axios';
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
 * Process daily premium payment for all active policies
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
    
    // Make the payment
    const result = await processPaynowPayment(
      amount,
      phoneNumber.replace('+', ''), // Remove + from the phone number
      'Daily Premium Payment',
      policies[0].policy_id // Reference the first policy ID
    );
    
    if (result.success) {
      // Update the last payment date
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('lastPremiumPaymentDate', today);
      
      // Record the payment in Supabase for each policy
      for (const policy of policies) {
        // Calculate daily premium for this policy
        const currentDate = new Date();
        const daysInMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        
        const dailyPremium = policy.premium_amount / daysInMonth;
        const policyDailyAmount = Math.round(dailyPremium * 100) / 100;
        
        // Save payment record
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('policy_payments')
          .insert([{
            policy_id: policy.policy_id,
            amount: policyDailyAmount,
            payment_date: new Date().toISOString(),
            payment_method: 'ecocash',
            transaction_reference: result.transactionRef || `daily_${Date.now()}`,
            status: 'completed'
          }])
          .select();
          
        if (paymentError) {
          console.error('Error recording payment:', paymentError);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error processing daily premium payment:', error);
    return { success: false, error: 'Failed to process payment' };
  }
};

/**
 * Process a payment using Paynow gateway
 */
export const processPaynowPayment = async (
  amount: string, 
  phoneNumber: string,
  description: string = 'Insurance Premium',
  referenceId: string = ''
): Promise<PremiumPaymentResult> => {
  try {
    // In a real app, we'd call the backend API to process the payment
    const API_URL = await getApiUrl();
    
    // For demo purposes, we'll simulate a successful payment
    // In a real app, this would call:
    // const response = await axios.post(`${API_URL}/payment/process`, {
    //   amount,
    //   phoneNumber,
    //   description,
    //   referenceId
    // });
    
    console.log(`[SIMULATED] Processing payment of $${amount} to ${phoneNumber} for "${description}"`);

    // Generate a transaction reference
    const transactionRef = `paynow_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Simulate the API response
    const simulatedResponse = {
      success: true,
      message: 'Payment successful',
      transactionRef,
      amount,
      phoneNumber,
      timestamp: new Date().toISOString()
    };
    
    return { 
      success: true, 
      transactionRef,
      payment: {
        payment_id: transactionRef,
        policy_id: referenceId,
        amount: parseFloat(amount),
        payment_date: new Date().toISOString(),
        payment_method: 'ecocash',
        transaction_reference: transactionRef,
        status: 'completed'
      }
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, error: 'Failed to process payment' };
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
    // Get user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      return { success: false, error: 'User data not available' };
    }
    
    const user = JSON.parse(userData);
    
    // Get the user's phone number and format it
    const phoneNumber = formatZimbabwePhone(user.contact_details);
    
    // Process the payment
    const result = await processPaynowPayment(
      amount.toString(),
      phoneNumber.replace('+', ''),
      'Manual Premium Payment',
      policyId
    );
    
    if (result.success) {
      // Record the payment in Supabase
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('policy_payments')
        .insert([{
          policy_id: policyId,
          amount: amount,
          payment_date: new Date().toISOString(),
          payment_method: 'ecocash',
          transaction_reference: result.transactionRef || `manual_${Date.now()}`,
          status: 'completed'
        }])
        .select();
        
      if (paymentError) {
        console.error('Error recording payment:', paymentError);
        return { success: false, error: 'Payment processed but failed to record' };
      }
      
      if (paymentRecord && paymentRecord.length > 0) {
        return { 
          success: true, 
          payment: paymentRecord[0],
          transactionRef: result.transactionRef 
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error making manual premium payment:', error);
    return { success: false, error: 'Failed to process payment' };
  }
};

export default {
  checkDailyPremiumPayment,
  processDailyPremiumPayment,
  getPolicyPaymentHistory,
  getUserPaymentHistory,
  makeManualPremiumPayment,
  processPaynowPayment
};