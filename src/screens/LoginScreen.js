import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createGlobalStyles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket'; // Import socket service

const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { login, isLoading } = useAuth();
  const styles = createGlobalStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  if (!email.includes('@')) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters');
    return;
  }

  try {
    const result = await login(email, password);
    
    // Add debugging to see what you're getting
    console.log('Login result:', result);
    
    // Check for successful login - be more flexible with the check
    if (result && (result.success || result.token)) {
      const token = result.token || result.accessToken || result.authToken;
      
      if (token) {
        try {
          // Save token for socket.js
          await AsyncStorage.setItem('authToken', token);
          console.log('✅ Auth token saved for socket connection');
          
          // Connect socket after successful login
          await socketService.reconnectWithToken();
          console.log('✅ Socket connection initiated after login');
          
          navigation.replace('Home'); // Go to Home screen after login
        } catch (err) {
          console.error('Error saving token or connecting socket:', err);
          // Still navigate even if socket fails
          navigation.replace('Home');
        }
      } else {
        // Login successful but no token - this might still be valid
        console.log('Login successful but no token found');
        navigation.replace('Home');
      }
    } else {
      // Only show error if login actually failed
      const errorMessage = result?.error || result?.message || 'Login failed';
      Alert.alert('Error', errorMessage);
    }
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert('Error', 'An error occurred during login');
  }
};

  const customStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: 80,
      marginBottom: 60,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    logoText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    inputContainer: {
      marginBottom: 20,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: emailFocused ? colors.primary : colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.inputText,
      marginBottom: 16,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: passwordFocused ? colors.primary : colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingRight: 50,
      fontSize: 16,
      color: colors.inputText,
    },
    eyeIcon: {
      position: 'absolute',
      right: 16,
      top: 14,
    },
    loginButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    signupText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    signupLink: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 5,
    },
  };

  return (
    <KeyboardAvoidingView
      style={customStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={customStyles.logoContainer}>
          <View style={customStyles.logo}>
            <Text style={customStyles.logoText}>💬</Text>
          </View>
          <Text style={customStyles.welcomeText}>Welcome Back</Text>
          <Text style={customStyles.subtitle}>Sign in to continue chatting</Text>
        </View>

        <View style={customStyles.inputContainer}>
          <TextInput
            style={customStyles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={customStyles.passwordContainer}>
            <TextInput
              style={customStyles.passwordInput}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={customStyles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={customStyles.loginButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={customStyles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={customStyles.signupContainer}>
          <Text style={customStyles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={customStyles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;