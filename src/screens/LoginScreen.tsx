import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { AuthService } from '../services/firebase';
import { AlertModal } from '../components/AlertModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setAlertType('warning');
      setAlertTitle('Username Required');
      setAlertMessage('Please enter your username');
      setAlertVisible(true);
      return;
    }
    if (!password.trim()) {
      setAlertType('warning');
      setAlertTitle('Password Required');
      setAlertMessage('Please enter your password');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await AuthService.signIn(email, password);
      console.log('Login successful', user);

      const userDisplayName = user.email ? user.email.split('@')[0] : 'User';
      const capitalizedName = userDisplayName.charAt(0).toUpperCase() + userDisplayName.slice(1);

      setAlertType('success');
      setAlertTitle('Welcome Back!');
      setAlertMessage(
        `Great to see you again, ${capitalizedName}! You've successfully logged in to WattWise.`
      );
      setAlertVisible(true);

      // Auto close and navigate
      setTimeout(() => {
        setAlertVisible(false);
        navigation.replace('MainTabs');
      }, 3000);
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Invalid username or password. Please try again.';
      let errorTitle = 'Login Failed';

      if (error.code === 'auth/too-many-requests') {
        errorTitle = 'Too Many Attempts';
        errorMessage =
          'Access has been temporarily disabled due to multiple failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = 'Network Error';
        errorMessage =
          'Unable to connect to the server. Please check your internet connection and try again.';
      }

      setError(errorMessage);
      setAlertType('error');
      setAlertTitle(errorTitle);
      setAlertMessage(errorMessage);
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (platform: string) => {
    Alert.alert('Social Login', `${platform} login will be implemented`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <AlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
        autoClose={true}
        autoCloseTime={alertType === 'success' ? 3000 : 2500}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/banner.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Log In</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, isEmailFocused && styles.inputWrapperFocused]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <View
              style={[styles.passwordInputWrapper, isPasswordFocused && styles.inputWrapperFocused]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Social */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Google')}
            >
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.socialIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Facebook')}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Sign Up link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ✅ Keep your styles same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', minHeight: height },
  imageContainer: { 
    alignItems: 'center', 
    paddingTop: height * 0.08, 
    paddingBottom: height * 0.04,
    paddingHorizontal: 24 
  },
  heroImage: { width: width * 0.8, height: height * 0.22, maxWidth: 300, maxHeight: 180 },
  formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 40, textAlign: 'center' },
  inputContainer: { marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputWrapperFocused: { borderColor: Colors.primary, borderWidth: 2 },
  textInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  passwordInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  eyeIcon: { padding: 4 },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginButtonText: { fontSize: 18, fontWeight: '600', color: Colors.white },
  socialContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 20 },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  socialIcon: { width: 24, height: 24 },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, paddingTop: 8 },
  signupText: { fontSize: 16, color: Colors.textSecondary },
  signupLink: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  errorContainer: {
    backgroundColor: '#FDECEA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFC9C5',
  },
  errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '500' },
});

export default LoginScreen;
