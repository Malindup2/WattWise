import React, { useEffect } from 'react';
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
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const QuizResultModal: React.FC<QuizResultModalProps> = ({
  visible,
  stats,
  newBadges,
  questions,
  onClose
}) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const confettiAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();

      // Animate confetti
      Animated.loop(
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  if (!stats) return null;

  const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);
  const scorePercentage = Math.round((stats.totalScore / totalPossiblePoints) * 100);
  const isHighScore = scorePercentage >= 80;

  const getPerformanceMessage = () => {
    if (scorePercentage >= 90) return "🌟 Outstanding! You're an energy expert!";
    if (scorePercentage >= 80) return "⚡ Great job! You know your energy facts!";
    if (scorePercentage >= 70) return "👍 Good work! Keep learning!";
    if (scorePercentage >= 60) return "📚 Not bad! Room for improvement!";
    return "🌱 Keep practicing! Every expert was once a beginner!";
  };

  const getGradeColor = () => {
    if (scorePercentage >= 90) return Colors.success;
    if (scorePercentage >= 80) return Colors.primary;
    if (scorePercentage >= 70) return Colors.warning;
    return Colors.error;
  };

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
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Confetti Effect */}
            {isHighScore && (
              <Animated.View
                style={[
                  styles.confetti,
                  {
                    transform: [
                      {
                        translateY: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-50, height],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.confettiText}>🎉 🌟 ⚡ 🎉 🌟 ⚡</Text>
              </Animated.View>
            )}

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Quiz Complete! 🎯</Text>
              <Text style={styles.subtitle}>{getPerformanceMessage()}</Text>
            </View>

            {/* Score Circle */}
            <View style={styles.scoreSection}>
              <View style={[styles.scoreCircle, { borderColor: getGradeColor() }]}>
                <AnimatedCounter
                  value={scorePercentage}
                  style={[styles.scoreValue, { color: getGradeColor() }] as any}
                  suffix="%"
                  duration={1500}
                />
                <Text style={styles.scoreLabel}>Score</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <AnimatedCounter
                  value={stats.ecoPoints}
                  style={styles.statValue}
                  duration={1000}
                />
                <Text style={styles.statLabel}>Eco Points</Text>
              </View>
              <View style={styles.statCard}>
                <AnimatedCounter
                  value={stats.quizzesCompleted}
                  style={styles.statValue}
                  duration={1000}
                />
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={styles.statCard}>
                <AnimatedCounter
                  value={stats.rank || 0}
                  style={styles.statValue}
                  duration={1000}
                  prefix="#"
                />
                <Text style={styles.statLabel}>Rank</Text>
              </View>
              <View style={styles.statCard}>
                <AnimatedCounter
                  value={stats.averageScore}
                  style={styles.statValue}
                  duration={1000}
                  suffix="%"
                />
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </View>

            {/* New Badges */}
            {newBadges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>🏆 New Badges Earned!</Text>
                <View style={styles.newBadgesContainer}>
                  {newBadges.map((badge) => (
                    <View key={badge.id} style={styles.newBadge}>
                      <Text style={styles.newBadgeIcon}>{badge.icon}</Text>
                      <Text style={styles.newBadgeName}>{badge.name}</Text>
                      <Text style={styles.newBadgeDescription}>{badge.description}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* All Badges */}
            {stats.badges.length > 0 && (
              <View style={styles.allBadgesSection}>
                <Text style={styles.allBadgesTitle}>Your Badge Collection</Text>
                <View style={styles.allBadgesContainer}>
                  {stats.badges.map((badge) => (
                    <View key={badge.id} style={styles.badge}>
                      <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Motivational Section */}
            <View style={styles.motivationSection}>
              <Text style={styles.motivationTitle}>Keep Going! 💚</Text>
              <Text style={styles.motivationText}>
                Every quiz makes you a better energy saver. Share your knowledge and help save the planet!
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>Share Achievement 📱</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: height * 0.85,
    width: width * 0.9,
    maxWidth: 400,
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
  shareButton: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
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