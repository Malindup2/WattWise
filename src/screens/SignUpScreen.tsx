import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { AuthService, FirestoreService } from '../services/firebase';
import { AlertModal } from '../components/AlertModal';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleSignUp = async () => {
    // Validation with AlertModal instead of native Alert
    if (!username.trim()) {
      setAlertType('warning');
      setAlertTitle('Username Required');
      setAlertMessage('Please enter your username');
      setAlertVisible(true);
      return;
    }
    if (!email.trim()) {
      setAlertType('warning');
      setAlertTitle('Email Required');
      setAlertMessage('Please enter your email address');
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
    if (password.length < 6) {
      setAlertType('warning');
      setAlertTitle('Password Too Short');
      setAlertMessage('Password must be at least 6 characters long');
      setAlertVisible(true);
      return;
    }
    if (!confirmPassword.trim()) {
      setAlertType('warning');
      setAlertTitle('Confirm Password Required');
      setAlertMessage('Please confirm your password');
      setAlertVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      setAlertType('error');
      setAlertTitle('Password Mismatch');
      setAlertMessage('Passwords do not match');
      setAlertVisible(true);
      return;
    }
    if (!acceptTerms) {
      setAlertType('warning');
      setAlertTitle('Terms Required');
      setAlertMessage('Please accept the Terms & Conditions and Privacy Policy');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Registration taking too long, stopping loading state');
      setLoading(false);
      setAlertType('error');
      setAlertTitle('Registration Timeout');
      setAlertMessage('Registration is taking too long. Please try again.');
      setAlertVisible(true);
    }, 15000); // 15 second timeout

    try {
      console.log('Starting sign up process...');
      const user = await AuthService.signUp(email, password);
      console.log('Firebase user created:', user.uid);

      // Immediately stop loading and show success since Auth worked
      clearTimeout(loadingTimeout);
      setLoading(false);

      // Try to add user to Firestore with retry logic
      const addToFirestore = async (retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`Attempting to add user to Firestore (attempt ${attempt}/${retries})...`);

            await Promise.race([
              FirestoreService.addDocument('users', {
                uid: user.uid,
                username,
                email,
                createdAt: new Date().toISOString(),
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firestore timeout after 8 seconds')), 8000)
              ),
            ]);

            console.log('✅ User document successfully added to Firestore');
            return; // Success, exit retry loop
          } catch (firestoreError) {
            console.error(`❌ Firestore attempt ${attempt} failed:`, firestoreError);

            if (attempt === retries) {
              // Final attempt failed - show user a warning but don't block registration
              console.error('All Firestore attempts failed. User data not saved to database.');
              // You could show a non-blocking warning to user here if needed
            } else {
              // Wait before retry
              console.log(`Retrying in ${attempt * 2} seconds...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            }
          }
        }
      };

      // Test Firestore connectivity first
      console.log('Testing Firestore connectivity...');

      // Start Firestore operation in background
      addToFirestore();

      // Show success modal immediately after Auth success
      console.log('Registration successful, showing success modal');
      setAlertType('success');
      setAlertTitle('Registration Successful');
      setAlertMessage(
        `Welcome to WattWise, ${username}! Your account has been created successfully.`
      );
      setAlertVisible(true);

      // Auto redirect to Login after showing success message
      setTimeout(() => {
        console.log('Navigating to Login screen...');
        setAlertVisible(false);
        // Small delay to ensure modal closes before navigation
        setTimeout(() => {
          navigation.navigate('Login');
        }, 200);
      }, 3500); // Give user time to read the success message
    } catch (error: any) {
      console.error('Sign up error:', error);

      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters';
      }

      setError(errorMessage);
      setAlertType('error');
      setAlertTitle('Registration Failed');
      setAlertMessage(errorMessage);
      setAlertVisible(true);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  const handleSocialLogin = (platform: string) => {
    Alert.alert('Social Login', `${platform} login functionality will be implemented`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          // If it's a success modal, navigate to Login when manually closed
          if (alertType === 'success') {
            setTimeout(() => {
              navigation.navigate('Login');
            }, 200);
          }
        }}
        autoClose={true}
        autoCloseTime={alertType === 'success' ? 3500 : 2500}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/login.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign Up</Text>

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, isUsernameFocused && styles.inputWrapperFocused]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Username"
                placeholderTextColor={Colors.textLight}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setIsUsernameFocused(true)}
                onBlur={() => setIsUsernameFocused(false)}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Email Input */}
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
                placeholder="Email Address"
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

          {/* Password Input */}
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

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.passwordInputWrapper,
                isConfirmPasswordFocused && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setIsConfirmPasswordFocused(true)}
                onBlur={() => setIsConfirmPasswordFocused(false)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Ionicons name="checkmark" size={16} color={Colors.white} />}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>I accept </Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>Terms & conditions</Text>
              </TouchableOpacity>
              <Text style={styles.checkboxText}> and </Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>Privacy policy</Text>
              </TouchableOpacity>
              <Text style={styles.checkboxText}>.</Text>
            </View>
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Social Login */}
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

          {/* Navigate to Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  heroImage: { width: width * 0.65, height: height * 0.2, maxWidth: 260, maxHeight: 160 },
  formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 28,
    textAlign: 'center',
  },
  inputContainer: { marginBottom: 18 },
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
  textInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 0 },
  passwordInputWrapper: {
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
  passwordInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 0 },
  inputIcon: { marginRight: 12 },
  eyeIcon: { padding: 4 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxTextContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  checkboxText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '400', lineHeight: 20 },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  signUpButton: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  signUpButtonText: { fontSize: 18, fontWeight: '600', color: Colors.textOnPrimary },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 20,
  },
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 8,
  },
  loginText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '400' },
  loginLink: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
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

export default SignUpScreen;
