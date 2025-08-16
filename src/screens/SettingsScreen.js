import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createGlobalStyles } from '../styles/globalStyles';
import apiService from '../services/api';

const SettingsScreen = ({ navigation }) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, logout, updateProfile } = useAuth();
  const styles = createGlobalStyles(colors);
  
  const [isThemeEnabled, setIsThemeEnabled] = useState(isDarkMode);

  const handleThemeToggle = () => {
    setIsThemeEnabled(!isThemeEnabled);
    toggleTheme();
  };

  const handleProfilePhotoEdit = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload to backend
        const response = await apiService.uploadProfilePhoto(result.assets[0].uri);
        
        if (response.success) {
          updateProfile({ profilePhoto: response.photoUrl });
          Alert.alert('Success', 'Profile photo updated successfully!');
        } else {
          Alert.alert('Error', response.message || 'Failed to update profile photo');
        }
      }
    } catch (error) {
      console.error('Profile photo update error:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const renderSettingItem = ({ icon, title, subtitle, onPress, showSwitch, switchValue, showArrow = true }) => (
    <TouchableOpacity
      style={customStyles.settingItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={customStyles.settingIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      
      <View style={customStyles.settingContent}>
        <Text style={customStyles.settingTitle}>{title}</Text>
        {subtitle && <Text style={customStyles.settingSubtitle}>{subtitle}</Text>}
      </View>
      
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onPress}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={switchValue ? '#FFFFFF' : colors.textSecondary}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );

  const customStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 15,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    profileSection: {
      backgroundColor: colors.surface,
      paddingVertical: 30,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    profileAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      position: 'relative',
    },
    profileAvatarText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    profileName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    settingsSection: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
      paddingHorizontal: 20,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    settingSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    logoutButton: {
      backgroundColor: colors.error,
      marginHorizontal: 20,
      marginTop: 30,
      marginBottom: 20,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  };

  return (
    <SafeAreaView style={customStyles.container}>
      <StatusBar
        barStyle={colors.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      
      <View style={customStyles.header}>
        <TouchableOpacity
          style={customStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={customStyles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={customStyles.profileSection}>
          <View style={customStyles.profileAvatar}>
            <Text style={customStyles.profileAvatarText}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
            <TouchableOpacity
              style={customStyles.editAvatarButton}
              onPress={handleProfilePhotoEdit}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={customStyles.profileName}>{user?.name || 'User'}</Text>
          <Text style={customStyles.profileEmail}>{user?.email || 'user@example.com'}</Text>
        </View>

        <View style={customStyles.settingsSection}>
          <Text style={customStyles.sectionTitle}>Appearance</Text>
          
          {renderSettingItem({
            icon: 'moon',
            title: 'Dark Mode',
            subtitle: 'Toggle between light and dark theme',
            onPress: handleThemeToggle,
            showSwitch: true,
            switchValue: isThemeEnabled,
            showArrow: false,
          })}
        </View>



        <TouchableOpacity style={customStyles.logoutButton} onPress={handleLogout}>
          <Text style={customStyles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
