import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

const OnboardingTwo: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/login.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Save With Smart Tips</Text>
        <Text style={styles.subtitle}>
          Actionable suggestions tailored to your usage to reduce your bill.
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Onboarding3')}
          activeOpacity={0.9}
        >
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
  image: { width: width * 0.75, height: height * 0.26, maxWidth: 300, maxHeight: 200 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
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

export default OnboardingTwo;
