import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { UserProvider } from '../contexts/UserContext';
import '../global.css'; // Import the tailwind styles

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <UserProvider>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1D1616',
          },
          headerTintColor: '#EEEEEE',
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
          },
          contentStyle: {
            backgroundColor: '#EEEEEE',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="login" 
          options={{ 
            title: 'Login',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="(app)" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </UserProvider>
  );
}