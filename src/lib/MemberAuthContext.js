'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from './api';

const MemberAuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
});

export const useMemberAuth = () => useContext(MemberAuthContext);

export function MemberAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authAPI.getCurrentUser();
          if (response.data?.data?.role === 'member') {
            setUser(response.data.data);
            document.documentElement.classList.add('authenticated');
          }
        }
      } catch (error) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email, password) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.memberLogin(email, password);
      
      if (response.data && response.data.data) {
        const { user: userData, token } = response.data.data;
        
        if (userData.role === 'member') {
          localStorage.setItem('token', token);
          setUser(userData);
          document.documentElement.classList.add('authenticated');
          return { success: true, user: userData };
        } else {
          throw new Error('Invalid user type');
        }
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Sign in failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email, password, firstName, lastName, accessCode) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.register({
        email,
        password,
        firstName,
        lastName,
        accessCode
      });
      
      if (response.data && response.data.data) {
        const { user: userData, token } = response.data.data;
        
        localStorage.setItem('token', token);
        setUser(userData);
        document.documentElement.classList.add('authenticated');
        return { success: true, user: userData };
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      localStorage.removeItem('token');
      
      setUser(null);
      document.documentElement.classList.remove('authenticated');
      
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user && user.role === 'member',
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export default MemberAuthContext;
