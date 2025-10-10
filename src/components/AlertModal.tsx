import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AlertModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseTime = type === 'success' ? 3000 : 2000,
}) => {
  // Keep track of internal visibility for animation purposes
  const [modalVisible, setModalVisible] = useState(false);

  // Using refs for animations to ensure they persist across re-renders
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const checkmarkScale = React.useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = React.useRef(new Animated.Value(0)).current;

  // Handle visibility changes from parent
  useEffect(() => {
    console.log(`AlertModal prop visibility changed: ${visible}, type: ${type}`);

    if (visible) {
      setModalVisible(true);
      console.log('Modal is now set to visible internally');
    }
  }, [visible, type]);

  // Handle animations when the internal visibility state changes
  useEffect(() => {
    console.log(`AlertModal internal visibility: ${modalVisible}, type: ${type}`);

    let animationTimer: NodeJS.Timeout | null = null;
    let autoCloseTimer: NodeJS.Timeout | null = null;

    if (modalVisible) {
      // Reset animations to initial state
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      checkmarkScale.setValue(0);
      checkmarkOpacity.setValue(0);

      console.log(`Starting entrance animations for alert type: ${type}`);

      // On iOS, add a tiny delay to ensure smooth modal presentation
      const animationDelay = Platform.OS === 'ios' ? 50 : 0;

      setTimeout(() => {
        // Start entrance animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }, animationDelay);

      // Special animation for success type
      if (type === 'success') {
        console.log('Starting success-specific animations');
        animationTimer = setTimeout(
          () => {
            Animated.parallel([
              Animated.spring(checkmarkScale, {
                toValue: 1,
                friction: 4,
                tension: 50,
                useNativeDriver: true,
              }),
              Animated.timing(checkmarkOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          },
          200 + (Platform.OS === 'ios' ? 50 : 0)
        ); // Add the iOS delay to success animation timing
      }

      // Setup auto-close timer
      if (autoClose) {
        console.log(`Setting up auto-close timer for ${autoCloseTime}ms`);
        autoCloseTimer = setTimeout(() => {
          console.log(`Auto-closing alert after ${autoCloseTime}ms`);
          handleClose();
        }, autoCloseTime);
      }
    }

    // Cleanup function
    return () => {
      if (animationTimer) clearTimeout(animationTimer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [modalVisible, type]);

  const handleClose = () => {
    console.log('Closing alert modal');
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('Alert animation complete, closing modal');
      setModalVisible(false);
      // Call parent's onClose after animation is complete
      onClose();
    });
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return '#EF4444'; // Red
      case 'warning':
        return '#F59E0B'; // Amber
      case 'info':
        return '#3B82F6'; // Blue
      default:
        return Colors.primary;
    }
  };

  // Don't render anything if not visible internally
  if (!modalVisible) return null;

  const getButtonStyle = () => {
    if (type === 'success') {
      return [styles.button, styles.successButton];
    } else if (type === 'error') {
      return [styles.button, styles.errorButton];
    } else if (type === 'warning') {
      return [styles.button, styles.warningButton];
    } else {
      return [styles.button, styles.infoButton];
    }
  };

  const renderSuccessAlert = () => (
    <Animated.View
      style={[
        styles.container,
        styles.successContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.iconContainer, styles.successIconContainer]}>
        <Animated.View
          style={{
            transform: [{ scale: checkmarkScale }],
            opacity: checkmarkOpacity,
          }}
        >
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
        </Animated.View>
      </View>
      <Text style={[styles.title, styles.successTitle]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={[styles.button, styles.successButton]} onPress={handleClose}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStandardAlert = () => (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getIconName() as any} size={48} color={getIconColor()} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={getButtonStyle()} onPress={handleClose}>
        <Text style={styles.buttonText}>OK</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  console.log(`Rendering AlertModal: type=${type}, title=${title}, modalVisible=${modalVisible}`);

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none" // We'll handle animations ourselves
      statusBarTranslucent={true}
      hardwareAccelerated={true} // Improve performance
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {type === 'success' ? renderSuccessAlert() : renderStandardAlert()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...Platform.select({
      ios: {
        zIndex: 1100,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 350,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  successContainer: {
    paddingTop: 32,
    borderRadius: 24,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
    height: 72,
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successTitle: {
    color: Colors.success,
    fontSize: 24,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 40,
    width: '100%',
    alignItems: 'center',
    minHeight: 48, // Ensure button has enough height for touch
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  errorButton: {
    backgroundColor: '#EF4444', // Red
  },
  warningButton: {
    backgroundColor: '#F59E0B', // Amber
  },
  infoButton: {
    backgroundColor: '#3B82F6', // Blue
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
});
