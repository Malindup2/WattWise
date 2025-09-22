import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LaunchScreen from './src/screens/LaunchScreen';
import LoginScreen from './src/screens/LoginScreen';
import { Colors } from './src/constants/Colors';

export default function App() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);

  const handleLaunchFinish = () => {
    setShowLaunchScreen(false);
  };

  if (showLaunchScreen) {
    return <LaunchScreen onFinish={handleLaunchFinish} />;
  }

  // Show LoginScreen after launch screen
  return <LoginScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  successBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  successText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
