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

  const getBadgeStyle = (badgeType: string) => {
    const baseStyle = {
      backgroundColor: Colors.primary,
    };

    switch (badgeType) {
      case 'quiz_master':
        return {
          ...baseStyle,
          backgroundColor: '#FFD700', // Gold
        };
      case 'speed_demon':
        return {
          ...baseStyle,
          backgroundColor: '#FF6B35', // Orange
        };
      case 'knowledge_seeker':
        return {
          ...baseStyle,
          backgroundColor: '#4A90E2', // Blue
        };
      case 'streak_warrior':
        return {
          ...baseStyle,
          backgroundColor: '#E74C3C', // Red
        };
      case 'energy_expert':
        return {
          ...baseStyle,
          backgroundColor: '#9B59B6', // Purple
        };
      case 'eco_champion':
        return {
          ...baseStyle,
          backgroundColor: '#27AE60', // Green
        };
      default:
        return baseStyle;
    }
  };

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
                {userStats.badges.map((badge, index) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <View style={[styles.badgeContainer, getBadgeStyle(badge.type)]}>
                      <View style={styles.badgeIcon}>
                        <Text style={styles.badgeIconText}>
                          {badge.type === 'quiz_master'
                            ? '🏆'
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
                                      : '⭐'}
                        </Text>
                      </View>
                      <Text style={styles.badgeLabel}>
                        {badge.type === 'quiz_master'
                          ? 'Master'
                          : badge.type === 'speed_demon'
                            ? 'Speed'
                            : badge.type === 'knowledge_seeker'
                              ? 'Brain'
                              : badge.type === 'streak_warrior'
                                ? 'Streak'
                                : badge.type === 'energy_expert'
                                  ? 'Expert'
                                  : badge.type === 'eco_champion'
                                    ? 'Eco'
                                    : 'Pro'}
                      </Text>
                    </View>
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
            <Text style={styles.thunderIcon}></Text>
            <Text style={styles.startQuizText}>Start New Quiz</Text>
          </View>
        </TouchableOpacity>

        {/* Leaderboard Preview */}
        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <View style={styles.leaderboardTitleContainer}>
              <Text style={styles.leaderboardTitle}> Leaderboard</Text>
              <Text style={styles.leaderboardSubtitle}>Top energy champions</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowLeaderboard(true)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {leaderboard.slice(0, 3).map((entry, index) => (
            <View key={entry.userId} style={[
              styles.leaderboardItem,
              index === 0 && styles.topRankItem,
              index < leaderboard.slice(0, 3).length - 1 && styles.leaderboardItemBorder
            ]}>
              <View style={styles.rankContainer}>
                <View style={[
                  styles.rankBadge,
                  entry.rank === 1 && styles.goldRank,
                  entry.rank === 2 && styles.silverRank,
                  entry.rank === 3 && styles.bronzeRank,
                ]}>
                  <Text style={styles.rankNumberText}>
                    {entry.rank}
                  </Text>
                </View>
                {entry.rank <= 3 && (
                  <Text style={styles.rankMedal}>
                    {entry.rank === 1 ? '👑' : entry.rank === 2 ? '🥈' : '🥉'}
                  </Text>
                )}
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{entry.name}</Text>
                <View style={styles.userStats}>
                  <Text style={styles.userScore}>{entry.ecoPoints.toLocaleString()} pts</Text>
                </View>
              </View>

              {entry.badges.length > 0 && (
                <View style={styles.userBadgeContainer}>
                  <View style={styles.userBadge}>
                    <Text style={styles.userBadgeText}>{entry.badges[0].icon}</Text>
                  </View>
                  {entry.badges.length > 1 && (
                    <View style={styles.badgeOverflow}>
                      <Text style={styles.badgeOverflowText}>+{entry.badges.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {leaderboard.length === 0 && (
            <View style={styles.emptyLeaderboard}>
              <Text style={styles.emptyLeaderboardText}>No rankings yet</Text>
              <Text style={styles.emptyLeaderboardSubtext}>Complete quizzes to appear here!</Text>
            </View>
          )}
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    padding: 8,
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeIconText: {
    fontSize: 16,
    textAlign: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leaderboardTitleContainer: {
    flex: 1,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  leaderboardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  topRankItem: {
    backgroundColor: 'rgba(73, 176, 45, 0.05)',
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 16,
    marginVertical: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  leaderboardItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  goldRank: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  silverRank: {
    backgroundColor: '#C0C0C0',
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bronzeRank: {
    backgroundColor: '#CD7F32',
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  rankMedal: {
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userScore: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  scoreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 8,
  },
  userQuizzes: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  userBadgeContainer: {
    alignItems: 'center',
  },
  userBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  userBadgeText: {
    fontSize: 14,
  },
  badgeOverflow: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeOverflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLeaderboardText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptyLeaderboardSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
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
