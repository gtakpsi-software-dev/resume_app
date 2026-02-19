'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from './api';

// Create the member auth context
const MemberAuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
});

// Custom hook to access the member auth context
export const useMemberAuth = () => useContext(MemberAuthContext);

// Member auth context provider component
export function MemberAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Try to fetch current user
          const response = await authAPI.getCurrentUser();
          if (response.data && response.data.data) {
            // Check if it's a member (not admin)
            if (response.data.data.role === 'member') {
              setUser(response.data.data);
              document.documentElement.classList.add('authenticated');
            } else {
              // Admin token, clear it
              localStorage.removeItem('token');
            }
          }
        }
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      console.log('Signing in member:', email);
      setIsLoading(true);
      
      const response = await authAPI.memberLogin(email, password);
      
      if (response.data && response.data.data) {
        const { user: userData, token } = response.data.data;
        
        // Check if it's a member (not admin)
        if (userData.role === 'member') {
          // Store token
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
      console.error('Sign in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Sign in failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up function with access code verification
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
        
        // Store token
        localStorage.setItem('token', token);
        setUser(userData);
        document.documentElement.classList.add('authenticated');
        return { success: true, user: userData };
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);

      // Clear token
      localStorage.removeItem('token');
      
      // Clear user state
      setUser(null);
      document.documentElement.classList.remove('authenticated');
      
      // Clear admin cookie if exists
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
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
