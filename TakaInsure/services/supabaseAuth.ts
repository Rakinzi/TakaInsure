import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is not defined in environment variables');
}

// Creating a custom storage object for React Native
const reactNativeStorage = {
    getItem: (key: string) => {
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        return AsyncStorage.removeItem(key);
    },
};

// Create Supabase client with our AsyncStorage adapter
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: reactNativeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

/**
 * Format Zimbabwe phone number to international format
 * @param phoneNumber Phone number to format
 * @returns Formatted phone number
 */
export const formatZimbabwePhone = (phoneNumber: string): string => {
    // Remove any spaces, dashes, or parentheses
    const cleaned = phoneNumber.replace(/\s+|-|\(|\)/g, '');

    // Check if it starts with 0 (local Zimbabwe format)
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        // Replace the leading 0 with +263
        return '+263' + cleaned.substring(1);
    }

    // Check if it already starts with +263
    if (cleaned.startsWith('+263')) {
        return cleaned;
    }

    // If it starts with 263 without the +
    if (cleaned.startsWith('263') && cleaned.length === 12) {
        return '+' + cleaned;
    }

    // Return the original if it doesn't match any known Zimbabwe patterns
    return phoneNumber;
};

/**
 * Authenticate a policyholder with their ID and phone number
 * @param policyHolderId The policyholder ID
 * @param phoneNumber The phone number
 * @returns Authentication result
 */
export const authenticatePolicyholder = async (
    policyHolderId: string,
    phoneNumber: string
) => {
    try {
        // Format the phone number
        const formattedPhone = formatZimbabwePhone(phoneNumber);

        console.log('Authenticating with:', { policyHolderId, formattedPhone });

        // Query the policyholder table for a match
        const { data, error } = await supabase
            .from('policyholder')
            .select('*')
            .eq('policyholder_id', policyHolderId)
            .eq('contact_details', formattedPhone)
            .single();

        if (error) {
            console.error('Supabase query error:', error);
            throw new Error('Authentication failed');
        }

        if (!data) {
            throw new Error('Invalid credentials');
        }

        // Generate a simple token - in a real app, you would use JWT or similar
        const token = btoa(`${policyHolderId}:${formattedPhone}:${Date.now()}`);

        // Store the session data
        await AsyncStorage.multiSet([
            ['userToken', token],
            ['policyHolderId', policyHolderId],
            ['phoneNumber', formattedPhone],
            ['userData', JSON.stringify(data)], // Store all user data for use in the app
        ]);

        return {
            success: true,
            token,
            user: data,
        };
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

/**
 * Log out the current user
 */
export const logoutUser = async () => {
    try {
        // Clear all authentication data
        await AsyncStorage.multiRemove([
            'userToken',
            'policyHolderId',
            'phoneNumber',
            'userData'
        ]);

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

/**
 * Get current user data
 * @returns The current user data or null if not logged in
 */
export const getCurrentUser = async () => {
    try {
        const userData = await AsyncStorage.getItem('userData');

        if (!userData) {
            return null;
        }

        return JSON.parse(userData);
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
};

export default {
    supabase,
    authenticatePolicyholder,
    logoutUser,
    getCurrentUser,
    formatZimbabwePhone
};