// socket.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
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

      // Connect to backend
      this.socket = io('http://10.142.196.200:3000', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        auth: { token }, // send token during handshake
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error.message);
        this.isConnected = false;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
        this.isConnected = true;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('🔌 Socket reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('🔌 Socket reconnection failed');
      });

    } catch (error) {
      console.error('🔌 Socket connection error:', error);
    }
  }

  // Reconnect with fresh token (call this after login)
  async reconnectWithToken() {
    console.log('🔄 Reconnecting socket with fresh token...');
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    await this.connect();
  }

  // Disconnect from Socket.IO server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Join a chat room
  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-chat', chatId);
      console.log('👥 Joined chat:', chatId);
    }
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
    }
  }

  // Send typing indicator
  sendTyping(chatId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        chatId,
        isTyping
      });
    }
  }

  // Update online status
  updateOnlineStatus() {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-online');
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', (data) => {
        console.log('💬 New message received:', data);
        callback(data);
      });
      this.listeners.set('new-message', callback);
    }
  }

  // Listen for typing indicators
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', (data) => {
        console.log('⌨️ User typing:', data);
        callback(data);
      });
      this.listeners.set('user-typing', callback);
    }
  }

  // Listen for user status changes
  onUserStatusChange(callback) {
    if (this.socket) {
      this.socket.on('user-status-change', (data) => {
        console.log('👤 User status change:', data);
        callback(data);
      });
      this.listeners.set('user-status-change', callback);
    }
  }

  // Remove event listeners
  removeListener(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event);
      });
      this.listeners.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id
    };
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;