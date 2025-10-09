export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  tip: string;
  category: 'energy-saving' | 'device-efficiency' | 'cost-reduction' | 'eco-tips';
  points: number;
}

export interface UserQuizProfile {
  userType: 'Household' | 'Industrial';
  layout: {
    rooms: number;
    area: number;
    sections: Array<{ name: string; count: number }>;
  };
  devices: Array<{
    name: string;
    watt: number;
    hours: number;
    category: string;
  }>;
  averageDailyKwh: number;
}

export interface QuizSession {
  id: string;
  userId: string;
  questions: QuizQuestion[];
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  score: number;
  totalPoints: number;
  completedAt?: Date;
  startedAt: Date;
}

export interface UserQuizStats {
  userId: string;
  name: string;
  totalScore: number;
  quizzesCompleted: number;
  averageScore: number;
  badges: Badge[];
  rank: number;
  ecoPoints: number;
  lastUpdated: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'quiz_master' | 'speed_demon' | 'knowledge_seeker' | 'streak_warrior' | 'energy_expert' | 'eco_champion' | 'general';
  count?: number;
  earnedAt: Date;
  category: 'beginner' | 'intermediate' | 'expert' | 'special';
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
  badges: Badge[];
  ecoPoints: number;
  profilePic?: string;
  lastActivity: Date;
}

export interface QuizProgress {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  timeElapsed: number;
  streak: number;
}