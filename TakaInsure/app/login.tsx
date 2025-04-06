import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatePolicyholder } from '../services/supabaseAuth';

export default function LoginScreen() {
  const router = useRouter();
  const [policyHolderId, setPolicyHolderId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Basic validation
    if (!policyHolderId.trim()) {
      Alert.alert('Error', 'Please enter your Policy Holder ID');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);

    try {
      // Authenticate with Supabase
      const result = await authenticatePolicyholder(policyHolderId, phoneNumber);
      
      if (result.success) {
        console.log('Login successful:', result.user.full_name);
        
        // Navigate to the home screen
        router.replace('/(app)/home');
      } else {
        // This shouldn't happen as the function throws errors, but just in case
        Alert.alert('Login Failed', 'Unable to verify your credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show a user-friendly error message
      Alert.alert(
        'Login Failed', 
        'The Policy Holder ID and phone number combination could not be verified. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-center p-6">
        <View className="items-center mb-10">
          <Image
            source={require('../assets/images/react-logo.png')}
            className="w-24 h-24 mb-4"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-light mb-2">Welcome Back</Text>
          <Text className="text-light text-center">
            Login with your ID and phone number to continue
          </Text>
        </View>

        <View className="bg-light rounded-xl p-6 mb-6">
          <Text className="text-primary font-semibold mb-2">Policy Holder ID</Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-lg p-4 mb-4"
            placeholder="Enter your ID"
            value={policyHolderId}
            onChangeText={setPolicyHolderId}
          />

          <Text className="text-primary font-semibold mb-2">Phone Number</Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-lg p-4 mb-4"
            placeholder="Enter your phone number (e.g., 0772123456)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`${loading ? 'bg-gray-400' : 'bg-secondary'} rounded-lg p-4 items-center`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg">Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="items-center">
          <Text className="text-light text-center mb-2">
            Don't have an account yet?
          </Text>
          <Text className="text-tertiary font-semibold">
            Message "register" to our WhatsApp number to create one
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}