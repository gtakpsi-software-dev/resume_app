'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

const setCookie = (name, value, days = 7) => {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const removeCookie = (name) => {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  adminLogin: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data } = await authAPI.getCurrentUser();
        if (data?.data?.role === 'admin') {
          setUser(data.data);
        }
      } catch (error) {
        localStorage.removeItem('token');
        removeCookie('token');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const adminLogin = async (password) => {
    try {
      const response = await authAPI.adminLogin(password);
      const responseData = response.data;
      const userData = responseData.data;

      if (responseData.error || !userData.token) {
        throw new Error(responseData.message || 'Admin login failed: Invalid response from server');
      }
      
      localStorage.setItem('token', userData.token);
      setCookie('token', userData.token);
      
      setUser(userData); 
      
      return userData; 
    } catch (error) {
      if (!error.response) {
        console.error("Admin login function error:", error);
      }
      throw error;
    }
  };

  const logout = () => {
    removeCookie('token');
    localStorage.removeItem('token');

    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: user?.role === 'admin',
    isLoading,
    adminLogin,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext; 