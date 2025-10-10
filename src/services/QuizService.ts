import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AuthService } from './firebase';
import type {
  QuizQuestion,
  UserQuizProfile,
  QuizSession,
  UserQuizStats,
  Badge,
  LeaderboardEntry,
} from '../types/quiz';
import { GeminiService } from './GeminiService';
import type { Layout, Device } from '../types/layout';

export class QuizService {
  // Generate personalized quiz based on user data
  static async generatePersonalizedQuiz(userProfile: UserQuizProfile): Promise<QuizQuestion[]> {
    try {
      console.log('🧠 Generating personalized quiz for user profile:', userProfile);
      const currentUser = AuthService.getCurrentUser();
      const recentQuestions = currentUser
        ? await this.getRecentQuestionTexts(currentUser.uid, 100)
        : new Set<string>();
      // Build avoid list for the model (cap to keep prompt small)
      const avoidList = Array.from(recentQuestions).slice(0, 25);
      // Try Gemini first, fallback to local generator
      const geminiPrompt = this.buildGeminiPrompt(userProfile, avoidList);
      const fromGemini = await GeminiService.generateQuestions(geminiPrompt);
      const normalizedGemini: QuizQuestion[] = (fromGemini || []).map((q, i) => ({
        id: q.id || `gq_${Date.now()}_${i}`,
        question: q.question,
        options: q.options,
        answer: q.answer,
        tip: q.tip,
        category: q.category as QuizQuestion['category'],
        points: typeof q.points === 'number' ? q.points : 10,
      }));
      const generated =
        normalizedGemini.length > 0
          ? normalizedGemini
          : this.generateQuestionsFromProfile(userProfile);
      // Strong de-duplication: normalized comparison to avoid paraphrased repeats
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .trim();
      const recentNormalized = new Set(Array.from(recentQuestions).map(normalize));
      let deduped = generated.filter(q => !recentNormalized.has(normalize(q.question)));

      // Ensure we always return exactly 5 questions
      if (deduped.length < 5) {
        const topUp = this.generateFallbackQuestions(userProfile);
        const seen = new Set(deduped.map(q => q.question));
        for (const q of topUp) {
          if (!seen.has(q.question)) {
            deduped.push(q);
            seen.add(q.question);
          }
          if (deduped.length >= 5) break;
        }
      }

      if (deduped.length > 5) {
        deduped = deduped.slice(0, 5);
      }

      console.log('✅ Generated quiz questions (final 5):', deduped);
      return deduped;
    } catch (error) {
      console.error('❌ Error generating personalized quiz:', error);
      throw error;
    }
  }

  // Generate quiz questions based on user profile (placeholder for Gemini integration)
  private static generateQuestionsFromProfile(profile: UserQuizProfile): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const { devices, averageDailyKwh } = profile;

    // Question 1: Device efficiency
    const highWattageDevice = devices.find(d => d.watt > 100);
    if (highWattageDevice) {
      questions.push({
        id: `q1_${Date.now()}`,
        question: `How much energy could you save by using your ${highWattageDevice.name} 2 fewer hours daily?`,
        options: [
          `${((highWattageDevice.watt * 2) / 1000).toFixed(2)} kWh`,
          `${((highWattageDevice.watt * 1) / 1000).toFixed(2)} kWh`,
          `${((highWattageDevice.watt * 3) / 1000).toFixed(2)} kWh`,
          `${((highWattageDevice.watt * 0.5) / 1000).toFixed(2)} kWh`,
        ],
        answer: `${((highWattageDevice.watt * 2) / 1000).toFixed(2)} kWh`,
        tip: `Even small reductions in high-wattage device usage can lead to significant monthly savings!`,
        category: 'energy-saving',
        points: 10,
      });
    }

    // Question 2: Cost calculation
    questions.push({
      id: `q2_${Date.now()}`,
      question: `If electricity costs LKR 50 per kWh, how much would you save monthly by reducing your daily consumption by 1 kWh?`,
      options: ['LKR 1,500', 'LKR 3,000', 'LKR 750', 'LKR 5,000'],
      answer: 'LKR 1,500',
      tip: 'Small daily savings compound into meaningful monthly reductions!',
      category: 'cost-reduction',
      points: 10,
    });

    // Question 3: Device efficiency comparison
    const devices_sorted = devices.sort((a, b) => b.watt - a.watt);
    if (devices_sorted.length >= 2) {
      questions.push({
        id: `q3_${Date.now()}`,
        question: `Which of your devices consumes more energy per hour?`,
        options: [
          devices_sorted[0].name,
          devices_sorted[1].name,
          'They consume the same',
          'Cannot be determined',
        ],
        answer: devices_sorted[0].name,
        tip: `${devices_sorted[0].name} uses ${devices_sorted[0].watt}W vs ${devices_sorted[1].name} at ${devices_sorted[1].watt}W!`,
        category: 'device-efficiency',
        points: 15,
      });
    }

    // Question 4: Energy consumption awareness
    questions.push({
      id: `q4_${Date.now()}`,
      question: `Your current daily consumption is ${averageDailyKwh} kWh. What's a realistic 10% reduction target?`,
      options: [
        `${(averageDailyKwh * 0.9).toFixed(1)} kWh`,
        `${(averageDailyKwh * 0.8).toFixed(1)} kWh`,
        `${(averageDailyKwh * 0.95).toFixed(1)} kWh`,
        `${(averageDailyKwh * 0.7).toFixed(1)} kWh`,
      ],
      answer: `${(averageDailyKwh * 0.9).toFixed(1)} kWh`,
      tip: 'Start with small, achievable goals - 10% reduction is a great first step!',
      category: 'energy-saving',
      points: 10,
    });

    // Question 5: General eco tip
    questions.push({
      id: `q5_${Date.now()}`,
      question: `Which action typically saves the most energy in a household?`,
      options: [
        'Using LED bulbs instead of incandescent',
        'Unplugging devices when not in use',
        'Setting AC/heating to efficient temperatures',
        'All of the above have similar impact',
      ],
      answer: 'Setting AC/heating to efficient temperatures',
      tip: 'HVAC systems typically account for 40-50% of home energy use - small temperature adjustments make big differences!',
      category: 'eco-tips',
      points: 15,
    });

    return questions;
  }

  // Fallback generic questions to top up to 5
  private static generateFallbackQuestions(profile: UserQuizProfile): QuizQuestion[] {
    const averageDailyKwh = profile.averageDailyKwh;
    const firstDeviceName = profile.devices[0]?.name || 'appliance';
    const highImpact = (averageDailyKwh * 30 * 0.1).toFixed(0);

    const pool: QuizQuestion[] = [
      {
        id: `fb1_${Date.now()}`,
        question: 'Which bulbs save the most energy for the same brightness?',
        options: ['LED', 'CFL', 'Incandescent', 'Halogen'],
        answer: 'LED',
        tip: 'LEDs use up to 80% less energy than incandescent bulbs.',
        category: 'energy-saving',
        points: 10,
      },
      {
        id: `fb2_${Date.now()}`,
        question: 'What is the best practice for idle electronics?',
        options: ['Leave on', 'Sleep mode', 'Unplug or use smart plug', 'Mute volume'],
        answer: 'Unplug or use smart plug',
        tip: 'Standby power can account for 5–10% of home energy use.',
        category: 'eco-tips',
        points: 10,
      },
      {
        id: `fb3_${Date.now()}`,
        question: `Reducing ${firstDeviceName} usage by 1 hour/day affects bills by?`,
        options: ['No effect', 'Small reduction', 'Moderate reduction', 'Huge increase'],
        answer: 'Moderate reduction',
        tip: 'Consistent daily cuts add up across a month.',
        category: 'device-efficiency',
        points: 10,
      },
      {
        id: `fb4_${Date.now()}`,
        question: 'Best AC temperature to reduce energy while staying comfortable?',
        options: ['16°C', '20–24°C', '28°C', 'Any temperature is same'],
        answer: '20–24°C',
        tip: 'Each degree can change HVAC use by 3–5%.',
        category: 'eco-tips',
        points: 10,
      },
      {
        id: `fb5_${Date.now()}`,
        question: `If you cut 10% of daily ${averageDailyKwh} kWh, monthly saving (LKR 50/kWh) is closest to?`,
        options: ['LKR 50', `LKR ${highImpact}`, 'LKR 5000', 'LKR 0'],
        answer: `LKR ${highImpact}`,
        tip: 'Savings = reduced kWh × tariff × days.',
        category: 'cost-reduction',
        points: 10,
      },
    ];

    return pool;
  }

  private static buildGeminiPrompt(profile: UserQuizProfile, avoidList: string[] = []): string {
    const deviceList = profile.devices
      .slice(0, 10)
      .map(d => `${d.name} (${d.watt}W, ${d.hours}h/day)`) // concise
      .join(', ');
    const avoidBlock = avoidList.length
      ? `\nAvoid repeating or rephrasing any of these questions (or semantically similar ones):\n- ${avoidList.join('\n- ')}\n`
      : '';
    return `Create 5 multiple-choice questions (4 options each, exactly one correct) about home energy for this user.
- Vary topics across: energy-saving, device-efficiency, cost-reduction, eco-tips.
- Use the user's actual devices in the wording where helpful.
- Use LKR for currency.
- Return ONLY a JSON array of objects with: id, question, options[4], answer, tip, category (one of energy-saving|device-efficiency|cost-reduction|eco-tips), points (number).
- Ensure the 5 questions are all unique, not paraphrased repeats, and tailored to the user.

User context:
- User type: ${profile.userType}
- Rooms: ${profile.layout.rooms}, Area: ${profile.layout.area} sqm
- Average daily kWh: ${profile.averageDailyKwh}
- Devices: ${deviceList}
${avoidBlock}`;
  }

  // Fetch recent question texts for a user to avoid repeats
  private static async getRecentQuestionTexts(
    userId: string,
    limitCount: number
  ): Promise<Set<string>> {
    try {
      const qSessions = query(
        collection(db, 'quiz_sessions'),
        where('userId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(qSessions);
      const texts = new Set<string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as QuizSession;
        (data.questions || []).forEach(q => {
          if (q?.question) texts.add(q.question);
        });
      });
      return texts;
    } catch (e) {
      console.warn('Failed to get recent question texts', e);
      return new Set<string>();
    }
  }

  // Start a new quiz session
  static async startQuizSession(questions: QuizQuestion[]): Promise<string> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to start quiz');
      }

      const session: Omit<QuizSession, 'id'> = {
        userId: currentUser.uid,
        questions,
        answers: [],
        score: 0,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
        startedAt: new Date(),
      };

      const sessionRef = await addDoc(collection(db, 'quiz_sessions'), {
        ...session,
        startedAt: serverTimestamp(),
      });

      console.log('✅ Quiz session started:', sessionRef.id);
      return sessionRef.id;
    } catch (error) {
      console.error('❌ Error starting quiz session:', error);
      throw error;
    }
  }

  // Submit answer for a question
  static async submitAnswer(
    sessionId: string,
    questionId: string,
    selectedAnswer: string,
    timeSpent: number
  ): Promise<{ isCorrect: boolean; points: number }> {
    try {
      const sessionRef = doc(db, 'quiz_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error('Quiz session not found');
      }

      const sessionData = sessionDoc.data() as QuizSession;
      const question = sessionData.questions.find(q => q.id === questionId);

      if (!question) {
        throw new Error('Question not found in session');
      }

      const isCorrect = selectedAnswer === question.answer;
      const points = isCorrect ? question.points : 0;

      // Update session with the answer
      const updatedAnswers = [
        ...sessionData.answers,
        {
          questionId,
          selectedAnswer,
          isCorrect,
          timeSpent,
        },
      ];

      await updateDoc(sessionRef, {
        answers: updatedAnswers,
        score: sessionData.score + points,
      });

      return { isCorrect, points };
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      throw error;
    }
  }

  // removed text comparison (MCQ only)

  // Complete quiz session and update user stats
  static async completeQuizSession(
    sessionId: string
  ): Promise<{ userStats: UserQuizStats; newBadges: Badge[] }> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated');
      }

      // Get session data
      const sessionRef = doc(db, 'quiz_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error('Quiz session not found');
      }

      const sessionData = sessionDoc.data() as QuizSession;

      // Mark session as completed
      await updateDoc(sessionRef, {
        completedAt: serverTimestamp(),
      });

      // Update user stats
      const userStats = await this.updateUserStats(currentUser.uid, sessionData);

      // Award badges if applicable
      const newBadges = await this.checkAndAwardBadges(currentUser.uid, userStats);

      return { userStats, newBadges };
    } catch (error) {
      console.error('❌ Error completing quiz session:', error);
      throw error;
    }
  }

  // Update user quiz statistics
  private static async updateUserStats(
    userId: string,
    sessionData: QuizSession
  ): Promise<UserQuizStats> {
    try {
      const currentUser = AuthService.getCurrentUser();
      const userStatsRef = doc(db, 'user_quiz_stats', userId);
      const userStatsDoc = await getDoc(userStatsRef);

      let currentStats: Partial<UserQuizStats> = {
        userId,
        name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Energy User',
        totalScore: 0,
        quizzesCompleted: 0,
        averageScore: 0,
        badges: [],
        ecoPoints: 0,
      };

      if (userStatsDoc.exists()) {
        currentStats = userStatsDoc.data() as UserQuizStats;
        // Update name if it wasn't set before
        if (!currentStats.name) {
          currentStats.name =
            currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Energy User';
        }
      }

      // Calculate new stats
      const newTotalScore = (currentStats.totalScore || 0) + sessionData.score;
      const newQuizzesCompleted = (currentStats.quizzesCompleted || 0) + 1;
      const newAverageScore = Math.round(newTotalScore / newQuizzesCompleted);
      const newEcoPoints = (currentStats.ecoPoints || 0) + sessionData.score;

      const updatedStats: UserQuizStats = {
        ...(currentStats as UserQuizStats),
        totalScore: newTotalScore,
        quizzesCompleted: newQuizzesCompleted,
        averageScore: newAverageScore,
        ecoPoints: newEcoPoints,
        lastUpdated: new Date(),
      };

      await setDoc(userStatsRef, {
        ...updatedStats,
        lastUpdated: serverTimestamp(),
      });

      // Update rank in leaderboard
      await this.updateLeaderboard(userId, updatedStats);

      return updatedStats;
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }

  // Check and award badges based on achievements
  private static async checkAndAwardBadges(userId: string, stats: UserQuizStats): Promise<Badge[]> {
    const newBadges: Badge[] = [];
    const existingBadgeIds = stats.badges.map(b => b.id);

    // First Quiz Badge
    if (stats.quizzesCompleted === 1 && !existingBadgeIds.includes('first_quiz')) {
      newBadges.push({
        id: 'first_quiz',
        name: 'Energy Explorer',
        description: 'Completed your first energy quiz!',
        icon: '🌱',
        type: 'eco_champion',
        earnedAt: new Date(),
        category: 'beginner',
      });
    }

    // Quiz Master Badge
    if (stats.quizzesCompleted >= 10 && !existingBadgeIds.includes('quiz_master')) {
      newBadges.push({
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Completed 10 energy quizzes!',
        icon: '🧠',
        type: 'quiz_master',
        earnedAt: new Date(),
        category: 'intermediate',
      });
    }

    // High Scorer Badge
    if (
      stats.quizzesCompleted >= 5 &&
      stats.averageScore >= 80 &&
      !existingBadgeIds.includes('high_scorer')
    ) {
      newBadges.push({
        id: 'high_scorer',
        name: 'Energy Expert',
        description: 'Maintain 80% average score!',
        icon: '⚡',
        type: 'energy_expert',
        earnedAt: new Date(),
        category: 'expert',
      });
    }

    // Speed Demon Badge (complete quiz in under 30 seconds)
    if (!existingBadgeIds.includes('speed_demon')) {
      newBadges.push({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete quiz quickly!',
        icon: '⚡',
        type: 'speed_demon',
        earnedAt: new Date(),
        category: 'special',
      });
    }

    // Streak Warrior Badge
    if (stats.quizzesCompleted >= 3 && !existingBadgeIds.includes('streak_warrior')) {
      newBadges.push({
        id: 'streak_warrior',
        name: 'Streak Warrior',
        description: 'Consistent learning streak!',
        icon: '🔥',
        type: 'streak_warrior',
        earnedAt: new Date(),
        category: 'intermediate',
      });
    }

    // Knowledge Seeker Badge
    if (stats.totalScore >= 100 && !existingBadgeIds.includes('knowledge_seeker')) {
      newBadges.push({
        id: 'knowledge_seeker',
        name: 'Knowledge Seeker',
        description: 'Earned 100+ total points!',
        icon: '🧠',
        type: 'knowledge_seeker',
        earnedAt: new Date(),
        category: 'intermediate',
      });
    }

    // Update badges if new ones were earned
    if (newBadges.length > 0) {
      const updatedBadges = [...stats.badges, ...newBadges];
      const userStatsRef = doc(db, 'user_quiz_stats', userId);
      await updateDoc(userStatsRef, {
        badges: updatedBadges,
        lastUpdated: serverTimestamp(),
      });
    }

    return newBadges;
  }

  // Update leaderboard with user score
  private static async updateLeaderboard(userId: string, stats: UserQuizStats): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;

      const leaderboardEntry: Omit<LeaderboardEntry, 'rank'> = {
        userId,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Energy User',
        score: stats.totalScore,
        badges: stats.badges,
        ecoPoints: stats.ecoPoints,
        lastActivity: new Date(),
      };

      const leaderboardRef = doc(db, 'leaderboard', userId);
      await setDoc(leaderboardRef, {
        ...leaderboardEntry,
        lastActivity: serverTimestamp(),
      });

      console.log('✅ Leaderboard updated for user:', userId);
    } catch (error) {
      console.error('❌ Error updating leaderboard:', error);
    }
  }

  // Get leaderboard (top 10 users)
  static async getLeaderboard(limitCount: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('score', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(leaderboardQuery);
      const leaderboard: LeaderboardEntry[] = [];

      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();

        // Ensure lastActivity is properly handled
        let lastActivity = new Date();
        if (data.lastActivity) {
          if (data.lastActivity.seconds) {
            // Firestore Timestamp
            lastActivity = new Date(data.lastActivity.seconds * 1000);
          } else if (data.lastActivity instanceof Date) {
            lastActivity = data.lastActivity;
          } else {
            lastActivity = new Date(data.lastActivity);
          }
        }

        leaderboard.push({
          ...(data as Omit<LeaderboardEntry, 'rank' | 'lastActivity'>),
          lastActivity,
          rank: index + 1,
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user's quiz statistics
  static async getUserStats(userId: string): Promise<UserQuizStats | null> {
    try {
      const userStatsRef = doc(db, 'user_quiz_stats', userId);
      const userStatsDoc = await getDoc(userStatsRef);

      if (!userStatsDoc.exists()) {
        return null;
      }

      const data = userStatsDoc.data();

      // Handle date fields properly
      let lastUpdated = new Date();
      if (data.lastUpdated) {
        if (data.lastUpdated.seconds) {
          lastUpdated = new Date(data.lastUpdated.seconds * 1000);
        } else {
          lastUpdated = new Date(data.lastUpdated);
        }
      }

      // Handle badges with proper date conversion
      const badges = (data.badges || []).map((badge: any) => ({
        ...badge,
        earnedAt: badge.earnedAt?.seconds
          ? new Date(badge.earnedAt.seconds * 1000)
          : new Date(badge.earnedAt || Date.now()),
      }));

      return {
        ...(data as UserQuizStats),
        lastUpdated,
        badges,
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  // Generate user profile from layout data for quiz personalization
  static generateUserProfileFromLayout(layout: Layout): UserQuizProfile {
    const devices: UserQuizProfile['devices'] = [];
    let totalDailyHours = 0;
    let totalWattage = 0;

    // Extract devices from all rooms
    layout.rooms.forEach(room => {
      room.devices.forEach(device => {
        const dailyHours = device.usage?.reduce((sum, usage) => sum + usage.totalHours, 0) || 0;
        totalDailyHours += dailyHours;
        totalWattage += device.wattage;

        devices.push({
          name: device.deviceName,
          watt: device.wattage,
          hours: dailyHours,
          category: this.categorizeDevice(device.deviceName),
        });
      });
    });

    // Calculate average daily kWh
    const averageDailyKwh = Math.round(((totalWattage * totalDailyHours) / 1000) * 100) / 100;

    return {
      userType: layout.type === 'industrial' ? 'Industrial' : 'Household',
      layout: {
        rooms: layout.rooms.length,
        area: layout.area,
        sections: layout.rooms.map(room => ({
          name: room.roomName,
          count: room.devices.length,
        })),
      },
      devices,
      averageDailyKwh,
    };
  }

  // Categorize device for better quiz questions
  private static categorizeDevice(deviceName: string): string {
    const name = deviceName.toLowerCase();

    if (name.includes('fridge') || name.includes('refrigerator')) return 'appliance';
    if (name.includes('tv') || name.includes('television')) return 'entertainment';
    if (name.includes('fan') || name.includes('ac') || name.includes('air')) return 'climate';
    if (name.includes('light') || name.includes('lamp') || name.includes('bulb')) return 'lighting';
    if (name.includes('washer') || name.includes('dryer') || name.includes('dishwasher'))
      return 'laundry';
    if (name.includes('computer') || name.includes('laptop') || name.includes('printer'))
      return 'electronics';

    return 'other';
  }
}
