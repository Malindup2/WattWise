import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { EnergyData } from './EnergyPredictionService';

export interface DailyUsage {
  id: string;
  userId: string;
  date: string;
  totalKwh: number;
  devices: {
    [deviceId: string]: {
      name: string;
      kwh: number;
      hours: number;
    };
  };
  createdAt: Date;
}

export interface UserProfile {
  monthlyBudget?: number;
  deviceCount?: number;
  householdSize?: number;
}

export class EnergyDataService {
  static async getUserEnergyData(): Promise<EnergyData | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('👤 User profile loading for:', user.uid);

      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userProfile = (userDoc.data() as UserProfile) || {};
      console.log('👤 User profile loaded:', userProfile);

      // Try to get usage data, but handle index errors gracefully
      let usageData: DailyUsage[] = [];

      try {
        // Get last 30 days of usage data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const usageQuery = query(
          collection(db, 'dailyUsage'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', thirtyDaysAgo),
          orderBy('createdAt', 'desc'),
          limit(30)
        );

        const usageSnapshot = await getDocs(usageQuery);
        usageData = usageSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as DailyUsage[];

        console.log('📊 Usage data loaded:', usageData.length, 'records');
      } catch (indexError: any) {
        console.warn(
          '📊 Firestore index not available, using mock data:',
          indexError?.message || indexError
        );
        // Continue with empty array to use mock data
      }

      if (usageData.length === 0) {
        console.log('📊 No usage data found, generating mock data');
        // Return mock data if no real data exists
        return this.getMockEnergyData(user.uid);
      }

      // Calculate averages and extract recent data
      const totalKwh = usageData.reduce((sum, day) => sum + day.totalKwh, 0);
      const averageDailyKwh = totalKwh / usageData.length;

      // Get last 7 days (most recent first, so reverse for chronological order)
      const last7Days = usageData
        .slice(0, 7)
        .reverse()
        .map(day => day.totalKwh);

      // Get all 30 days data
      const last30Days = usageData.reverse().map(day => day.totalKwh);

      // Count devices from most recent day
      const recentDay = usageData[usageData.length - 1];
      const deviceCount = recentDay?.devices
        ? Object.keys(recentDay.devices).length
        : userProfile.deviceCount || 5;

      return {
        userId: user.uid,
        averageDailyKwh,
        last7Days,
        last30Days,
        deviceCount,
        monthlyBudget: userProfile.monthlyBudget,
      };
    } catch (error) {
      console.error('Error fetching energy data:', error);
      // Return mock data on error
      const user = auth.currentUser;
      return user ? this.getMockEnergyData(user.uid) : null;
    }
  }

  static getMockEnergyData(userId: string): EnergyData {
    console.log('🎲 Generating mock energy data for user:', userId);

    // Generate realistic mock data based on typical household patterns
    const baseUsage = 8.5;
    const variance = 1.5;

    // Generate last 7 days with some weekend vs weekday variation
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const isWeekend = index === 0 || index === 6; // Assuming index 0 and 6 are weekend
      const weekendMultiplier = isWeekend ? 1.2 : 1.0; // Higher usage on weekends
      return (baseUsage + (Math.random() - 0.5) * variance) * weekendMultiplier;
    });

    // Generate last 30 days with more variation
    const last30Days = Array.from({ length: 30 }, (_, index) => {
      const dayOfWeek = index % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 1.2 : 1.0;
      const monthlyTrend = 1 + Math.sin((index / 30) * Math.PI) * 0.1; // Slight monthly variation

      return (baseUsage + (Math.random() - 0.5) * variance) * weekendMultiplier * monthlyTrend;
    });

    const mockData = {
      userId,
      averageDailyKwh: baseUsage,
      last7Days,
      last30Days,
      deviceCount: 12,
      monthlyBudget: 6000, // 6000 LKR
    };

    console.log('🎲 Generated mock data:', {
      ...mockData,
      last7Days: mockData.last7Days.map(v => v.toFixed(1)),
      avgLast30Days: (mockData.last30Days.reduce((a, b) => a + b, 0) / 30).toFixed(1),
    });

    return mockData;
  }

  static async saveDailyUsage(
    dailyUsage: Omit<DailyUsage, 'id' | 'userId' | 'createdAt'>
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const usageData = {
        ...dailyUsage,
        userId: user.uid,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'dailyUsage'), usageData);
      console.log('Daily usage saved successfully');
    } catch (error) {
      console.error('Error saving daily usage:', error);
      throw error;
    }
  }

  static formatKwh(kwh: number): string {
    return `${kwh.toFixed(1)} kWh`;
  }

  static formatCost(cost: number): string {
    return `Rs ${cost.toFixed(0)}`;
  }

  static formatCo2(co2: number): string {
    return `${co2.toFixed(1)} kg CO₂`;
  }
}
