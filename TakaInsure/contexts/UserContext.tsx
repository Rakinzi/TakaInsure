import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type UserData = {
  policyholder_id: string;
  full_name: string;
  contact_details: string;
  date_of_birth?: string;
  address?: string;
  national_id?: string;
  [key: string]: any;
};

type UserContextType = {
  user: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUserData: async () => {},
  logout: async () => {},
});

export const useUser = () => useContext(UserContext);

type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (userDataString) {
        const userData = JSON.parse(userDataString) as UserData;
        setUser(userData);
      } else {
        // Try to construct minimal user data from individual storage items
        const policyHolderId = await AsyncStorage.getItem('policyHolderId');
        const phoneNumber = await AsyncStorage.getItem('phoneNumber');
        
        if (policyHolderId && phoneNumber) {
          setUser({
            policyholder_id: policyHolderId,
            full_name: 'User', // Default name
            contact_details: phoneNumber,
          });
        } else {
          // No user data available
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userToken', 
        'policyHolderId', 
        'phoneNumber', 
        'userData'
      ]);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refreshUserData: loadUserData,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;