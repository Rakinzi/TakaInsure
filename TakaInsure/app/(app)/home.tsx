import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const router = useRouter();
    const [userName, setUserName] = useState('User');
    const [userData, setUserData] = useState<{
        full_name: string | null;
        policyholder_id: string | null;
        contact_details: string | null;
        date_of_birth: string | null;
        address: string | null;
    } | null>(null);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const userDataString = await AsyncStorage.getItem('userData');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                setUserData(userData);

                if (userData.full_name) {
                    setUserName(userData.full_name);
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const handleNewClaim = () => {
        router.push('/claim/new');
    };

    const handleProfile = () => {
        router.push('/profile');
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['userToken', 'policyHolderId', 'phoneNumber']);
            router.replace('/login');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return (
        <SafeAreaView className="flex-1">
            <ScrollView className="flex-1">
                {/* Header Section */}
                <View className="bg-primary p-6 rounded-b-3xl shadow-md">
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-light text-lg">Welcome back,</Text>
                            <Text className="text-light text-2xl font-bold">{userName}</Text>
                        </View>
                        <TouchableOpacity onPress={handleProfile} className="bg-tertiary p-2 rounded-full">
                            <Image
                                source={require('../../assets/images/react-logo.png')}
                                className="w-8 h-8"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    {userData && (
                        <View className="bg-light p-4 rounded-xl">
                        <Text className="text-primary font-bold mb-1">Policy Holder ID</Text>
                        <Text className="text-secondary text-lg">{userData?.policyholder_id}</Text>
                      </View>
                    )

                    }

                </View>

                {/* Quick Actions */}
                <View className="p-6">
                    <Text className="text-primary text-xl font-bold mb-4">Quick Actions</Text>

                    <TouchableOpacity
                        onPress={handleNewClaim}
                        className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-secondary"
                    >
                        <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
                            <Image
                                source={require('../../assets/images/react-logo.png')}
                                className="w-6 h-6"
                                resizeMode="contain"
                            />
                        </View>
                        <View>
                            <Text className="text-primary text-lg font-bold">File New Claim</Text>
                            <Text className="text-gray-500">Upload evidence and get instant analysis</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-tertiary"
                    >
                        <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
                            <Image
                                source={require('../../assets/images/react-logo.png')}
                                className="w-6 h-6"
                                resizeMode="contain"
                            />
                        </View>
                        <View>
                            <Text className="text-primary text-lg font-bold">Claim History</Text>
                            <Text className="text-gray-500">View your past and ongoing claims</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white flex-row items-center p-4 rounded-xl shadow-sm mb-4 border-l-4 border-primary"
                    >
                        <View className="bg-tertiary/20 p-3 rounded-lg mr-4">
                            <Image
                                source={require('../../assets/images/react-logo.png')}
                                className="w-6 h-6"
                                resizeMode="contain"
                            />
                        </View>
                        <View>
                            <Text className="text-primary text-lg font-bold">My Insurance</Text>
                            <Text className="text-gray-500">View your active insurance packages</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Information Section */}
                <View className="p-6">
                    <Text className="text-primary text-xl font-bold mb-4">Information</Text>

                    <View className="bg-secondary/10 p-4 rounded-xl mb-6">
                        <Text className="text-primary font-bold mb-2">Need Help?</Text>
                        <Text className="text-gray-700 mb-3">
                            Contact our support team via WhatsApp for immediate assistance.
                        </Text>
                        <TouchableOpacity className="bg-secondary py-2 px-4 rounded-lg self-start">
                            <Text className="text-white font-semibold">Contact Support</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-tertiary/20 p-4 rounded-xl items-center"
                    >
                        <Text className="text-tertiary font-bold">Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}