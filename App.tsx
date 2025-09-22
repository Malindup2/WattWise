import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LaunchScreen from './src/screens/LaunchScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import { Colors } from './src/constants/Colors';

export default function App() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'signup', 'home'

  const handleLaunchFinish = () => {
    setShowLaunchScreen(false);
  };

  // Navigation handlers
  const navigateToSignUp = () => {
    setCurrentScreen('signup');
  };

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };

  const handleLogin = () => {
    // Add your login logic here
    console.log('Login successful');
    // Navigate to main app or home screen
    // setCurrentScreen('home');
  };

  const handleSignUp = () => {
    // Add your signup logic here
    console.log('Sign up successful');
    // You might want to navigate to login or directly to home
    // setCurrentScreen('login'); // or 'home'
  };

  const handleForgotPassword = () => {
    // Add forgot password logic here
    console.log('Forgot password clicked');
    // Navigate to forgot password screen if you have one
  };

  // Show launch screen first
  if (showLaunchScreen) {
    return <LaunchScreen onFinish={handleLaunchFinish} />;
  }

  // Show current screen based on state
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen 
        onSignUp={handleSignUp}
        onLogin={navigateToLogin}
      />
    );
  }

  if (currentScreen === 'login') {
    return (
      <LoginScreen 
        onLogin={handleLogin}
        onSignUp={navigateToSignUp}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  // Default fallback (you can add home screen here later)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Welcome to WattWise!</Text>
        <Text style={styles.subtitle}>
          Smart Energy Management for your home
        </Text>
        <View style={styles.successBadge}>
          <Text style={styles.successText}>App Loaded Successfully</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
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