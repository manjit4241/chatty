# ChatApp Backend

A complete backend API for the ChatApp with real-time messaging, user authentication, and file upload capabilities.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - User registration and login
  - Secure password hashing with bcrypt
  - Token refresh mechanism

- **Real-time Messaging**
  - Socket.IO integration for real-time communication
  - Individual and group chats
  - Message types: text, image, audio, video, file, location
  - Message reactions and replies
  - Read receipts and delivery status
  - Typing indicators

- **User Management**
  - User profiles with customizable information
  - Profile photo upload with Cloudinary
  - Online/offline status tracking
  - User search functionality
  - Account management

- **Chat Management**
  - Create individual and group chats
  - Add/remove participants from groups
  - Group admin controls
  - Chat settings and permissions
  - Unread message counts

- **File Upload**
  - Cloudinary integration for media storage
  - Support for images, videos, audio, and documents
  - Automatic file optimization
  - Secure file deletion

- **Security**
  - Input validation and sanitization
  - Rate limiting
  - CORS configuration
  - Helmet security headers
  - Error handling

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Upload**: Multer + Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet, bcryptjs
- **Rate Limiting**: Express-rate-limit

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/chatapp

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=30d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/signup`
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication)

#### POST `/api/auth/refresh`
Refresh access token
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### GET `/api/auth/me`
Get current user profile (requires authentication)

### User Endpoints

#### GET `/api/users/profile`
Get current user's profile (requires authentication)

#### PUT `/api/users/profile`
Update user profile (requires authentication)
```json
{
  "name": "John Doe",
  "bio": "Software Developer",
  "phoneNumber": "+1234567890",
  "location": "New York"
}
```

#### POST `/api/users/profile-photo`
Upload profile photo (requires authentication)
- Content-Type: multipart/form-data
- Field: profilePhoto

#### DELETE `/api/users/profile-photo`
Remove profile photo (requires authentication)

#### GET `/api/users/search?q=searchterm`
Search users (requires authentication)

#### GET `/api/users/online`
Get online users (requires authentication)

#### GET `/api/users/:userId`
Get user by ID (requires authentication)

### Chat Endpoints

#### GET `/api/chats`
Get user's chats (requires authentication)

#### POST `/api/chats/individual`
Create or get individual chat (requires authentication)
```json
{
  "participantId": "user-id"
}
```

#### POST `/api/chats/group`
Create group chat (requires authentication)
```json
{
  "name": "Team Chat",
  "participants": ["user-id-1", "user-id-2"],
  "description": "Team discussion group"
}
```

#### GET `/api/chats/:chatId`
Get chat by ID (requires authentication)

#### PUT `/api/chats/:chatId`
Update group chat (requires authentication)
```json
{
  "name": "Updated Group Name",
  "description": "Updated description"
}
```

#### POST `/api/chats/:chatId/participants`
Add participants to group (requires authentication)
```json
{
  "participants": ["user-id-1", "user-id-2"]
}
```

#### DELETE `/api/chats/:chatId/participants/:participantId`
Remove participant from group (requires authentication)

#### DELETE `/api/chats/:chatId`
Leave chat (requires authentication)

### Message Endpoints

#### GET `/api/messages/:chatId?page=1&limit=50`
Get messages for a chat (requires authentication)

#### POST `/api/messages/:chatId`
Send a message (requires authentication)
```json
{
  "content": "Hello!",
  "type": "text",
  "replyTo": "message-id" // optional
}
```

#### POST `/api/messages/:chatId/upload`
Upload media message (requires authentication)
- Content-Type: multipart/form-data
- Field: file

#### PUT `/api/messages/:messageId`
Edit a message (requires authentication)
```json
{
  "content": "Updated message"
}
```

#### DELETE `/api/messages/:messageId`
Delete a message (requires authentication)

#### POST `/api/messages/:messageId/reactions`
Add reaction to message (requires authentication)
```json
{
  "emoji": "👍"
}
```

#### DELETE `/api/messages/:messageId/reactions`
Remove reaction from message (requires authentication)

## 🔌 Socket.IO Events

### Client to Server

- `authenticate` - Authenticate socket connection with JWT token
- `join-chat` - Join a chat room
- `leave-chat` - Leave a chat room
- `send-message` - Send a message
- `typing` - Send typing indicator
- `user-online` - Update online status

### Server to Client

- `new-message` - New message received
- `user-typing` - User typing indicator
- `user-status-change` - User online/offline status change

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Prevent abuse with request limits
- **CORS**: Configured for frontend access
- **Helmet**: Security headers
- **File Upload Security**: File type and size validation

## 📁 Project Structure

```
backend/
├── models/           # Database models
│   ├── User.js
│   ├── Chat.js
│   └── Message.js
├── routes/           # API routes
│   ├── auth.js
│   ├── users.js
│   ├── chats.js
│   └── messages.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   └── upload.js
├── server.js         # Main server file
├── package.json
├── env.example
└── README.md
```

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
JWT_SECRET=your-production-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=https://yourdomain.com
```

### Build and Deploy

1. **Install dependencies**
   ```bash
   npm install --production
   ```

2. **Start the server**
   ```bash
   npm start
   ```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Ensure network access to MongoDB

2. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

3. **File Upload Errors**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper file types

4. **Socket.IO Connection Issues**
   - Check CORS configuration
   - Verify frontend URL
   - Ensure proper authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🔄 Updates

- **v1.0.0**: Initial release with basic chat functionality
- **v1.1.0**: Added file upload and media messages
- **v1.2.0**: Added message reactions and replies
- **v1.3.0**: Enhanced security and performance

