import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../constants/Colors';
import type { QuizProgress } from '../../types/quiz';

interface QuizProgressBarProps {
  progress: QuizProgress;
  timeLeft?: number;
}

const QuizProgressBar: React.FC<QuizProgressBarProps> = ({ progress, timeLeft = 0 }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progressPercentage =
      (progress.currentQuestion / Math.max(progress.totalQuestions, 1)) * 100;

    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress.currentQuestion, progress.totalQuestions]);

  const progressPercentage = (progress.currentQuestion / progress.totalQuestions) * 100;

  return (
    <View style={styles.container}>
      {/* Progress Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.questionProgress}>
          Question {progress.currentQuestion} of {progress.totalQuestions}
        </Text>
        <Text style={styles.scoreText}>Score: {progress.score}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
      </View>

      {/* Additional Stats */}
      <View style={styles.additionalStats}>
        {/* Timer */}
        <View style={[styles.timerContainer, timeLeft <= 10 && styles.timerWarning]}>
          <Text style={styles.timerIcon}>⏰</Text>
          <Text style={[styles.timerText, timeLeft <= 10 && styles.timerWarningText]}>
            {timeLeft}s
          </Text>
        </View>

        {progress.streak > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{progress.streak}</Text>
          </View>
        )}

        <View style={styles.timeContainer}>
          <Text style={styles.timeIcon}>⏱️</Text>
          <Text style={styles.timeText}>
            {Math.floor(progress.timeElapsed / 60)}:
            {(progress.timeElapsed % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionProgress: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerWarning: {
    backgroundColor: Colors.errorLight,
  },
  timerIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  timerWarningText: {
    color: Colors.error,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

export default QuizProgressBar;
