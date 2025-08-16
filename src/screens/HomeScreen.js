import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createGlobalStyles } from '../styles/globalStyles';
import apiService from '../services/api';
import socketService from '../services/socket'; // Import socket service
import AsyncStorage from '@react-native-async-storage/async-storage';


const testConnection = () => {
  const status = socketService.getConnectionStatus();
  Alert.alert('Socket Status', 
    `Connected: ${status.isConnected}\nSocket ID: ${status.socketId || 'None'}`
  );
};
// Mock data fallback
const mockChats = [
  {
    id: '1',
    name: 'John Smith',
    lastMessage: 'How are you today?',
    timestamp: '2 min ago',
    unreadCount: 3,
    isOnline: true,
    avatar: null,
  },
  {
    id: '2',
    name: 'Team Spruce',
    lastMessage: "Don't miss to attend the meeting.",
    timestamp: '5 min ago',
    unreadCount: 4,
    isOnline: false,
    avatar: null,
    isGroup: true,
  },
  {
    id: '3',
    name: 'Alex Wright',
    lastMessage: 'Thanks for the help!',
    timestamp: '10 min ago',
    unreadCount: 0,
    isOnline: true,
    avatar: null,
  },
  {
    id: '4',
    name: 'Jenny Jenks',
    lastMessage: 'See you tomorrow!',
    timestamp: '1 hour ago',
    unreadCount: 0,
    isOnline: false,
    avatar: null,
  },
  {
    id: '5',
    name: 'Matthew Bruno',
    lastMessage: 'Great work on the project!',
    timestamp: '2 hours ago',
    unreadCount: 0,
    isOnline: false,
    avatar: null,
  },
];

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createGlobalStyles(colors);

  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState(mockChats); // start with mock data so UI isn't empty
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Safe filter
  const filteredChats = (Array.isArray(chats) ? chats : []).filter(chat =>
    chat?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initializeSocket = async () => {
    try {
      // Ensure socket is connected when HomeScreen loads
      if (!socketService.isSocketConnected()) {
        console.log('🔌 Initializing socket connection from HomeScreen...');
        await socketService.connect();
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getChats();

      console.log('📥 API Response:', response);

      if (response?.success && Array.isArray(response.chats)) {
        // Transform backend format to frontend format
        const transformedChats = response.chats.map(chat => ({
          id: chat.id,
          _id: chat.id, // Add _id for keyExtractor compatibility
          name: chat.name,
          lastMessage: chat.lastMessage?.content || 'No messages yet',
          timestamp: chat.lastMessage?.timestamp ? 
            new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Now',
          unreadCount: chat.unreadCount || 0,
          isOnline: chat.participants?.some(p => p.isOnline) || false,
          avatar: null,
          isGroup: chat.isGroup,
          participants: chat.participants,
          type: chat.type
        }));

        setChats(transformedChats);
        console.log('✅ Successfully loaded chats from API:', transformedChats.length);
      } else {
        console.warn('Using mock chats due to API error. Response:', response);
        setChats(mockChats);
        if (response?.message) {
          Alert.alert('API Error', response.message);
        }
      }
    } catch (error) {
      console.error('Fetch chats error:', error);
      Alert.alert('Error', 'Failed to load chats. Please check your connection and try again.');
      setChats(mockChats);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  useEffect(() => {
    // Initialize socket and fetch chats when component mounts
    const initializeApp = async () => {
      await initializeSocket();
      await fetchChats();
    };

    initializeApp();

    // Setup socket event listeners
    const handleNewMessage = (data) => {
      console.log('💬 New message received in HomeScreen:', data);
      // Update the chat list with new message
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.id === data.chatId) {
            return {
              ...chat,
              lastMessage: data.message.text || data.message,
              timestamp: 'now',
              unreadCount: chat.unreadCount + 1
            };
          }
          return chat;
        });
        return updatedChats;
      });
    };

    const handleUserStatusChange = (data) => {
      console.log('👤 User status change in HomeScreen:', data);
      // Update user online status in chat list
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === data.userId) {
            return { ...chat, isOnline: data.isOnline };
          }
          return chat;
        });
      });
    };

    // Set up socket listeners
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserStatusChange(handleUserStatusChange);

    // Cleanup on unmount
    return () => {
      socketService.removeListener('new-message');
      socketService.removeListener('user-status-change');
    };
  }, []);

  const renderChatItem = ({ item }) => (
    
    <TouchableOpacity
      style={customStyles.chatItem}
      onPress={() => navigation.navigate('Chat', { chat: item })}
    >
      <View style={customStyles.chatAvatar}>
        {item.isGroup ? (
          <View style={customStyles.groupAvatar}>
            <View style={customStyles.groupAvatarTop}>
              <View style={[customStyles.groupAvatarSmall, { backgroundColor: colors.primary }]} />
              <View style={[customStyles.groupAvatarSmall, { backgroundColor: colors.secondary }]} />
            </View>
            <View style={customStyles.groupAvatarBottom}>
              <View style={[customStyles.groupAvatarSmall, { backgroundColor: colors.info }]} />
              <View style={[customStyles.groupAvatarSmall, { backgroundColor: colors.success }]} />
            </View>
          </View>
        ) : (
          <View style={customStyles.avatar}>
            <Text style={customStyles.avatarText}>
              {item.name?.charAt(0) || '?'}
            </Text>
            {item.isOnline && <View style={styles.statusActive} />}
          </View>
        )}
      </View>

      <View style={customStyles.chatContent}>
        <View style={customStyles.chatHeader}>
          <Text style={customStyles.chatName}>{item.name}</Text>
          <Text style={customStyles.chatTime}>{item.timestamp}</Text>
        </View>
        <View style={customStyles.chatFooter}>
          <Text style={customStyles.chatMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
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
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      marginLeft: 15,
    },
    searchContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.inputText,
      marginLeft: 10,
    },
    chatItem: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chatAvatar: {
      marginRight: 15,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    groupAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      padding: 2,
    },
    groupAvatarTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    groupAvatarBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    groupAvatarSmall: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    chatContent: {
      flex: 1,
      justifyContent: 'center',
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    chatName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    chatTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chatFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chatMessage: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 10,
    },
  };

  return (
    <SafeAreaView style={customStyles.container}>
      <StatusBar
        barStyle={colors.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      <View style={customStyles.header}>
        <View style={customStyles.headerContent}>
          <Text style={customStyles.headerTitle}>Home</Text>
          <View style={customStyles.headerActions}>
            
            <TouchableOpacity
              style={customStyles.headerButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={customStyles.headerButton}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Ionicons name="add-circle" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={customStyles.headerButton}
              onPress={testConnection}
            >
              <Ionicons name="bug" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={customStyles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={customStyles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item._id || item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

export default HomeScreen;