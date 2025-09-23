import React, { useState, useRef, useEffect } from 'react';
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
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface OTPVerificationScreenProps {
  onVerifyOTP?: () => void;
  onResendOTP?: () => void;
  phoneNumber?: string;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ 
  onVerifyOTP, 
  onResendOTP,
  phoneNumber = "+91 xxxxxxxxxx"
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }
    
    // Add your OTP verification logic here
    if (onVerifyOTP) {
      onVerifyOTP();
    }
  };

  const handleResendOTP = () => {
    if (!canResend) return;
    
    setTimer(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    
    if (onResendOTP) {
      onResendOTP();
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      
      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/login.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      {/* OTP Form */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>OTP Validation</Text>
        
        <Text style={styles.subtitle}>
          We have sent OTP on your number
        </Text>
        <Text style={styles.phoneNumber}>{phoneNumber}</Text>

        {/* OTP Input Fields */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            isOtpComplete && styles.continueButtonActive
          ]}
          onPress={handleVerifyOTP}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        {/* Resend OTP */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive an OTP? </Text>
          <TouchableOpacity onPress={handleResendOTP} disabled={!canResend}>
            <Text style={[
              styles.resendLink,
              !canResend && styles.resendLinkDisabled
            ]}>
              {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
            </Text>
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
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 25,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  heroImage: {
    width: width * 0.75,
    height: height * 0.22,
    maxWidth: 280,
    maxHeight: 170,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    marginBottom: 16,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'left',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  continueButton: {
    backgroundColor: Colors.border,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  continueButtonActive: {
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  resendText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  resendLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: Colors.textLight,
  },
});

export default OTPVerificationScreen;