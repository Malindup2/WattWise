import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { QuizService } from '../services/QuizService';
import { FirestoreService } from '../services/firebase';
import { AuthService } from '../services/firebase';
import type { UserQuizStats, LeaderboardEntry, Badge } from '../types/quiz';
import QuizSessionScreen from '../components/quiz/QuizSessionScreen';
import LeaderboardModal from '../components/quiz/LeaderboardModal';
import AnimatedCounter from '../components/AnimatedCounter';
import { AlertModal } from '../components/AlertModal';

const QuizzesScreen: React.FC = () => {
  const [userStats, setUserStats] = useState<UserQuizStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuizSession, setShowQuizSession] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBadgeAlert, setShowBadgeAlert] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();

      if (!currentUser) {
        Alert.alert('Error', 'Please log in to access quizzes');
        return;
      }

      // Load user stats
      const stats = await QuizService.getUserStats(currentUser.uid);
      setUserStats(stats);

      // Load leaderboard with error handling
      try {
        const leaderboardData = await QuizService.getLeaderboard();
        setLeaderboard(leaderboardData);
      } catch (leaderboardError) {
        console.warn('Could not load leaderboard:', leaderboardError);
        setLeaderboard([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load quiz data');
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to start a quiz');
        return;
      }

      // Get user's layout data for personalization
      const layoutData = await FirestoreService.getEnhancedUserLayout(currentUser.uid);

      if (!layoutData || !layoutData.rooms || layoutData.rooms.length === 0) {
        Alert.alert(
          'Setup Required',
          'Please set up your home layout first to get personalized quiz questions!',
          [{ text: 'OK' }]
        );
        return;
      }

      setShowQuizSession(true);
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert('Error', 'Failed to start quiz');
    }
  };

  const onQuizComplete = (newStats: UserQuizStats, newBadges?: Badge[]) => {
    setUserStats(newStats);
    setShowQuizSession(false);

    // Show badge unlock alert if there are new badges
    if (newBadges && newBadges.length > 0) {
      setNewBadge(newBadges[0]); // Show the first badge
      setShowBadgeAlert(true);
    }

    loadUserData(); // Refresh leaderboard
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading quiz data...</Text>
      </View>
    );
  }

  if (showQuizSession) {
    return (
      <QuizSessionScreen onComplete={onQuizComplete} onCancel={() => setShowQuizSession(false)} />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Green Header */}
      <View style={styles.greenHeader}>
        <Text style={styles.headerTitle}>WattWise Quiz </Text>
        <Text style={styles.headerSubtitle}>Test your energy knowledge and earn eco points!</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Stats Card */}
        {userStats && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <AnimatedCounter
                  value={userStats.ecoPoints}
                  style={styles.statValue}
                  duration={1000}
                />
                <Text style={styles.statLabel}>Eco Points</Text>
              </View>
              <View style={styles.statItem}>
                <AnimatedCounter
                  value={userStats.quizzesCompleted}
                  style={styles.statValue}
                  duration={1000}
                />
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={styles.statItem}>
                <AnimatedCounter
                  value={userStats.averageScore}
                  style={styles.statValue}
                  duration={1000}
                  suffix="%"
                />
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </View>

            {/* Badges */}
            <View style={styles.badgesSection}>
              <Text style={styles.badgesTitle}>Your Badges</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.badgesScrollView}
                contentContainerStyle={styles.badgesScrollContent}
              >
                {userStats.badges.map(badge => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <View style={styles.badgeCircle}>
                      <Text style={styles.badgeEmoji}>
                        {badge.type === 'quiz_master'
                          ? '🎯'
                          : badge.type === 'speed_demon'
                            ? '⚡'
                            : badge.type === 'knowledge_seeker'
                              ? '🧠'
                              : badge.type === 'streak_warrior'
                                ? '🔥'
                                : badge.type === 'energy_expert'
                                  ? '💡'
                                  : badge.type === 'eco_champion'
                                    ? '🌱'
                                    : '🏆'}
                      </Text>
                    </View>
                    <Text style={styles.badgeName}>
                      {badge.type === 'quiz_master'
                        ? 'Quiz Master'
                        : badge.type === 'speed_demon'
                          ? 'Speed Pro'
                          : badge.type === 'knowledge_seeker'
                            ? 'Brain Box'
                            : badge.type === 'streak_warrior'
                              ? 'Fire Streak'
                              : badge.type === 'energy_expert'
                                ? 'Eco Pro'
                                : badge.type === 'eco_champion'
                                  ? 'Green Hero'
                                  : 'Champion'}
                    </Text>
                    {(badge.count || 1) > 1 && (
                      <View style={styles.badgeCountContainer}>
                        <Text style={styles.badgeCountText}>{badge.count}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {userStats.badges.length === 0 && (
                  <View style={styles.noBadgesContainer}>
                    <Text style={styles.noBadges}>Complete quizzes to earn badges!</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Start Quiz Button */}
        <TouchableOpacity style={styles.startQuizButton} onPress={startQuiz}>
          <View style={styles.startQuizContent}>
            <Text style={styles.thunderIcon}>⚡</Text>
            <Text style={styles.startQuizText}>Start New Quiz</Text>
          </View>
        </TouchableOpacity>

        {/* Leaderboard Preview */}
        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardTitle}>🏆 Leaderboard</Text>
            <TouchableOpacity onPress={() => setShowLeaderboard(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {leaderboard.slice(0, 3).map(entry => (
            <View key={entry.userId} style={styles.leaderboardItem}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankMedal}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                </Text>
                <Text style={styles.rankNumber}>#{entry.rank}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{entry.name}</Text>
                <Text style={styles.userScore}>{entry.ecoPoints} points</Text>
              </View>
              {entry.badges.length > 0 && (
                <View style={styles.userBadgeContainer}>
                  <Text style={styles.userBadge}>{entry.badges[0].icon}</Text>
                  {entry.badges.length > 1 && (
                    <Text style={styles.badgeCount}>+{entry.badges.length - 1}</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* How it Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How it Works</Text>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>🎯</Text>
            <Text style={styles.stepText}>Get personalized questions based on your home setup</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>🧠</Text>
            <Text style={styles.stepText}>Answer 5 fun energy-saving questions</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>🌟</Text>
            <Text style={styles.stepText}>Earn eco points and unlock achievement badges</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>🏆</Text>
            <Text style={styles.stepText}>Compete on the leaderboard with other users</Text>
          </View>
        </View>
      </ScrollView>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        leaderboard={leaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Badge Unlock Alert Modal */}
      <AlertModal
        visible={showBadgeAlert}
        type="success"
        title="🎉 Congratulations!"
        message={
          newBadge
            ? `You've unlocked a new badge: ${newBadge.name}! ${newBadge.description}`
            : 'You earned a new badge!'
        }
        onClose={() => {
          setShowBadgeAlert(false);
          setNewBadge(null);
        }}
        autoClose={true}
        autoCloseTime={3000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  greenHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  statsCard: {
    margin: 24,
    marginTop: 16,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
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
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 16,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgesScrollView: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  badgesScrollContent: {
    paddingRight: 24,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeCountContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  noBadgesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBadges: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    minWidth: 80,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: Colors.successLight,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeIcon: {
    fontSize: 18,
    textAlign: 'center',
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 12,
  },
  startQuizButton: {
    margin: 24,
    marginTop: 8,
    padding: 20,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startQuizContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thunderIcon: {
    fontSize: 24,
    marginRight: 12,
    color: Colors.white,
  },
  startQuizText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  leaderboardCard: {
    margin: 24,
    marginTop: 8,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  rankMedal: {
    fontSize: 24,
    marginBottom: 2,
  },
  rankNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  userScore: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  userBadgeContainer: {
    alignItems: 'center',
  },
  userBadge: {
    fontSize: 20,
  },
  badgeCount: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  howItWorksCard: {
    margin: 24,
    marginTop: 8,
    marginBottom: 40,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default QuizzesScreen;
