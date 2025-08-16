import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import apiService from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Login
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ email, password }); // ✅ Send object

      if (response.success) {
        await apiService.saveTokens(response.token, response.refreshToken); // ✅ Save tokens
        setUser(response.user);
        socketService.connect(response.user._id);
        return { success: true, user: response.user };
      } else {
        Alert.alert('Error', response.message || 'Login failed. Please try again.');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Signup
  const signup = async (name, email, password) => {
    try {
      setIsLoading(true);
      const response = await apiService.signup({ name, email, password }); // ✅ Send object

      if (response.success) {
        await apiService.saveTokens(response.token, response.refreshToken); // ✅ Save tokens
        setUser(response.user);
        socketService.connect(response.user._id);
        return { success: true, user: response.user };
      } else {
        Alert.alert('Error', response.message || 'Signup failed. Please try again.');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Signup failed. Please check your connection and try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.logout();
      await apiService.clearTokens();
      setUser(null);
      socketService.disconnect();

      if (response.success) {
        return { success: true };
      } else {
        Alert.alert('Error', response.message || 'Logout failed. Please try again.');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      socketService.disconnect();
      await apiService.clearTokens();
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateUserProfile(updates);

      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      } else {
        Alert.alert('Error', response.message || 'Profile update failed. Please try again.');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Profile update failed. Please check your connection and try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { token } = await apiService.loadTokens();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await apiService.getCurrentUser();

        if (response.success && response.user) {
          setUser(response.user);
          socketService.connect(response.user._id);
        } else {
          await apiService.clearTokens();
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
