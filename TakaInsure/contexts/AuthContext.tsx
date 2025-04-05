import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { useRouter } from 'expo-router';

type User = {
  id: string;
  name: string;
  phone: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (policyHolderId: string, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isLoggedIn: false,
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      setLoading(true);
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userToken) {
        const policyHolderId = await AsyncStorage.getItem('policyHolderId');
        const phoneNumber = await AsyncStorage.getItem('phoneNumber');
        
        if (policyHolderId && phoneNumber) {
          // In a real app, you would validate the token with your API
          // For demo purposes, we'll create a user object
          setUser({
            id: policyHolderId,
            name: 'John Doe', // In a real app, this would come from the API
            phone: phoneNumber,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (policyHolderId: string, phoneNumber: string) => {
    try {
      setLoading(true);
      
      // Call login API
      const response = await authAPI.login(policyHolderId, phoneNumber);
      
      if (response.success) {
        // Store user data in AsyncStorage
        const { token, user: userData } = response.data;
        await AsyncStorage.multiSet([
          ['userToken', token],
          ['policyHolderId', userData.id],
          ['phoneNumber', userData.phone],
        ]);
        
        setUser(userData);
        router.replace('/(app)/home');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;