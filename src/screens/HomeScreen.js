import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createGlobalStyles } from '../styles/globalStyles';
import apiService from '../services/api';
import socketService from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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
  const { colors } = useTheme(); // Removed toggleTheme since we removed the theme button
  const { user } = useAuth();
  const styles = createGlobalStyles(colors);

  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Memoized filtered chats for better performance
  const filteredChats = useMemo(() => {
    if (!Array.isArray(chats)) return [];
    return chats.filter(chat =>
      chat?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  // Calculate total unread messages for notification indicator
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  }, [chats]);

  // Optimized socket initialization
  const initializeSocket = useCallback(async () => {
    try {
      if (!socketService.isSocketConnected()) {
        console.log('🔌 Initializing socket connection from HomeScreen...');
        await socketService.connect();
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }, []);

  // Optimized chat fetching with caching
  const fetchChats = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching chats...', forceRefresh ? '(forced refresh)' : '');
      
      const response = await apiService.getChats(forceRefresh);

      if (response?.success && Array.isArray(response.chats)) {
        const transformedChats = response.chats.map(chat => ({
          id: chat.id,
          _id: chat.id,
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
  }, []);

  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchChats(true); // Force refresh
    setRefreshing(false);
  }, [fetchChats]);

  // Force refresh chats (call this when needed)
  const forceRefreshChats = useCallback(async () => {
    console.log('🔄 Force refreshing chats...');
    await fetchChats(true);
  }, [fetchChats]);

  // Optimized socket event handlers
  const handleNewMessage = useCallback((data) => {
    console.log('💬 New message received in HomeScreen:', data);
    
    // Add notification feedback
    Vibration.vibrate(100); // Short vibration
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === data.chatId || chat._id === data.chatId) {
          return {
            ...chat,
            lastMessage: data.message?.text || data.message || 'New message',
            timestamp: 'now',
            unreadCount: chat.unreadCount + 1
          };
        }
        return chat;
      });
      
      // Sort chats by latest message (most recent first)
      return updatedChats.sort((a, b) => {
        if (a.timestamp === 'now') return -1;
        if (b.timestamp === 'now') return 1;
        return 0;
      });
    });
  }, []);

  // Handle message sent from current user (to update timestamp immediately)
  const handleMessageSent = useCallback((data) => {
    console.log('📤 Message sent in HomeScreen:', data);
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === data.chatId || chat._id === data.chatId) {
          return {
            ...chat,
            lastMessage: data.message?.text || data.message || 'New message',
            timestamp: 'now',
            unreadCount: chat.unreadCount // Don't increment for own messages
          };
        }
        return chat;
      });
      
      // Sort chats by latest message (most recent first)
      return updatedChats.sort((a, b) => {
        if (a.timestamp === 'now') return -1;
        if (b.timestamp === 'now') return 1;
        return 0;
      });
    });
  }, []);

  // Handle chat read status (mark as read)
  const handleChatRead = useCallback((chatId) => {
    console.log('👁️ Chat marked as read:', chatId);
    
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === chatId || chat._id === chatId) {
          return {
            ...chat,
            unreadCount: 0
          };
        }
        return chat;
      });
    });
  }, []);

  const handleUserStatusChange = useCallback((data) => {
    console.log('👤 User status change in HomeScreen:', data);
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === data.userId || chat._id === data.userId) {
          return { ...chat, isOnline: data.isOnline };
        }
        return chat;
      });
    });
  }, []);

  // Handle typing indicators
  const handleTypingIndicator = useCallback((data) => {
    console.log('⌨️ Typing indicator in HomeScreen:', data);
    // You can add visual indicators here if needed
  }, []);

  // Handle chat updates (new chat created, etc.)
  const handleChatUpdate = useCallback((data) => {
    console.log('🔄 Chat update in HomeScreen:', data);
    if (data.type === 'new-chat') {
      // Add new chat to the list
      const newChat = {
        id: data.chat.id,
        _id: data.chat.id,
        name: data.chat.name,
        lastMessage: 'No messages yet',
        timestamp: 'Now',
        unreadCount: 0,
        isOnline: data.chat.participants?.some(p => p.isOnline) || false,
        avatar: null,
        isGroup: data.chat.isGroup || false,
        participants: data.chat.participants,
        type: data.chat.type
      };
      
      setChats(prevChats => [newChat, ...prevChats]);
    }
  }, []);

  useEffect(() => {
    // Initialize socket and fetch chats when component mounts
    const initializeApp = async () => {
      await initializeSocket();
      await fetchChats();
    };

    initializeApp();

    // Set up socket listeners with proper cleanup
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserStatusChange(handleUserStatusChange);
    socketService.onTypingIndicator(handleTypingIndicator);
    
    // Listen for chat updates
    if (socketService.socket) {
      socketService.socket.on('chat-update', handleChatUpdate);
      socketService.socket.on('message-sent', handleMessageSent); // Listen for sent messages
      socketService.socket.on('chat-read', handleChatRead); // Listen for chat read events
      
      // Listen for connection status changes
      socketService.socket.on('connect', () => {
        console.log('🔌 Socket connected in HomeScreen');
        // Refresh chats when socket reconnects
        forceRefreshChats();
      });
      
      socketService.socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected in HomeScreen');
      });
    }

    // Cleanup on unmount
    return () => {
      socketService.removeListener('new-message');
      socketService.removeListener('user-status-change');
      socketService.removeListener('typing-indicator');
      if (socketService.socket) {
        socketService.socket.off('chat-update', handleChatUpdate);
        socketService.socket.off('message-sent', handleMessageSent);
        socketService.socket.off('chat-read', handleChatRead);
        socketService.socket.off('connect');
        socketService.socket.off('disconnect');
      }
    };
  }, [initializeSocket, fetchChats, handleNewMessage, handleUserStatusChange, handleTypingIndicator, handleChatUpdate, handleMessageSent, handleChatRead, forceRefreshChats]);

  // Refresh chats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen focused - refreshing chats...');
      forceRefreshChats();
    }, [forceRefreshChats])
  );

  // New chat functionality
  const searchUsers = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiService.searchUsers(query.trim());
      
      if (response.success && response.users) {
        // Filter out current user and users already in chats
        const filteredUsers = response.users.filter(searchUser => {
          const isCurrentUser = searchUser.id === user?.id || searchUser._id === user?.id;
          const alreadyInChat = chats.some(chat => 
            chat.participants?.some(p => p.id === searchUser.id || p.id === searchUser._id)
          );
          return !isCurrentUser && !alreadyInChat;
        });
        
        setSearchResults(filteredUsers);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search users error:', error);
      Alert.alert('Error', 'Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getAllUsers = async () => {
    try {
      setIsSearching(true);
      // Use a broad search to get all users
      const response = await apiService.searchUsers('a');
      
      if (response.success && response.users) {
        // Filter out current user
        const filteredUsers = response.users.filter(searchUser => {
          const isCurrentUser = searchUser.id === user?.id || searchUser._id === user?.id;
          return !isCurrentUser;
        });
        
        setSearchResults(filteredUsers);
        setUserSearchQuery('All Users');
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Get all users error:', error);
      Alert.alert('Error', 'Failed to get users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startChatByUserId = async () => {
    if (!userSearchQuery.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    try {
      setIsLoading(true);
      // First get user info to validate the ID
      const userResponse = await apiService.getUserById(userSearchQuery.trim());
      
      if (userResponse.success && userResponse.data?.user) {
        const selectedUser = userResponse.data.user;
        await startNewChat(selectedUser);
      } else {
        Alert.alert('Error', 'User not found with this ID');
      }
    } catch (error) {
      console.error('Start chat by user ID error:', error);
      Alert.alert('Error', 'Failed to start chat. User ID may be invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async (selectedUser) => {
    try {
      setIsLoading(true);
      const response = await apiService.createIndividualChat(selectedUser.id || selectedUser._id);
      
      if (response.success && response.chat) {
        // Add new chat to the list
        const newChat = {
          id: response.chat.id,
          _id: response.chat.id,
          name: response.chat.name,
          lastMessage: 'No messages yet',
          timestamp: 'Now',
          unreadCount: 0,
          isOnline: selectedUser.isOnline || false,
          avatar: null,
          isGroup: false,
          participants: response.chat.participants,
          type: 'individual'
        };
        
        setChats(prevChats => [newChat, ...prevChats]);
        setShowNewChatModal(false);
        setUserSearchQuery('');
        setSearchResults([]);
        
        // Navigate to the new chat
        navigation.navigate('Chat', { chat: newChat });
      } else {
        Alert.alert('Error', response.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Start new chat error:', error);
      Alert.alert('Error', 'Failed to start new chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized chat item renderer
  const renderChatItem = useCallback(({ item }) => {
    const hasUnreadMessages = item.unreadCount > 0;
    
    return (
      <TouchableOpacity
        style={[
          customStyles.chatItem, 
          hasUnreadMessages && customStyles.chatItemUnread
        ]}
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
            <Text style={[
              customStyles.chatName,
              hasUnreadMessages && customStyles.chatNameUnread
            ]}>
              {item.name}
            </Text>
            <Text style={[
              customStyles.chatTime,
              item.timestamp === 'now' && customStyles.chatTimeNow
            ]}>
              {item.timestamp === 'now' ? 'now' : item.timestamp}
            </Text>
          </View>
          <View style={customStyles.chatFooter}>
            <Text style={[
              customStyles.chatMessage,
              hasUnreadMessages && customStyles.chatMessageUnread
            ]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {hasUnreadMessages && (
              <View style={[styles.badge, customStyles.unreadBadge]}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, styles.statusActive, styles.badge, styles.badgeText, navigation]);

  const renderUserSearchItem = ({ item }) => (
    <TouchableOpacity
      style={customStyles.userSearchItem}
      onPress={() => startNewChat(item)}
    >
      <View style={customStyles.userSearchAvatar}>
        <Text style={customStyles.userSearchAvatarText}>
          {item.name?.charAt(0) || '?'}
        </Text>
        {item.isOnline && <View style={styles.statusActive} />}
      </View>
      <View style={customStyles.userSearchContent}>
        <Text style={customStyles.userSearchName}>{item.name}</Text>
        <Text style={customStyles.userSearchStatus}>
          {item.isOnline ? 'Online' : 'Offline'}
        </Text>
        <Text style={customStyles.userSearchId}>
          ID: {item.id || item._id}
        </Text>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  const customStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingTop: 25, // Increased to shift header down
      paddingBottom: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      marginTop: 10, // Add margin to shift down from top
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    headerLeft: {
      flex: 1,
    },
    welcomeText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 3,
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },
    headerButton: {
      padding: 10,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    newChatButton: {
      backgroundColor: colors.primary,
      borderRadius: 25,
      width: 45,
      height: 45,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    searchContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.inputText,
      marginLeft: 12,
      fontWeight: '500',
    },
    chatItem: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    chatItemUnread: {
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.error, // Use error color (usually red) instead of primary
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
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
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
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
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
    chatNameUnread: {
      fontWeight: '700',
      color: colors.text,
    },
    chatTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chatTimeNow: {
      color: colors.error, // Use error color instead of primary for "now" timestamp
      fontWeight: 'bold',
    },
    chatMessage: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 10,
    },
    chatMessageUnread: {
      fontWeight: 'bold',
      color: colors.text,
    },
    chatFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    
    // New chat modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 5,
    },
    userSearchInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.inputText,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginBottom: 20,
    },
    userSearchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userSearchAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      position: 'relative',
    },
    userSearchAvatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    userSearchContent: {
      flex: 1,
    },
    userSearchName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    userSearchStatus: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    userSearchId: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    noResultsText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 20,
    },
    newChatButton: {
      backgroundColor: colors.primary,
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 15,
    },
    viewAllUsersButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'center',
      marginTop: 10,
    },
    viewAllUsersButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    userIdContainer: {
      marginTop: 20,
    },
    userIdLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    userIdInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    userIdInput: {
      flex: 1,
      fontSize: 16,
      color: colors.inputText,
      marginRight: 10,
    },
    userIdButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    userIdButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    instructions: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 15,
      textAlign: 'center',
    },
    unreadBadge: {
      backgroundColor: colors.primary,
    },
    notificationIndicator: {
      backgroundColor: colors.error,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
    },
    notificationText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
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
          <View style={customStyles.headerLeft}>
            <Text style={customStyles.headerTitle}>Home</Text>
            {user && (
              <Text style={customStyles.welcomeText}>
                Welcome back, {user.name || user.email || 'User'}!
              </Text>
            )}
          </View>
          <View style={customStyles.headerActions}>
            
            {/* Settings Button */}
            <TouchableOpacity
              style={customStyles.headerButton}
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel="Settings"
              accessibilityHint="Opens app settings and preferences"
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {/* Refresh Button */}
            <TouchableOpacity
              style={customStyles.headerButton}
              onPress={forceRefreshChats}
              disabled={isLoading}
              accessibilityLabel="Refresh chats"
              accessibilityHint="Manually refreshes the chat list"
            >
              <Ionicons 
                name={isLoading ? "hourglass" : "refresh"} 
                size={22} 
                color={isLoading ? colors.textSecondary : colors.primary} 
              />
            </TouchableOpacity>
            
            {/* Notification Indicator */}
            {totalUnreadCount > 0 && (
              <View style={customStyles.notificationIndicator}>
                <Text style={customStyles.notificationText}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
            
            {/* New Chat Button */}
            <TouchableOpacity
              style={customStyles.newChatButton}
              onPress={() => setShowNewChatModal(true)}
              accessibilityLabel="New chat"
              accessibilityHint="Opens dialog to start a new chat with users"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
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

      {/* Loading indicator for initial load */}
      {isLoading && chats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.caption}>Loading chats...</Text>
        </View>
      ) : (
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
              progressBackgroundColor={colors.surface}
            />
          }
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={15}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 80, // Height of chat item
            offset: 80 * index,
            index,
          })}
          // Better update handling
          extraData={chats.length} // Re-render when chat count changes
          onEndReachedThreshold={0.1}
          // Smooth scrolling
          scrollEventThrottle={16}
          decelerationRate="fast"
        />
      )}

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={customStyles.modalOverlay}>
          <View style={customStyles.modalContent}>
            <View style={customStyles.modalHeader}>
              <Text style={customStyles.modalTitle}>New Chat</Text>
              <TouchableOpacity
                style={customStyles.closeButton}
                onPress={() => {
                  setShowNewChatModal(false);
                  setUserSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <Text style={customStyles.instructions}>
              Search for users by name, view all users, or enter a user ID directly to start a new chat.
            </Text>

            <TextInput
              style={customStyles.userSearchInput}
              placeholder="Search users by name..."
              placeholderTextColor={colors.placeholder}
              value={userSearchQuery}
              onChangeText={(text) => {
                setUserSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
            />

            {/* View All Users Button */}
            <TouchableOpacity
              style={customStyles.viewAllUsersButton}
              onPress={getAllUsers}
            >
              <Text style={customStyles.viewAllUsersButtonText}>View All Users</Text>
            </TouchableOpacity>

            {/* Direct User ID Input */}
            <View style={customStyles.userIdContainer}>
              <Text style={customStyles.userIdLabel}>Or enter user ID directly:</Text>
              <View style={customStyles.userIdInputRow}>
                <TextInput
                  style={customStyles.userIdInput}
                  placeholder="Enter user ID..."
                  placeholderTextColor={colors.placeholder}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                />
                <TouchableOpacity
                  style={customStyles.userIdButton}
                  onPress={startChatByUserId}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={customStyles.userIdButtonText}>Start Chat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isSearching ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderUserSearchItem}
                keyExtractor={(item) => item.id || item._id}
                showsVerticalScrollIndicator={false}
              />
            ) : userSearchQuery.length >= 2 ? (
              <Text style={customStyles.noResultsText}>No users found</Text>
            ) : (
              <Text style={customStyles.noResultsText}>Type at least 2 characters to search</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;