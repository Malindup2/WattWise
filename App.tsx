import React, { useState } from 'react';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingOne from './src/screens/OnboardingOne';
import OnboardingTwo from './src/screens/OnboardingTwo';
import OnboardingThree from './src/screens/OnboardingThree';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import PredictiveModelScreen from './src/screens/PredictiveModelScreen';
import ActionPlannerScreen from './src/screens/ActionPlannerScreen';
import ForumScreen from './src/screens/ForumScreen';
import QuizzesScreen from './src/screens/QuizzesScreen';
import { Colors } from './src/constants/Colors';
import { useAuth } from './src/hooks/useAuth';
import { AuthService } from './src/services/firebase';

const Stack = createStackNavigator();

export default function App() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const { user, loading } = useAuth();

  const handleLaunchFinish = () => {
    setShowLaunchScreen(false);
  };

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show launch screen first
  if (showLaunchScreen) {
    return <LaunchScreen onFinish={handleLaunchFinish} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={showOnboarding ? 'Onboarding1' : user ? 'Home' : 'Login'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding1" component={OnboardingOne} />
        <Stack.Screen name="Onboarding2" component={OnboardingTwo} />
        <Stack.Screen name="Onboarding3">
          {props => (
            <OnboardingThree
              {...props}
              onGetStarted={() => {
                setShowOnboarding(false);
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home">
          {props => (
            <HomeScreen
              {...props}
              username={user?.displayName || user?.email?.split('@')[0] || 'User'}
              onLogout={handleLogout}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="PredictiveModel" component={PredictiveModelScreen} />
        <Stack.Screen name="ActionPlanner" component={ActionPlannerScreen} />
        <Stack.Screen name="Forum" component={ForumScreen} />
        <Stack.Screen name="Quizzes" component={QuizzesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
