import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.142.196.200:3000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    // Load token on initialization
    this.loadTokens();
  }

  // Set auth token
  setToken(token) {
    this.token = token;
  }

  // Get auth headers
  async getHeaders() {
    // Always get fresh token from AsyncStorage
    const token = await AsyncStorage.getItem('authToken') || this.token;
    
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      this.token = token; // Update instance token
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: await this.getHeaders(), // Make this async to get fresh token
        ...options,
      };

      console.log(`🌐 Making request to: ${url}`);
      console.log(`🔑 Using token: ${this.token ? 'Present' : 'Missing'}`);

      const response = await fetch(url, config);
      const data = await response.json();

      console.log(`📥 Response from ${endpoint}:`, data);

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ API Request Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication APIs
  async signup(userData) {
    try {
      const response = await this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      return {
        success: true,
        token: response.token,
        user: response.user || response.data?.user,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async login(credentials) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Save token automatically after successful login
      if (response.token) {
        await this.saveTokens(response.token, response.refreshToken);
      }

      return {
        success: true,
        token: response.token,
        user: response.user || response.data?.user,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
      
      await this.clearTokens();
      
      return { success: true };
    } catch (error) {
      // Clear tokens even if logout request fails
      await this.clearTokens();
      return { success: false, error: error.message };
    }
  }

  async refreshToken(refreshToken) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // User APIs
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadProfilePhoto(formData) {
    const url = `${this.baseURL}/users/profile-photo`;
    const headers = await this.getHeaders();
    delete headers['Content-Type']; // Let browser set this for FormData
    
    const config = {
      method: 'POST',
      headers,
      body: formData,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }

  async deleteProfilePhoto() {
    return this.request('/users/profile-photo', {
      method: 'DELETE',
    });
  }

  async searchUsers(query) {
    try {
      const response = await this.request(`/users/search?q=${encodeURIComponent(query)}`);
      return {
        success: response.success || true,
        users: response.data?.users || response.users || [],
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        users: [],
        message: error.message,
      };
    }
  }

  async getOnlineUsers() {
    return this.request('/users/online');
  }

  async getUserById(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateOnlineStatus(isOnline) {
    return this.request('/users/online-status', {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    });
  }

  async deleteAccount() {
    return this.request('/users/account', {
      method: 'DELETE',
    });
  }

  // Chat APIs - FIXED to handle your backend response structure
  async getChats() {
    try {
      const response = await this.request('/chats');
      
      // Handle your backend's response structure: { success: true, data: { chats: [...] } }
      return {
        success: response.success || true,
        chats: response.data?.chats || response.chats || [],
        message: response.message,
      };
    } catch (error) {
      console.error('Get chats error:', error);
      return {
        success: false,
        chats: [],
        message: error.message,
      };
    }
  }

  async createIndividualChat(participantId) {
    try {
      const response = await this.request('/chats/individual', {
        method: 'POST',
        body: JSON.stringify({ participantId }),
      });

      return {
        success: response.success || true,
        chat: response.data?.chat || response.chat,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createGroupChat(groupData) {
    try {
      const response = await this.request('/chats/group', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });

      return {
        success: response.success || true,
        chat: response.data?.chat || response.chat,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getChatById(chatId) {
    try {
      const response = await this.request(`/chats/${chatId}`);
      
      return {
        success: response.success || true,
        chat: response.data?.chat || response.chat,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateGroupChat(chatId, updateData) {
    return this.request(`/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async addParticipantsToGroup(chatId, participants) {
    return this.request(`/chats/${chatId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ participants }),
    });
  }

  async removeParticipantFromGroup(chatId, participantId) {
    return this.request(`/chats/${chatId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  async leaveChat(chatId) {
    return this.request(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Message APIs
  async getMessages(chatId, page = 1, limit = 50) {
    try {
      const response = await this.request(`/messages/${chatId}?page=${page}&limit=${limit}`);
      
      return {
        success: response.success || true,
        messages: response.data?.messages || response.messages || [],
        pagination: response.data?.pagination || response.pagination,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        message: error.message,
      };
    }
  }

  async sendMessage(chatId, messageData) {
    return this.request(`/messages/${chatId}`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async uploadMediaMessage(chatId, formData) {
    const url = `${this.baseURL}/messages/${chatId}/upload`;
    const headers = await this.getHeaders();
    delete headers['Content-Type']; // Let browser set this for FormData
    
    const config = {
      method: 'POST',
      headers,
      body: formData,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }

  async editMessage(messageId, content) {
    return this.request(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId) {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async addReaction(messageId, emoji) {
    return this.request(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId) {
    return this.request(`/messages/${messageId}/reactions`, {
      method: 'DELETE',
    });
  }

  // Storage helpers - FIXED to use 'authToken' key consistently
  async saveTokens(token, refreshToken) {
    try {
      await AsyncStorage.setItem('authToken', token); // Use same key as your login screen
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      this.setToken(token);
      console.log('✅ Tokens saved successfully');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  async loadTokens() {
    try {
      const token = await AsyncStorage.getItem('authToken'); // Use same key
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (token) {
        this.setToken(token);
        console.log('✅ Token loaded from storage');
      } else {
        console.log('⚠️ No token found in storage');
      }
      
      return { token, refreshToken };
    } catch (error) {
      console.error('❌ Error loading tokens:', error);
      return { token: null, refreshToken: null };
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.removeItem('authToken'); // Use same key
      await AsyncStorage.removeItem('refreshToken');
      this.token = null;
      console.log('✅ Tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Debug method
  async getDebugInfo() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      baseURL: this.baseURL,
      currentToken: !!this.token,
    };
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;