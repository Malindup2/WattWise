# WattWise 
<img width="1040" height="584" alt="image" src="https://github.com/user-attachments/assets/275d1c97-4936-4c97-a543-ef74d33d6c30" />


A smart energy management mobile application built with React Native and Expo. 

 **Live Demo:** [https://watt-wise-seven.vercel.app](https://watt-wise-seven.vercel.app)

##  About

WattWise is a mobile application designed to help users monitor and manage their energy consumption efficiently. Built with modern React Native technology, it provides an intuitive interface for tracking energy usage patterns and making informed decisions about power consumption.

##  Features

-  Energy usage tracking and visualization
-  Calendar integration for historical data
-  Interactive chat functionality
-  Chart-based analytics with React Native Chart Kit
-  Firebase backend integration
-  Beautiful UI with animations and gradients
-  Image picker functionality
-  Cross-platform support (iOS, Android, Web)

##  Tech Stack

- **Framework:** React Native 0.81.4
- **Platform:** Expo ~54.0.10
- **Language:** TypeScript 5.9.2
- **UI Libraries:** 
  - React Navigation (Bottom Tabs & Stack)
  - React Native Reanimated
  - Expo Linear Gradient
  - React Native Animatable
- **Backend:** Firebase 12.3.0
- **Charts:** React Native Chart Kit
- **State Management:** AsyncStorage

##  Prerequisites

Before you begin, ensure you have the following installed: 
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for macOS) or Android Studio (for Android development)

##  Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Malindup2/WattWise.git
   cd WattWise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your Firebase configuration and other necessary environment variables

4. **Start the development server**
   ```bash
   npm start
   ```

##  Running the App

- **iOS:** `npm run ios`
- **Android:** `npm run android`
- **Web:** `npm run web`

##  Code Formatting

This project uses Prettier for code formatting.  To format your code:

```bash
npm run prettify
```

##  Project Structure

```
WattWise/
├── src/              # Source files
├── assets/           # Images, fonts, and other assets
├── config/           # Configuration files
├── styles/           # Style definitions
├── App.tsx           # Main application component
├── index.jsx         # Entry point
└── package.json      # Project dependencies
```

## 🔧 Key Dependencies

- **@react-navigation/native** - Navigation library
- **firebase** - Backend services
- **react-native-chart-kit** - Data visualization
- **react-native-gifted-chat** - Chat interface
- **react-native-calendars** - Calendar components
- **expo-linear-gradient** - Gradient effects
- **axios** - HTTP client

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

##  License

This project is private and not currently licensed for public use.

##  Author

**Malindup2**
- GitHub: [@Malindup2](https://github.com/Malindup2)

##  Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [Firebase](https://firebase.google.com/)
- UI inspiration from modern energy management solutions

---

