import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Colors } from '../../constants/Colors';
import type { QuizQuestion } from '../../types/quiz';

interface QuizQuestionCardProps {
  question: QuizQuestion;
  onAnswer: (selectedAnswer: string) => void;
  questionNumber: number;
  totalQuestions: number;
}

const { width } = Dimensions.get('window');

const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  question,
  onAnswer,
  questionNumber,
  totalQuestions
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  // Animation values
  const cardScale = new Animated.Value(1);
  const optionAnimations = question.options.map(() => new Animated.Value(1));

  useEffect(() => {
    // Reset state when question changes
    setSelectedOption(null);
    setShowFeedback(false);
    setIsAnswered(false);

    // Animate card entrance
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8
    }).start();
  }, [question.id]);

  const handleOptionPress = (option: string, index: number) => {
    if (isAnswered) return;

    setSelectedOption(option);
    setIsAnswered(true);

    // Animate selected option
    Animated.sequence([
      Animated.timing(optionAnimations[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(optionAnimations[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();

    // Show feedback and then submit answer
    setTimeout(() => {
      setShowFeedback(true);
      setTimeout(() => {
        onAnswer(option);
      }, 1500);
    }, 300);
  };

  const getOptionStyle = (option: string, index: number) => {
    if (!isAnswered) {
      return styles.option;
    }

    const isCorrect = option === question.answer;
    const isSelected = option === selectedOption;

    if (isCorrect) {
      return [styles.option, styles.correctOption];
    } else if (isSelected && !isCorrect) {
      return [styles.option, styles.incorrectOption];
    } else {
      return [styles.option, styles.disabledOption];
    }
  };

  const getOptionTextStyle = (option: string) => {
    if (!isAnswered) {
      return styles.optionText;
    }

    const isCorrect = option === question.answer;
    const isSelected = option === selectedOption;

    if (isCorrect) {
      return [styles.optionText, styles.correctOptionText];
    } else if (isSelected && !isCorrect) {
      return [styles.optionText, styles.incorrectOptionText];
    } else {
      return [styles.optionText, styles.disabledOptionText];
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'energy-saving':
        return Colors.success;
      case 'device-efficiency':
        return Colors.primary;
      case 'cost-reduction':
        return Colors.warning;
      case 'eco-tips':
        return '#6366F1';
      default:
        return Colors.gray;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'energy-saving':
        return 'Energy Saving';
      case 'device-efficiency':
        return 'Device Efficiency';
      case 'cost-reduction':
        return 'Cost Reduction';
      case 'eco-tips':
        return 'Eco Tips';
      default:
        return 'General';
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: cardScale }] }]}>
      {/* Question Header */}
      <View style={styles.header}>
        <View style={styles.questionNumberContainer}>
          <Text style={styles.questionNumber}>
            {questionNumber} / {totalQuestions}
          </Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(question.category) }]}>
          <Text style={styles.categoryText}>{getCategoryName(question.category)}</Text>
        </View>
      </View>

      {/* Question Text */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{question.points} pts</Text>
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <Animated.View
            key={index}
            style={[
              { transform: [{ scale: optionAnimations[index] }] }
            ]}
          >
            <TouchableOpacity
              style={getOptionStyle(option, index)}
              onPress={() => handleOptionPress(option, index)}
              disabled={isAnswered}
              activeOpacity={0.8}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={getOptionTextStyle(option)}>{option}</Text>
                {isAnswered && option === question.answer && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
                {isAnswered && option === selectedOption && option !== question.answer && (
                  <Text style={styles.crossmark}>✗</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Feedback Tip */}
      {showFeedback && (
        <Animated.View style={styles.tipContainer}>
          <Text style={styles.tipLabel}>💡 Did you know?</Text>
          <Text style={styles.tipText}>{question.tip}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    margin: 16,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: width - 32, // Ensure full width minus margins
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  questionNumberContainer: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  questionContainer: {
    marginBottom: 32,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: 12,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  correctOption: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  incorrectOption: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  disabledOption: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  correctOptionText: {
    color: Colors.success,
    fontWeight: '500',
  },
  incorrectOptionText: {
    color: Colors.error,
    fontWeight: '500',
  },
  disabledOptionText: {
    color: Colors.textLight,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.success,
    fontWeight: 'bold',
  },
  crossmark: {
    fontSize: 20,
    color: Colors.error,
    fontWeight: 'bold',
  },
  tipContainer: {
    backgroundColor: Colors.successLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    marginTop: 8,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default QuizQuestionCard;