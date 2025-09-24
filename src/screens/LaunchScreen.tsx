import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Colors } from '../constants/Colors';

interface LaunchScreenProps {
  onFinish?: () => void;
}

const LaunchScreen: React.FC<LaunchScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateEntrance = () => {
      // Background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Title animation with slight delay
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }).start();

      // Subtitle animation with more delay
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }).start();

      // Auto-finish after animation
      setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
      }, 2500);
    };

    animateEntrance();
  }, [fadeAnim, titleAnim, subtitleAnim, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.textContainer}>
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleAnim,
                transform: [
                  {
                    translateY: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.title}>WattWise</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: subtitleAnim,
                transform: [
                  {
                    translateY: subtitleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.subtitle}>Smarter Energy for Smarter Living</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 28,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  textContainer: {
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
});

export default LaunchScreen;
