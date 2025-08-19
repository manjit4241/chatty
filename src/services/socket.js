// socket.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5
    this.reconnectDelay = 2000; // Increased from 1000
    this.reconnectTimer = null;
    this.typingTimers = new Map(); // Track typing timers
  }

  // Connect to Socket.IO server
  async connect() {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      // Get the auth token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('❌ No auth token found for socket connection.');
        return;
      }

      console.log('🔌 Attempting to connect socket with token...');

      // Connect to backend with optimized settings
      this.socket = io('https://chat-api-63ow.onrender.com', {
        transports: ['websocket'], // Remove polling for better performance
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        auth: { token },
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        // Authenticate the socket with the token
        if (token) {
          this.socket.emit('authenticate', token);
          console.log('🔐 Socket authenticated with token');
        }
      });

      // Authentication success handler
      this.socket.on('authenticated', (data) => {
        console.log('✅ Socket authentication successful:', data);
        this.socket.userId = data.userId;
      });

      // Authentication error handler
      this.socket.on('authentication-error', (error) => {
        console.error('❌ Socket authentication failed:', error);
        this.socket.userId = null;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.isConnected = false;
        
        // Only attempt reconnect for unexpected disconnections
        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error.message);
        this.isConnected = false;
        
        // Schedule reconnection with exponential backoff
        this.scheduleReconnect();
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('🔌 Socket reconnection error:', error);
        this.reconnectAttempts++;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('🔌 Socket reconnection failed');
        this.reconnectAttempts = 0;
      });

    } catch (error) {
      console.error('🔌 Socket connection error:', error);
    }
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      this.reconnectTimer = setTimeout(() => {
        if (!this.isConnected) {
          console.log('🔄 Attempting to reconnect...');
          this.connect();
        }
      }, delay);
    }
  }

  // Reconnect with fresh token (call this after login)
  async reconnectWithToken() {
    console.log('🔄 Reconnecting socket with fresh token...');
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.connect();
  }

  // Manually authenticate the socket
  async authenticate() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token && this.socket && this.isConnected) {
        this.socket.emit('authenticate', token);
        console.log('🔐 Manual authentication sent');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Manual authentication error:', error);
      return false;
    }
  }

  // Disconnect from Socket.IO server
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
    
    // Clear all typing timers
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
  }

  // Check if socket is ready
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Join a chat room
  joinChat(chatId) {
    if (this.isSocketConnected()) {
      this.socket.emit('join-chat', chatId);
      console.log('👥 Joined chat:', chatId);
    } else {
      console.log('⚠️ Socket not ready, attempting to reconnect...');
      this.reconnectWithToken();
    }
  }

  // Force reconnection
  async forceReconnect() {
    console.log('🔄 Force reconnecting socket...');
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.connect();
  }

  // Leave a chat room
  leaveChat(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-chat', chatId);
      console.log('👋 Left chat:', chatId);
    }
  }

  // Send a message
  sendMessage(chatId, message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send-message', {
        chatId,
        message
      });
      
      // Emit message-sent event for immediate UI update
      this.socket.emit('message-sent', {
        chatId,
        message
      });
    }
  }

  // Optimized typing indicator with debouncing
  sendTyping(chatId, isTyping) {
    if (!this.socket || !this.isConnected) return;

    // Clear existing timer for this chat
    if (this.typingTimers.has(chatId)) {
      clearTimeout(this.typingTimers.get(chatId));
    }

    if (isTyping) {
      // Send typing indicator immediately
      this.socket.emit('typing', { chatId, isTyping: true });
      
      // Set timer to stop typing after 3 seconds of inactivity
      const timer = setTimeout(() => {
        this.socket.emit('typing', { chatId, isTyping: false });
        this.typingTimers.delete(chatId);
      }, 3000);
      
      this.typingTimers.set(chatId, timer);
    } else {
      // Stop typing immediately
      this.socket.emit('typing', { chatId, isTyping: false });
      this.typingTimers.delete(chatId);
    }
  }

  // Update online status
  updateOnlineStatus() {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-online');
    }
  }

  // Listen for new messages with optimized handling
  onNewMessage(callback) {
    if (this.socket) {
      // Remove existing listener if any
      this.socket.off('new-message');
      
      this.socket.on('new-message', (data) => {
        console.log('💬 New message received:', data);
        callback(data);
      });
      this.listeners.set('new-message', callback);
    }
  }

  // Listen for user status changes with optimized handling
  onUserStatusChange(callback) {
    if (this.socket) {
      // Remove existing listener if any
      this.socket.off('user-status-change');
      
      this.socket.on('user-status-change', (data) => {
        console.log('👤 User status change:', data);
        callback(data);
      });
      this.listeners.set('user-status-change', callback);
    }
  }

  // Listen for typing indicators with optimized handling
  onTypingIndicator(callback) {
    if (this.socket) {
      // Remove existing listener if any
      this.socket.off('typing-indicator');
      
      this.socket.on('typing-indicator', (data) => {
        console.log('⌨️ Typing indicator:', data);
        callback(data);
      });
      this.listeners.set('typing-indicator', callback);
    }
  }

  // Listen for user typing (alias for onTypingIndicator for compatibility)
  onUserTyping(callback) {
    this.onTypingIndicator(callback);
  }

  // Remove specific event listener
  removeListener(eventName) {
    if (this.socket) {
      this.socket.off(eventName);
      this.listeners.delete(eventName);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
  }
}

// Create and export a single instance
const socketService = new SocketService();
export default socketService;