import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserData = {
    full_name: string | null;
    policyholder_id: string | null;
    contact_details: string | null;
    date_of_birth: string | null;
    address: string | null;
};

export default function ProfileScreen() {
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setLoading(true);

            // Get the user data from AsyncStorage
            const userDataString = await AsyncStorage.getItem('userData');

            if (userDataString) {
                const parsedUserData = JSON.parse(userDataString);
                setUserData(parsedUserData);
            } else {
                // Fallback to getting individual items
                const policyHolderId = await AsyncStorage.getItem('policyHolderId');
                const phoneNumber = await AsyncStorage.getItem('phoneNumber');

                if (policyHolderId && phoneNumber) {
                    setUserData({
                        full_name: 'User',
                        policyholder_id: policyHolderId,
                        contact_details: phoneNumber,
                        date_of_birth: 'Not available',
                        address: 'Not available'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            Alert.alert('Error', 'Failed to load profile information');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Clear all authentication data
            await AsyncStorage.multiRemove(['userToken', 'policyHolderId', 'phoneNumber', 'userData']);
            router.replace('/login');
        } catch (error) {
            console.error('Error during logout:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    const renderProfileInfo = () => {
        if (!userData) return null;

        return (
            <>
                <View className="items-center mb-6">
                    <View className="bg-secondary rounded-full p-1">
                        <Image
                            source={require('../../assets/images/react-logo.png')}
                            className="w-24 h-24 rounded-full"
                        />
                    </View>
                    <Text className="text-primary text-2xl font-bold mt-4">{userData.full_name}</Text>
                    <View className="bg-secondary/20 rounded-full px-4 py-1 mt-2">
                        <Text className="text-secondary font-medium">Policyholder</Text>
                    </View>
                </View>

                <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
                    <Text className="text-primary font-bold text-lg mb-4">Personal Information</Text>

                    <View className="mb-3">
                        <Text className="text-gray-500">Policy Holder ID</Text>
                        <Text className="text-primary font-medium">{userData.policyholder_id}</Text>
                    </View>

                    <View className="mb-3">
                        <Text className="text-gray-500">Phone Number</Text>
                        <Text className="text-primary font-medium">{userData.contact_details}</Text>
                    </View>

                    <View className="mb-3">
                        <Text className="text-gray-500">Date of Birth</Text>
                        <Text className="text-primary font-medium">{userData.date_of_birth || 'Not provided'}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-500">Address</Text>
                        <Text className="text-primary font-medium">{userData.address || 'Not provided'}</Text>
                    </View>
                </View>

                <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
                    <Text className="text-primary font-bold text-lg mb-4">Insurance Summary</Text>

                    <View className="flex-row">
                        <View className="flex-1 bg-secondary/10 p-4 rounded-lg mr-2 items-center">
                            <Text className="text-secondary text-2xl font-bold">1</Text>
                            <Text className="text-primary font-medium">Active Policies</Text>
                        </View>

                        <View className="flex-1 bg-tertiary/10 p-4 rounded-lg ml-2 items-center">
                            <Text className="text-tertiary text-2xl font-bold">0</Text>
                            <Text className="text-primary font-medium">Active Claims</Text>
                        </View>
                    </View>
                </View>

                <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
                    <Text className="text-primary font-bold text-lg mb-4">Database Transparency</Text>
                    <Text className="text-gray-600 mb-3">
                        Your insurance policies and claims are recorded in our secure database for transparency and security.
                    </Text>

                    <TouchableOpacity className="bg-primary p-3 rounded-lg flex-row justify-center items-center">
                        <Text className="text-white font-medium ml-2">View Database Records</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-tertiary/20 p-4 rounded-xl items-center mb-6"
                >
                    <Text className="text-tertiary font-bold">Logout</Text>
                </TouchableOpacity>
            </>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-light">
            <ScrollView className="flex-1 p-6">
                <Text className="text-primary text-2xl font-bold mb-6">My Profile</Text>

                {loading ? (
                    <View className="items-center justify-center py-12">
                        <ActivityIndicator size="large" color="#8E1616" />
                        <Text className="text-gray-600 mt-4">Loading profile information...</Text>
                    </View>
                ) : (
                    renderProfileInfo()
                )}
            </ScrollView>
        </SafeAreaView>
    );
}