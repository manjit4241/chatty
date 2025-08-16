# ChatApp - React Native Expo Chat Application

A beautiful and modern chat application built with React Native and Expo, featuring dark/light theme support, real-time messaging, and a responsive UI.

## Features

- 🔐 **Authentication**: Login and signup with email and password
- 💬 **Real-time Chat**: Send and receive messages with beautiful chat bubbles
- 🌙 **Dark/Light Theme**: Smooth theme switching with system preference detection
- 👥 **Group Chats**: Create and manage group conversations
- 🔍 **Search**: Find contacts and chats easily
- 📱 **Responsive Design**: Works perfectly on all phone sizes
- 🎨 **Modern UI**: Clean, aesthetic design with smooth animations
- 📸 **Profile Management**: Edit profile photos and settings
- 🔔 **Status Indicators**: Online/offline status for contacts

## Screenshots

The app includes the following screens:
- **Login/Signup**: Beautiful authentication screens
- **Home**: Chat list with status stories and recent conversations
- **Chat**: Real-time messaging with message bubbles and audio support
- **Settings**: Profile management, theme toggle, and app settings
- **Create Group**: Group creation with member selection
- **Search**: Contact search functionality

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **React Navigation**: Navigation between screens
- **Expo Vector Icons**: Beautiful icons throughout the app
- **Expo Image Picker**: Profile photo selection
- **Context API**: State management for theme and authentication

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChatApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your device**
   - Install Expo Go on your mobile device
   - Scan the QR code displayed in the terminal
   - The app will load on your device

## Project Structure

```
ChatApp/
├── src/
│   ├── components/          # Reusable components
│   ├── context/            # Context providers (Theme, Auth)
│   ├── screens/            # App screens
│   ├── styles/             # Global styles and themes
│   └── utils/              # Utility functions
├── assets/                 # Images and static assets
├── App.js                  # Main app component
├── app.json               # Expo configuration
└── package.json           # Dependencies
```

## Key Features Implementation

### Theme System
- Automatic dark/light mode detection
- Smooth theme transitions
- Consistent color scheme across all screens
- System preference integration

### Authentication
- Mock authentication system (ready for backend integration)
- Form validation
- Loading states
- Error handling

### Chat Interface
- Message bubbles with different styles for sender/receiver
- Audio message support
- Timestamp display
- Online status indicators
- Unread message badges

### Responsive Design
- Flexible layouts that adapt to different screen sizes
- Proper spacing and typography
- Touch-friendly interface elements

## Customization

### Colors and Themes
Edit `src/context/ThemeContext.js` to customize the color scheme:

```javascript
const theme = {
  colors: {
    primary: '#8B5CF6',      // Main brand color
    secondary: '#A78BFA',    // Secondary color
    background: '#1A1A1A',   // Background color
    // ... more colors
  }
};
```

### Mock Data
Update the mock data in each screen to customize the content:
- `HomeScreen.js`: Chat list and status data
- `ChatScreen.js`: Message history
- `SearchScreen.js`: Contact list
- `CreateGroupScreen.js`: Group members

## Backend Integration

To integrate with a real backend:

1. **Authentication**: Replace mock auth in `AuthContext.js`
2. **Real-time Messaging**: Integrate WebSocket or Firebase
3. **File Upload**: Add image/audio upload functionality
4. **Push Notifications**: Implement notification system

## Building for Production

1. **Configure app.json** with your app details
2. **Build for Android**:
   ```bash
   expo build:android
   ```
3. **Build for iOS**:
   ```bash
   expo build:ios
   ```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `expo start -c`
2. **Navigation errors**: Ensure all dependencies are installed
3. **Theme not working**: Check ThemeProvider is wrapping the app
4. **Icons not showing**: Verify @expo/vector-icons is installed

### Development Tips

- Use Expo DevTools for debugging
- Enable hot reload for faster development
- Test on both iOS and Android devices
- Use React Native Debugger for advanced debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the Expo documentation
- Review React Native documentation

---

**Note**: This is a demo application with mock data. For production use, integrate with a real backend service for authentication, messaging, and data persistence.
