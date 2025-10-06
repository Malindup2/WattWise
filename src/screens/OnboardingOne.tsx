import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface OnboardingOneProps {
  onNext?: () => void;
}

const OnboardingOne: React.FC<OnboardingOneProps> = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>        
        <View style={styles.imageContainer}>
          <Image source={require('../../assets/banner.png')} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Track Your Energy Usage</Text>
        <Text style={styles.subtitle}>Get real-time insights and understand where your electricity goes.</Text>

        <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Onboarding2')} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  imageContainer: { alignItems: 'center', marginBottom: 24 },
  image: { width: width * 0.8, height: height * 0.28, maxWidth: 320, maxHeight: 220 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  ctaText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});

export default OnboardingOne;


