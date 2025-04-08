import { useEffect } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppLayout() {
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      router.replace('/login');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1D1616',
        },
        headerTintColor: '#EEEEEE',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: '#EEEEEE',
        },
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          title: 'TakaInsure',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="claim/new"
        options={{
          title: 'New Claim',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="claim/upload"
        options={{
          title: 'Upload Evidence',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="claim/analysis"
        options={{
          title: 'Claim Analysis',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="claim/recommendation"
        options={{
          title: 'Insurance Recommendation',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="policy/index"
        options={{
          title: 'My Policies',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="policy/details"
        options={{
          title: 'Policy Details',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="policy/blockchain-details"
        options={{
          title: 'Blockchain Details',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="vehicle"
        options={{
          title: 'My Vehicles',
          presentation: 'modal',
        }}
      />

      <Stack.Screen
        name="settings"
        options={{
          title: 'Network Settings',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}