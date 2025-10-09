import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import type { LeaderboardEntry } from '../../types/quiz';

interface LeaderboardModalProps {
  visible: boolean;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ visible, leaderboard, onClose }) => {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return Colors.primary;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '👑';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  const formatLastActivity = (date: Date | any) => {
    try {
      // Handle different date formats
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date === 'object' && date.seconds) {
        // Firestore Timestamp
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        // Fallback to current date if date is invalid
        return 'Recently';
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Recently';
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Recently';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>🏆 Leaderboard</Text>
              <Text style={styles.subtitle}>Top Energy Savers</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Podium (Top 3) */}
          {leaderboard.length >= 3 && (
            <View style={styles.podium}>
              {/* Second Place */}
              <View style={styles.podiumPosition}>
                <View style={[styles.podiumRank, { backgroundColor: getRankColor(2) }]}>
                  <Text style={styles.podiumRankText}>2</Text>
                </View>
                <Text style={styles.podiumName}>{leaderboard[1].name}</Text>
                <Text style={styles.podiumScore}>{leaderboard[1].ecoPoints}</Text>
                <View style={styles.podiumBar2} />
              </View>

              {/* First Place */}
              <View style={styles.podiumPosition}>
                <Text style={styles.crownIcon}>👑</Text>
                <View style={[styles.podiumRank, { backgroundColor: getRankColor(1) }]}>
                  <Text style={styles.podiumRankText}>1</Text>
                </View>
                <Text style={styles.podiumName}>{leaderboard[0].name}</Text>
                <Text style={styles.podiumScore}>{leaderboard[0].ecoPoints}</Text>
                <View style={styles.podiumBar1} />
              </View>

              {/* Third Place */}
              <View style={styles.podiumPosition}>
                <View style={[styles.podiumRank, { backgroundColor: getRankColor(3) }]}>
                  <Text style={styles.podiumRankText}>3</Text>
                </View>
                <Text style={styles.podiumName}>{leaderboard[2].name}</Text>
                <Text style={styles.podiumScore}>{leaderboard[2].ecoPoints}</Text>
                <View style={styles.podiumBar3} />
              </View>
            </View>
          )}

          {/* Full Leaderboard */}
          <ScrollView style={styles.leaderboardList} showsVerticalScrollIndicator={false}>
            <Text style={styles.listTitle}>All Rankings</Text>
            {leaderboard.map(entry => (
              <View key={entry.userId} style={styles.leaderboardItem}>
                <View style={styles.rankSection}>
                  <Text style={styles.rankIcon}>{getRankIcon(entry.rank)}</Text>
                  <View style={[styles.rankBadge, { backgroundColor: getRankColor(entry.rank) }]}>
                    <Text style={styles.rankText}>#{entry.rank}</Text>
                  </View>
                </View>

                <View style={styles.userSection}>
                  <Text style={styles.userName}>{entry.name}</Text>
                  <Text style={styles.userActivity}>{formatLastActivity(entry.lastActivity)}</Text>
                </View>

                <View style={styles.scoreSection}>
                  <Text style={styles.userScore}>{entry.ecoPoints}</Text>
                  <Text style={styles.scoreLabel}>points</Text>
                </View>

                <View style={styles.badgesSection}>
                  {entry.badges.slice(0, 3).map((badge, index) => (
                    <Text key={index} style={styles.badgeIcon}>
                      {badge.icon}
                    </Text>
                  ))}
                  {entry.badges.length > 3 && (
                    <Text style={styles.moreBadges}>+{entry.badges.length - 3}</Text>
                  )}
                </View>
              </View>
            ))}

            {/* Empty State */}
            {leaderboard.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>No rankings yet</Text>
                <Text style={styles.emptyText}>
                  Be the first to complete a quiz and claim the top spot!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Complete more quizzes to climb the rankings! 🌱</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: Colors.backgroundSecondary,
  },
  podiumPosition: {
    alignItems: 'center',
    marginHorizontal: 8,
    flex: 1,
  },
  crownIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  podiumRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumScore: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  podiumBar1: {
    width: 60,
    height: 60,
    backgroundColor: '#FFD700',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBar2: {
    width: 60,
    height: 48,
    backgroundColor: '#C0C0C0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBar3: {
    width: 60,
    height: 36,
    backgroundColor: '#CD7F32',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  leaderboardList: {
    flex: 1,
    padding: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  rankIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  userSection: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  userActivity: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scoreSection: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userScore: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  badgesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  badgeIcon: {
    fontSize: 14,
    marginLeft: 2,
  },
  moreBadges: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default LeaderboardModal;
