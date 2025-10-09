import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { Colors } from '../../constants/Colors';
import type { UserQuizStats, Badge, QuizQuestion } from '../../types/quiz';
import AnimatedCounter from '../AnimatedCounter';

interface QuizResultModalProps {
  visible: boolean;
  stats: UserQuizStats | null;
  newBadges: Badge[];
  questions: QuizQuestion[];
  correctCount?: number;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const QuizResultModal: React.FC<QuizResultModalProps> = ({
  visible,
  stats,
  newBadges,
  questions,
  correctCount = 0,
  onClose
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 })
      ]).start();
    }
  }, [visible]);

  if (!stats) return null;

  const scorePercentage = Math.round(((correctCount || 0) / Math.max(questions.length, 1)) * 100);
  const getGradeColor = () => (scorePercentage >= 50 ? Colors.success : Colors.primary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.simpleHeader}>
            <Text style={styles.simpleTitle}>Congratulations 🎉</Text>
            <Text style={styles.simpleSubtitle}>You have scored {scorePercentage}%</Text>
          </View>
          <View style={styles.simpleButtonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  simpleHeader: {
    padding: 24,
    alignItems: 'center',
  },
  simpleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 6,
  },
  simpleSubtitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  simpleButtonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  confettiText: {
    fontSize: 24,
    letterSpacing: 8,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  badgesSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  badgesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  newBadgesContainer: {
    gap: 12,
  },
  newBadge: {
    backgroundColor: Colors.successLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  newBadgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  newBadgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 4,
  },
  newBadgeDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  allBadgesSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  allBadgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  allBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 20,
  },
  motivationSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default QuizResultModal;