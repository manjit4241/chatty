import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    setIsDarkMode(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      // Dark theme colors - More aesthetic and darker
      primary: '#6366F1',
      secondary: '#8B5CF6',
      background: '#0F0F0F',
      surface: '#1A1A1A',
      card: '#2A2A2A',
      text: '#FFFFFF',
      textSecondary: '#A0A0A0',
      border: '#333333',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      statusActive: '#22C55E',
      statusInactive: '#6B7280',
      inputBackground: '#1F1F1F',
      inputBorder: '#333333',
      inputText: '#FFFFFF',
      placeholder: '#666666',
      shadow: '#000000',
      overlay: 'rgba(0, 0, 0, 0.7)',
      gradientStart: '#6366F1',
      gradientEnd: '#8B5CF6',
    } : {
      // Light theme colors - Updated to match dark theme aesthetic
      primary: '#6366F1',
      secondary: '#8B5CF6',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      card: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      statusActive: '#22C55E',
      statusInactive: '#9CA3AF',
      inputBackground: '#FFFFFF',
      inputBorder: '#D1D5DB',
      inputText: '#1F2937',
      placeholder: '#9CA3AF',
      shadow: '#000000',
      overlay: 'rgba(0, 0, 0, 0.3)',
      gradientStart: '#6366F1',
      gradientEnd: '#8B5CF6',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
