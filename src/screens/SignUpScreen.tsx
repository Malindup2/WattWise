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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface SignUpScreenProps {
  onSignUp?: () => void;
  onLogin?: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ 
  onSignUp, 
  onLogin 
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const handleSignUp = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Terms & Conditions and Privacy Policy');
      return;
    }
    
    // Add your sign up logic here
    if (onSignUp) {
      onSignUp();
    }
  };

  const handleSocialLogin = (platform: string) => {
    Alert.alert('Social Login', `${platform} login functionality will be implemented`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      
    
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/login.png')} // Same image as login
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Sign Up Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign Up</Text>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.phoneInputWrapper, isPhoneFocused && styles.inputWrapperFocused]}>
              <View style={styles.countryCodeContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.countryCode}>{countryCode}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                placeholderTextColor={Colors.textLight}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.passwordInputWrapper, isPasswordFocused && styles.inputWrapperFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
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
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.passwordInputWrapper, isConfirmPasswordFocused && styles.inputWrapperFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
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
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms & Conditions Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && (
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              )}
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

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
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

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  heroImage: {
    width: width * 0.6,
    height: height * 0.25,
    maxWidth: 280,
    maxHeight: 200,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 32,
    textAlign: 'left',
  },
  inputContainer: {
    marginBottom: 20,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginHorizontal: 8,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
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
  inputIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
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
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400',
    lineHeight: 20,
  },
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
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  socialIcon: {
    width: 24,
    height: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  loginLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
});

export default SignUpScreen;