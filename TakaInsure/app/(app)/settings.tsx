import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, setApiUrl, resetApiUrl } from '../../services/networkService';
import NetInfo from '@react-native-community/netinfo';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrlState] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [deviceIP, setDeviceIP] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    loadSettings();
    fetchNetworkInfo();
  }, []);

  const loadSettings = async () => {
    try {
      // Load developer mode setting
      const devMode = await AsyncStorage.getItem('developerMode');
      setIsDeveloperMode(devMode === 'true');
      
      // Load API URL
      const currentApiUrl = await getApiUrl();
      setApiUrlState(currentApiUrl);
      setNewApiUrl(currentApiUrl);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected || false);
      
      // Get device IP address based on platform and connection type
      if (state.type === 'wifi' && state.details) {
        const ipAddress = state.details.ipAddress || '';
        setDeviceIP(ipAddress);
      }
    } catch (error) {
      console.error('Error fetching network info:', error);
    }
  };

  const toggleDeveloperMode = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('developerMode', value ? 'true' : 'false');
      setIsDeveloperMode(value);
    } catch (error) {
      console.error('Error saving developer mode setting:', error);
    }
  };

  const handleUpdateApiUrl = async () => {
    try {
      if (!newApiUrl.trim()) {
        Alert.alert('Error', 'API URL cannot be empty');
        return;
      }

      // Validate URL format
      try {
        new URL(newApiUrl);
      } catch (e) {
        Alert.alert('Error', 'Invalid URL format. Please enter a valid URL (e.g., http://192.168.1.100:5000)');
        return;
      }

      await setApiUrl(newApiUrl);
      setApiUrlState(newApiUrl);
      
      Alert.alert(
        'API URL Updated',
        'The API URL has been updated. The app will use this URL for all API calls.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reload the app to apply the new API URL
              router.replace('/');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating API URL:', error);
      Alert.alert('Error', 'Failed to update API URL');
    }
  };

  const handleResetApiUrl = async () => {
    try {
      await resetApiUrl();
      const defaultUrl = await getApiUrl();
      setApiUrlState(defaultUrl);
      setNewApiUrl(defaultUrl);
      
      Alert.alert(
        'API URL Reset',
        'The API URL has been reset to the default value.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reload the app to apply the new API URL
              router.replace('/');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error resetting API URL:', error);
      Alert.alert('Error', 'Failed to reset API URL');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Network Settings</Text>
        <Text className="text-gray-600 mb-6">Configure API server connection</Text>
        
        {/* Current Connection Info */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-3">Connection Information</Text>
          
          <View className="bg-blue-50 p-3 rounded-lg mb-4">
            <Text className="text-blue-800">
              Connected to WiFi: {isConnected ? 'Yes' : 'No'}
            </Text>
            <Text className="text-blue-800">
              Your Device IP: {deviceIP || 'Unknown'}
            </Text>
            <Text className="text-blue-800 mt-2">
              Current API URL:
            </Text>
            <Text className="text-gray-700 p-2 bg-white rounded-lg mt-1 font-mono text-xs">
              {apiUrl}
            </Text>
          </View>
          
          <Text className="text-primary font-bold mb-2">Server Connection</Text>
          <Text className="text-gray-600 mb-3">
            To connect to the backend server, enter the IP address of your computer running the Flask server.
            Make sure both devices are on the same WiFi network.
          </Text>
          
          <Text className="text-primary font-medium mb-2">New API URL</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4"
            placeholder="http://192.168.1.100:5000"
            value={newApiUrl}
            onChangeText={setNewApiUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleUpdateApiUrl}
              className="bg-secondary flex-1 p-3 rounded-lg items-center"
            >
              <Text className="text-white font-medium">Update API URL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleResetApiUrl}
              className="bg-primary flex-1 p-3 rounded-lg items-center"
            >
              <Text className="text-white font-medium">Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Developer Mode Toggle */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-3">Developer Options</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700">Developer Mode</Text>
            <Switch
              value={isDeveloperMode}
              onValueChange={toggleDeveloperMode}
              trackColor={{ false: '#767577', true: '#8E1616' }}
              thumbColor={isDeveloperMode ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
          
          {isDeveloperMode && (
            <>
              <Text className="text-gray-500 text-xs mt-3">
                Note: For physical devices, use your computer's actual IP address on the same WiFi network as your mobile device.
              </Text>
              
              <View className="bg-blue-50 p-3 rounded-lg mt-4">
                <Text className="text-blue-800 font-medium mb-1">Connection Troubleshooting</Text>
                <Text className="text-blue-800 mt-2">
                  1. Make sure your computer and phone are on the same WiFi network
                </Text>
                <Text className="text-blue-800">
                  2. Use your computer's IP address in the API URL (e.g., http://192.168.1.100:5000)
                </Text>
                <Text className="text-blue-800">
                  3. Ensure the Flask server is running with HOST=0.0.0.0 in the .env file
                </Text>
                <Text className="text-blue-800">
                  4. Check if your computer's firewall is allowing connections on port 5000
                </Text>
                <Text className="text-blue-800">
                  5. Try pinging your computer from another device to verify connectivity
                </Text>
              </View>
            </>
          )}
        </View>
        
        {/* Return to Dashboard Button */}
        <TouchableOpacity
          onPress={() => router.push('/home')}
          className="bg-primary p-4 rounded-xl items-center mb-6"
        >
          <Text className="text-white font-bold">Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}