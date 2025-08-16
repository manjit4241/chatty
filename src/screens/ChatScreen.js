import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createGlobalStyles } from '../styles/globalStyles';
import apiService from '../services/api';
import socketService from '../services/socket';

// Mock messages data for testing
const mockMessages = [
  {
    id: '1',
    _id: '1',
    text: 'Hey Alex! How\'s it going?',
    content: 'Hey Alex! How\'s it going?',
    sender: 'user',
    timestamp: '10:30 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '2',
    _id: '2',
    text: 'Great! You?',
    content: 'Great! You?',
    sender: 'other',
    timestamp: '10:31 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '3',
    _id: '3',
    text: 'Good! I just wanted to say good job on the design!',
    content: 'Good! I just wanted to say good job on the design!',
    sender: 'user',
    timestamp: '10:32 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '4',
    _id: '4',
    text: 'Thanks!',
    content: 'Thanks!',
    sender: 'other',
    timestamp: '10:33 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '5',
    _id: '5',
    text: 'Glad you like it!',
    content: 'Glad you like it!',
    sender: 'other',
    timestamp: '10:34 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '6',
    _id: '6',
    text: 'Have a great weekend!',
    content: 'Have a great weekend!',
    sender: 'user',
    timestamp: '10:35 AM',
    createdAt: new Date().toISOString(),
    type: 'text',
  },
  {
    id: '7',
    _id: '7',
    text: '00:16',
    content: '00:16',
    sender: 'user',
    timestamp: '10:36 AM',
    createdAt: new Date().toISOString(),
    type: 'audio',
  },
];

const ChatScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createGlobalStyles(colors);
  const flatListRef = useRef(null);
  
  // Safely destructure route params with fallback
  const chat = route?.params?.chat || { _id: '', name: 'Unknown', isOnline: false };
  
  const [messages, setMessages] = useState(mockMessages); // Start with mock data for testing
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch messages when component mounts
  useEffect(() => {
    if (chat._id) {
      fetchMessages();
      joinChatRoom();
      
      // Listen for new messages
      const messageHandler = (message) => {
        if (message.chatId === chat._id) {
          setMessages(prev => [...prev, message]);
        }
      };

      // Listen for typing indicators
      const typingStartHandler = (data) => {
        if (data.chatId === chat._id && data.userId !== user?._id) {
          setIsTyping(true);
        }
      };

      const typingStopHandler = (data) => {
        if (data.chatId === chat._id && data.userId !== user?._id) {
          setIsTyping(false);
        }
      };

      socketService.onMessageReceived(messageHandler);
      socketService.onTypingStarted(typingStartHandler);
      socketService.onTypingStopped(typingStopHandler);

      return () => {
        if (chat._id) {
          socketService.leaveChatRoom(chat._id);
        }
        socketService.offMessageReceived();
        socketService.offTypingStarted();
        socketService.offTypingStopped();
      };
    }
  }, [chat._id, user?._id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!chat._id) {
      Alert.alert('Error', 'Invalid chat ID');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.getMessages(chat._id);
      
      if (response?.success) {
        setMessages(response.messages || []);
      } else {
        Alert.alert('Error', response?.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinChatRoom = () => {
    if (chat._id) {
      socketService.joinChatRoom(chat._id);
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !chat._id) return;

    try {
      const response = await apiService.sendMessage(chat._id, trimmedMessage);
      
      if (response?.success) {
        setNewMessage('');
        // Message will be added via socket event
      } else {
        Alert.alert('Error', response?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (timestamp) => {
    try {
      if (!timestamp) return '';
      // Handle both timestamp formats
      if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
        return timestamp;
      }
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatDate = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderMessage = ({ item, index }) => {
    if (!item) return null;
    
    const isUser = item.sender === 'user' || item.sender === user?._id;
    const showDate = index === 0 || 
      (messages[index - 1]?.createdAt && item.createdAt &&
       new Date(messages[index - 1].createdAt).toDateString() !== 
       new Date(item.createdAt).toDateString());

    return (
      <View>
        {showDate && item.createdAt && (
          <View style={customStyles.dateContainer}>
            <Text style={customStyles.dateText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        )}
        
        <View style={[
          customStyles.messageContainer,
          isUser ? customStyles.userMessageContainer : customStyles.otherMessageContainer
        ]}>
          <View style={[
            customStyles.messageBubble,
            isUser ? customStyles.userMessageBubble : customStyles.otherMessageBubble
          ]}>
            {item.type === 'audio' ? (
              <View style={customStyles.audioMessage}>
                <Ionicons name="play" size={20} color={isUser ? '#FFFFFF' : colors?.text || '#000'} />
                <View style={customStyles.audioWaveform}>
                  <View style={[customStyles.audioBar, { height: 8 }]} />
                  <View style={[customStyles.audioBar, { height: 12 }]} />
                  <View style={[customStyles.audioBar, { height: 6 }]} />
                  <View style={[customStyles.audioBar, { height: 10 }]} />
                  <View style={[customStyles.audioBar, { height: 8 }]} />
                </View>
                <Text style={[
                  customStyles.audioDuration,
                  { color: isUser ? '#FFFFFF' : colors?.textSecondary || '#666' }
                ]}>
                  {item.content || item.text || '00:00'}
                </Text>
              </View>
            ) : (
              <Text style={[
                customStyles.messageText,
                { color: isUser ? '#FFFFFF' : colors?.text || '#000' }
              ]}>
                {item.content || item.text || ''}
              </Text>
            )}
          </View>
          <Text style={customStyles.messageTime}>
            {formatTime(item.createdAt || item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const customStyles = {
    container: {
      flex: 1,
      backgroundColor: colors?.background || '#fff',
    },
    header: {
      backgroundColor: colors?.surface || '#f5f5f5',
      paddingTop: 50,
      paddingBottom: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors?.border || '#e0e0e0',
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 15,
    },
    headerInfo: {
      flex: 1,
      alignItems: 'center',
    },
    headerName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors?.text || '#000',
    },
    headerStatus: {
      fontSize: 14,
      color: colors?.textSecondary || '#666',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      marginLeft: 15,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors?.primary || '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    dateContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    dateText: {
      fontSize: 14,
      color: colors?.textSecondary || '#666',
      backgroundColor: colors?.surface || '#f5f5f5',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    messageContainer: {
      marginVertical: 8,
      maxWidth: '80%',
    },
    userMessageContainer: {
      alignSelf: 'flex-end',
    },
    otherMessageContainer: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      marginBottom: 4,
    },
    userMessageBubble: {
      backgroundColor: colors?.primary || '#007AFF',
      borderBottomRightRadius: 8,
      shadowColor: colors?.primary || '#007AFF',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    otherMessageBubble: {
      backgroundColor: colors?.card || '#f0f0f0',
      borderBottomLeftRadius: 8,
      shadowColor: colors?.shadow || '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    messageTime: {
      fontSize: 12,
      color: colors?.textSecondary || '#666',
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    audioMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 120,
    },
    audioWaveform: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginHorizontal: 8,
      height: 20,
    },
    audioBar: {
      width: 3,
      backgroundColor: 'currentColor',
      marginHorizontal: 1,
      borderRadius: 2,
    },
    audioDuration: {
      fontSize: 14,
      fontWeight: '500',
    },
    inputContainer: {
      backgroundColor: colors?.surface || '#f5f5f5',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: colors?.border || '#e0e0e0',
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors?.shadow || '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors?.inputBackground || '#fff',
      borderRadius: 25,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors?.inputText || '#000',
      marginRight: 10,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors?.inputBorder || '#e0e0e0',
    },
    inputButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors?.primary || '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 5,
      shadowColor: colors?.primary || '#007AFF',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    attachmentButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors?.inputBackground || '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 5,
      borderWidth: 1,
      borderColor: colors?.inputBorder || '#e0e0e0',
    },
  };

  // Early return if essential data is missing
  if (!chat || !user) {
    return (
      <SafeAreaView style={customStyles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={customStyles.container}>
      <StatusBar
        barStyle={colors?.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors?.surface || '#f5f5f5'}
      />
      
      <View style={customStyles.header}>
        <TouchableOpacity
          style={customStyles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors?.text || '#000'} />
        </TouchableOpacity>
        
        <View style={customStyles.avatar}>
          <Text style={customStyles.avatarText}>
            {(chat.name || 'U').charAt(0).toUpperCase()}
          </Text>
          {chat.isOnline && (
            <View style={[
              styles?.statusActive || { 
                width: 12, 
                height: 12, 
                borderRadius: 6, 
                backgroundColor: '#4CAF50', 
                borderWidth: 2, 
                borderColor: '#fff' 
              }, 
              { position: 'absolute', bottom: 0, right: 0 }
            ]} />
          )}
        </View>
        
        <View style={customStyles.headerInfo}>
          <Text style={customStyles.headerName}>{chat.name || 'Unknown'}</Text>
          <Text style={customStyles.headerStatus}>
            {isTyping ? 'Typing...' : (chat.isOnline ? 'Active now' : 'Last seen recently')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            style={customStyles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />
        )}

        <View style={customStyles.inputContainer}>
          <TouchableOpacity style={customStyles.attachmentButton}>
            <Ionicons name="attach" size={20} color={colors?.textSecondary || '#666'} />
          </TouchableOpacity>
          
          <TextInput
            style={customStyles.input}
            placeholder="Type here..."
            placeholderTextColor={colors?.placeholder || '#999'}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[
              customStyles.inputButton,
              { 
                backgroundColor: newMessage.trim() 
                  ? (colors?.primary || '#007AFF') 
                  : (colors?.textSecondary || '#999')
              }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;