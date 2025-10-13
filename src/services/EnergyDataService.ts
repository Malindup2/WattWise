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
import { DailyUsageService, DailyUsageSummary } from './DailyUsageService';
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

      console.log('� EnergyDataService loading data for user:', user.uid);

      // Use DailyUsageService which works with the correct 'daily_usage' collection
      const usageStats = await DailyUsageService.getUsageStats(user.uid);
      const weeklyTrend = await DailyUsageService.getWeeklyTrend(user.uid);
      const monthlyTrend = await DailyUsageService.getMonthlyTrend(user.uid);
      const categoryBreakdown = await DailyUsageService.getCategoryBreakdown(user.uid, 7);

      console.log('📊 DailyUsageService results:', {
        todayUsage: usageStats.today,
        monthlyTotal: usageStats.monthlyTotal,
        weeklyAverage: usageStats.weeklyAverage,
        weeklyTrendLength: weeklyTrend.length,
        categoriesHaveData: Object.values(categoryBreakdown).some(v => v > 0)
      });

      // Check if user has any real data
      const hasRealData = usageStats.today > 0 || 
                         usageStats.yesterday > 0 || 
                         usageStats.weeklyAverage > 0 || 
                         usageStats.monthlyTotal > 0 ||
                         weeklyTrend.some(day => day > 0) ||
                         Object.values(categoryBreakdown).some(value => value > 0);

      if (!hasRealData) {
        console.log('📊 No real usage data found in EnergyDataService, returning null');
        return null;
      }

      console.log('✅ Real usage data found in EnergyDataService, building response');

      // Return data in the format expected by EnergyData interface
      return {
        userId: user.uid,
        averageDailyKwh: usageStats.weeklyAverage,
        last7Days: weeklyTrend,
        last30Days: monthlyTrend,
        deviceCount: 0, // Calculate from real device data if needed
        monthlyBudget: usageStats.monthlyTotal * 0.1 // Use as budget estimate
      };
    } catch (error) {
      console.error('❌ Error fetching energy data:', error);
      // Return null instead of mock data - this is a real app
      return null;
    }
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
