import React, { useState } from 'react';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'PredictiveModel') {
            iconName = 'analytics-outline';
          } else if (route.name === 'ActionPlanner') {
            iconName = 'list-outline';
          } else if (route.name === 'Forum') {
            iconName = 'chatbubbles-outline';
          } else if (route.name === 'Quizzes') {
            iconName = 'help-circle-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
        unmountOnBlur: false, // Prevents remounting screens
        lazy: false, // Loads all tabs upfront for smoother transitions
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{
          username: user?.displayName || user?.email?.split('@')[0] || 'User',
        }}
      />
      <Tab.Screen name="PredictiveModel" component={PredictiveModelScreen} />
      <Tab.Screen name="ActionPlanner" component={ActionPlannerScreen} />
      <Tab.Screen name="Forum" component={ForumScreen} />
      <Tab.Screen name="Quizzes" component={QuizzesScreen} />
    </Tab.Navigator>
  );
};

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
      <Stack.Navigator initialRouteName={showOnboarding ? 'Onboarding1' : user ? 'MainTabs' : 'Login'} screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
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
