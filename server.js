const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://10.142.196.200:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: ["http://10.142.196.200:3000","http://localhost:3000"],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/chats', authenticateToken, chatRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ChatApp Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      connectedUsers.set(decoded.userId, socket.id);
      socket.userId = decoded.userId;
      console.log('✅ User authenticated:', decoded.userId);
    } catch (error) {
      console.log('❌ Authentication failed for socket:', socket.id);
    }
  });

  // Handle joining a chat room
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`👥 User ${socket.userId} joined chat: ${chatId}`);
  });

  // Handle leaving a chat room
  socket.on('leave-chat', (chatId) => {
    socket.leave(chatId);
    console.log(`👋 User ${socket.userId} left chat: ${chatId}`);
  });

  // Handle new message
  socket.on('send-message', (data) => {
    const { chatId, message } = data;
    socket.to(chatId).emit('new-message', {
      chatId,
      message,
      sender: socket.userId,
      timestamp: new Date()
    });
    console.log(`💬 Message sent in chat ${chatId} by user ${socket.userId}`);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    socket.to(chatId).emit('user-typing', {
      chatId,
      userId: socket.userId,
      isTyping
    });
  });

  // Handle user online status
  socket.on('user-online', () => {
    socket.broadcast.emit('user-status-change', {
      userId: socket.userId,
      status: 'online'
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      socket.broadcast.emit('user-status-change', {
        userId: socket.userId,
        status: 'offline'
      });
      console.log('🔌 User disconnected:', socket.userId);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://10.142.196.200:3000'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close();
  });
});

module.exports = { app, io, connectedUsers };

