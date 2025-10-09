import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  BackHandler
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { QuizService } from '../../services/QuizService';
import { FirestoreService, AuthService } from '../../services/firebase';
import type { QuizQuestion, UserQuizStats, QuizProgress, Badge } from '../../types/quiz';
import QuizQuestionCard from './QuizQuestionCard';
import QuizProgressBar from './QuizProgressBar';
import QuizResultModal from './QuizResultModal';

interface QuizSessionScreenProps {
  onComplete: (stats: UserQuizStats, newBadges?: Badge[]) => void;
  onCancel: () => void;
}

const QuizSessionScreen: React.FC<QuizSessionScreenProps> = ({ onComplete, onCancel }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [progress, setProgress] = useState<QuizProgress>({
    currentQuestion: 0,
    totalQuestions: 0,
    score: 0,
    timeElapsed: 0,
    streak: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [finalStats, setFinalStats] = useState<UserQuizStats | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per question
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Animation values
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    initializeQuiz();
    
    // Handle back button on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      backHandler.remove();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isLoading && questions.length > 0 && timeLeft > 0 && !showResult) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - auto submit with no answer
            handleAnswer('');
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [currentQuestionIndex, isLoading, showResult]);

  // Reset timer when moving to next question
  useEffect(() => {
    setTimeLeft(60);
  }, [currentQuestionIndex]);

  const handleBackPress = () => {
    Alert.alert(
      'Exit Quiz?',
      'Your progress will be lost if you exit now.',
      [
        { text: 'Continue Quiz', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onCancel }
      ]
    );
    return true;
  };

  const initializeQuiz = async () => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to start quiz');
        onCancel();
        return;
      }

      // Get user's layout data
      const layoutData = await FirestoreService.getEnhancedUserLayout(currentUser.uid);
      
      if (!layoutData) {
        Alert.alert('Error', 'Unable to load your layout data');
        onCancel();
        return;
      }

      // Generate user profile and get personalized questions
      const userProfile = QuizService.generateUserProfileFromLayout(layoutData as any);
      const quizQuestions = await QuizService.generatePersonalizedQuiz(userProfile);

      // Start quiz session
      const sessionId = await QuizService.startQuizSession(quizQuestions);

      setQuestions(quizQuestions);
      setSessionId(sessionId);
      setProgress({
        currentQuestion: 1,
        totalQuestions: quizQuestions.length,
        score: 0,
        timeElapsed: 0,
        streak: 0
      });

      // Only set loading to false after everything is ready
      setIsLoading(false);

      // Animate in first question
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();

    } catch (error) {
      console.error('Error initializing quiz:', error);
      Alert.alert('Error', 'Failed to load quiz questions');
      onCancel();
    }
  };

  const handleAnswer = async (selectedAnswer: string) => {
    try {
      const currentQuestion = questions[currentQuestionIndex];
      const timeSpent = Math.round((Date.now() - startTime) / 1000);

      // Submit answer
      const result = await QuizService.submitAnswer(
        sessionId,
        currentQuestion.id,
        selectedAnswer,
        timeSpent
      );

      // Update progress
      const newStreak = result.isCorrect ? progress.streak + 1 : 0;
      const newProgress = {
        ...progress,
        score: progress.score + result.points,
        streak: newStreak,
        timeElapsed: timeSpent
      };

      setProgress(newProgress);

      // Show feedback with animation
      await showAnswerFeedback(result.isCorrect);

      // Move to next question or complete quiz
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setProgress({
          ...newProgress,
          currentQuestion: currentQuestionIndex + 2
        });
        
        // Animate to next question
        await animateToNextQuestion();
      } else {
        // Complete quiz
        await completeQuiz();
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    }
  };

  const showAnswerFeedback = (isCorrect: boolean): Promise<void> => {
    return new Promise((resolve) => {
      // Fade animation for feedback
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setTimeout(resolve, 500);
      });
    });
  };

  const animateToNextQuestion = (): Promise<void> => {
    return new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => resolve());
    });
  };

  const completeQuiz = async () => {
    try {
      const result = await QuizService.completeQuizSession(sessionId);
      setFinalStats(result.userStats);
      
      // Check for new badges
      if (result.newBadges && result.newBadges.length > 0) {
        setNewBadges(result.newBadges);
      }

      setShowResult(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
      Alert.alert('Error', 'Failed to save quiz results');
    }
  };

  const handleResultClose = () => {
    setShowResult(false);
    if (finalStats) {
      onComplete(finalStats, newBadges);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingEmoji}>🧠</Text>
          <Text style={styles.loadingTitle}>Preparing Your Quiz</Text>
          <Text style={styles.loadingText}>Generating personalized questions based on your energy usage...</Text>
          <View style={styles.loadingProgress}>
            <View style={styles.loadingBar} />
          </View>
        </View>
      </View>
    );
  }

  if (!isLoading && questions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No questions available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onCancel}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WattWise Quiz</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{progress.score} pts</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <QuizProgressBar progress={progress} timeLeft={timeLeft} />

      {/* Question Card */}
      <View style={styles.questionWrapper}>
        <Animated.View 
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }
              ]
            }
          ]}
        >
          <QuizQuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
          />
        </Animated.View>
      </View>

      {/* Streak Indicator */}
      {progress.streak > 1 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>🔥 {progress.streak} streak!</Text>
        </View>
      )}

      {/* Result Modal */}
      <QuizResultModal
        visible={showResult}
        stats={finalStats}
        newBadges={newBadges}
        questions={questions}
        onClose={handleResultClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 24,
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingProgress: {
    width: 200,
    height: 4,
    backgroundColor: Colors.lightGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '70%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scoreContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  questionWrapper: {
    flex: 1,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  streakContainer: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  streakText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default QuizSessionScreen;