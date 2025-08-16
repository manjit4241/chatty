import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { createGlobalStyles } from '../styles/globalStyles';

// Mock data for search results
const mockContacts = [
  { id: '1', name: 'John Smith', email: 'john@example.com', isOnline: true },
  { id: '2', name: 'Alex Wright', email: 'alex@example.com', isOnline: true },
  { id: '3', name: 'Jenny Jenks', email: 'jenny@example.com', isOnline: false },
  { id: '4', name: 'Matthew Bruno', email: 'matthew@example.com', isOnline: false },
  { id: '5', name: 'Sarah Johnson', email: 'sarah@example.com', isOnline: true },
  { id: '6', name: 'Michael Chen', email: 'michael@example.com', isOnline: false },
  { id: '7', name: 'Emily Davis', email: 'emily@example.com', isOnline: true },
  { id: '8', name: 'David Wilson', email: 'david@example.com', isOnline: false },
];

const SearchScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = createGlobalStyles(colors);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts] = useState(mockContacts);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={customStyles.contactItem}
      onPress={() => {
        // Navigate to chat with this contact
        navigation.navigate('Chat', { 
          chat: {
            id: item.id,
            name: item.name,
            isOnline: item.isOnline,
          }
        });
      }}
    >
      <View style={customStyles.contactAvatar}>
        <Text style={customStyles.contactAvatarText}>
          {item.name.charAt(0)}
        </Text>
        {item.isOnline && <View style={styles.statusActive} />}
      </View>
      
      <View style={customStyles.contactInfo}>
        <Text style={customStyles.contactName}>{item.name}</Text>
        <Text style={customStyles.contactEmail}>{item.email}</Text>
      </View>
      
      <TouchableOpacity style={customStyles.messageButton}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
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
    searchContainer: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.inputText,
      marginLeft: 10,
    },
    clearButton: {
      marginLeft: 10,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 20,
      marginBottom: 15,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contactAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      position: 'relative',
    },
    contactAvatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    contactEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    messageButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 20,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
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
        
        <View style={customStyles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={customStyles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={customStyles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={customStyles.content}>
        {searchQuery.length > 0 ? (
          <>
            <Text style={customStyles.sectionTitle}>
              Search Results ({filteredContacts.length})
            </Text>
            
            {filteredContacts.length > 0 ? (
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={customStyles.emptyState}>
                <Text style={customStyles.emptyStateIcon}>🔍</Text>
                <Text style={customStyles.emptyStateTitle}>No results found</Text>
                <Text style={customStyles.emptyStateText}>
                  Try searching with a different name or email address
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={customStyles.emptyState}>
            <Text style={customStyles.emptyStateIcon}>👥</Text>
            <Text style={customStyles.emptyStateTitle}>Search Contacts</Text>
            <Text style={customStyles.emptyStateText}>
              Start typing to search for contacts by name or email address
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;
