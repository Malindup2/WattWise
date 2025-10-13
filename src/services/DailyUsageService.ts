import {
  doc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { generateId, calculateDuration, calculatePowerUsage } from '../utils/energyCalculations';

// Types for daily usage tracking
export interface DailyDeviceEntry {
  entryId: string;
  deviceId: string;
  deviceName: string;
  wattage: number;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  duration: number; // hours
  powerUsed: number; // kWh
  timestamp: Date;
}

export interface DailyRoomUsage {
  roomId: string;
  roomName: string;
  entries: DailyDeviceEntry[];
  totalPowerUsed: number;
}

export interface DailyUsageSummary {
  date: string; // YYYY-MM-DD
  userId: string;
  rooms: DailyRoomUsage[];
  totalDailyUsage: number; // kWh
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageStats {
  today: number;
  yesterday: number;
  weeklyAverage: number;
  monthlyTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export class DailyUsageService {
  /**
   * Add a new usage entry for a device on a specific date
   */
  static async addUsageEntry(
    userId: string,
    roomId: string,
    roomName: string,
    deviceData: {
      deviceId: string;
      deviceName: string;
      wattage: number;
      startTime: string;
      endTime: string;
    },
    date: string = new Date().toISOString().split('T')[0] // Default to today
  ): Promise<void> {
    try {
      const duration = calculateDuration(deviceData.startTime, deviceData.endTime);
      const powerUsed = calculatePowerUsage(deviceData.wattage, duration);

      const newEntry: DailyDeviceEntry = {
        entryId: generateId(),
        deviceId: deviceData.deviceId,
        deviceName: deviceData.deviceName,
        wattage: deviceData.wattage,
        startTime: deviceData.startTime,
        endTime: deviceData.endTime,
        duration,
        powerUsed,
        timestamp: new Date(),
      };

      // Get or create daily summary document
      const dailySummaryRef = doc(db, 'daily_usage', `${userId}_${date}`);
      const dailyDoc = await getDoc(dailySummaryRef);

      if (dailyDoc.exists()) {
        // Update existing daily summary
        const dailyData = dailyDoc.data() as DailyUsageSummary;

        // Find or create room entry
        const roomIndex = dailyData.rooms.findIndex(room => room.roomId === roomId);

        if (roomIndex >= 0) {
          // Add entry to existing room
          dailyData.rooms[roomIndex].entries.push(newEntry);
          dailyData.rooms[roomIndex].totalPowerUsed += powerUsed;
        } else {
          // Create new room entry
          dailyData.rooms.push({
            roomId,
            roomName,
            entries: [newEntry],
            totalPowerUsed: powerUsed,
          });
        }

        // Update total daily usage
        dailyData.totalDailyUsage += powerUsed;
        dailyData.updatedAt = new Date();

        await setDoc(dailySummaryRef, dailyData);
        console.log('✅ Updated existing daily summary. Total usage now:', dailyData.totalDailyUsage, 'kWh');
      } else {
        // Create new daily summary
        const newDailySummary: DailyUsageSummary = {
          date,
          userId,
          rooms: [
            {
              roomId,
              roomName,
              entries: [newEntry],
              totalPowerUsed: powerUsed,
            },
          ],
          totalDailyUsage: powerUsed,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(dailySummaryRef, newDailySummary);
        console.log('✅ Created new daily summary. Total usage:', newDailySummary.totalDailyUsage, 'kWh');
      }

      console.log('✅ Usage entry added successfully for document:', `${userId}_${date}`);
    } catch (error) {
      console.error('Error adding usage entry:', error);
      throw error;
    }
  }

  /**
   * Get daily usage summary for a specific date
   */
  static async getDailyUsage(userId: string, date: string): Promise<DailyUsageSummary | null> {
    try {
      const documentId = `${userId}_${date}`;
      const dailySummaryRef = doc(db, 'daily_usage', documentId);
      console.log('🔍 Looking for daily usage document:', documentId);
      
      const dailyDoc = await getDoc(dailySummaryRef);

      if (dailyDoc.exists()) {
        const data = dailyDoc.data() as DailyUsageSummary;
        console.log('✅ Found daily usage data:', data.totalDailyUsage, 'kWh with', data.rooms?.length || 0, 'rooms');
        return data;
      } else {
        console.log('❌ No daily usage document found for:', documentId);
        return null;
      }
    } catch (error) {
      console.error('Error getting daily usage:', error);
      throw error;
    }
  }

  /**
   * Get usage data for a date range - simplified approach
   */
  static async getUsageRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyUsageSummary[]> {
    try {
      // Create a list of dates to fetch individually
      const dates = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
      }

      // Fetch each date individually to avoid composite index requirement
      const promises = dates.map(date => this.getDailyUsage(userId, date));
      const results = await Promise.all(promises);

      // Filter out null results and return sorted array
      return results
        .filter((result): result is DailyUsageSummary => result !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting usage range:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get usage statistics for the home screen - simplified version
   */
  static async getUsageStats(userId: string): Promise<UsageStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log('📊 Getting usage stats for user:', userId);
      console.log('📅 Today:', today, '| Yesterday:', yesterday);

      // Get today's and yesterday's usage directly
      const [todayUsage, yesterdayUsage] = await Promise.all([
        this.getDailyUsage(userId, today),
        this.getDailyUsage(userId, yesterday),
      ]);

      const todayTotal = todayUsage?.totalDailyUsage || 0;
      const yesterdayTotal = yesterdayUsage?.totalDailyUsage || 0;
      
      console.log('📊 Today total:', todayTotal, '| Yesterday total:', yesterdayTotal);

      // For initial version, use simple calculations
      let weeklyAverage = todayTotal; // Fallback to today's usage
      let monthlyTotal = todayTotal * 30; // Estimate
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;

      // Try to get more data if possible, but don't fail if it doesn't work
      try {
        // Try to get last 7 days data for better averages
        const weekDates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          weekDates.push(date);
        }

        const weekPromises = weekDates.map(date => this.getDailyUsage(userId, date));
        const weekResults = await Promise.all(weekPromises);
        const weeklyData = weekResults.filter(result => result !== null);

        if (weeklyData.length > 0) {
          const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.totalDailyUsage, 0);
          weeklyAverage = weeklyTotal / weeklyData.length;
          monthlyTotal = weeklyTotal * 4; // Better estimate based on weekly data
        }
      } catch (weekError) {
        console.warn('Could not get weekly data, using fallback values');
      }

      // Calculate trend
      if (yesterdayTotal > 0) {
        const change = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        if (change > 5) {
          trend = 'up';
        } else if (change < -5) {
          trend = 'down';
        }
        trendPercentage = Math.abs(change);
      }

      return {
        today: todayTotal,
        yesterday: yesterdayTotal,
        weeklyAverage,
        monthlyTotal,
        trend,
        trendPercentage,
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      // Return default values on any error
      return {
        today: 0,
        yesterday: 0,
        weeklyAverage: 0,
        monthlyTotal: 0,
        trend: 'stable',
        trendPercentage: 0,
      };
    }
  }

  /**
   * Get weekly usage trend data for charts - simplified approach
   */
  static async getWeeklyTrend(userId: string): Promise<number[]> {
    try {
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dates.push(date);
      }

      // Fetch each date individually
      const promises = dates.map(date => this.getDailyUsage(userId, date));
      const results = await Promise.all(promises);

      // Convert results to usage values (0 if no data)
      return results.map(result => result?.totalDailyUsage || 0);
    } catch (error) {
      console.error('Error getting weekly trend:', error);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }

  /**
   * Get monthly usage trend data for charts
   */
  static async getMonthlyTrend(userId: string): Promise<number[]> {
    try {
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const endDate = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        weeks.push({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        });
      }

      const weeklyTotals = [];
      for (const week of weeks) {
        const weekData = await this.getUsageRange(userId, week.start, week.end);
        const weekTotal = weekData.reduce((sum, day) => sum + day.totalDailyUsage, 0);
        weeklyTotals.push(weekTotal);
      }

      return weeklyTotals;
    } catch (error) {
      console.error('Error getting monthly trend:', error);
      return [0, 0, 0, 0];
    }
  }

  /**
   * Get yearly usage trend data for charts (last 6 months)
   */
  static async getYearlyTrend(userId: string): Promise<number[]> {
    try {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth();

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        months.push({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        });
      }

      const monthlyTotals = [];
      for (const month of months) {
        const monthData = await this.getUsageRange(userId, month.start, month.end);
        const monthTotal = monthData.reduce((sum, day) => sum + day.totalDailyUsage, 0);
        monthlyTotals.push(monthTotal);
      }

      return monthlyTotals;
    } catch (error) {
      console.error('Error getting yearly trend:', error);
      return [0, 0, 0, 0, 0, 0];
    }
  }

  /**
   * Delete a specific usage entry
   */
  static async deleteUsageEntry(
    userId: string,
    date: string,
    roomId: string,
    entryId: string
  ): Promise<void> {
    try {
      const dailySummaryRef = doc(db, 'daily_usage', `${userId}_${date}`);
      const dailyDoc = await getDoc(dailySummaryRef);

      if (dailyDoc.exists()) {
        const dailyData = dailyDoc.data() as DailyUsageSummary;

        // Find room and remove entry
        const roomIndex = dailyData.rooms.findIndex(room => room.roomId === roomId);
        if (roomIndex >= 0) {
          const entryIndex = dailyData.rooms[roomIndex].entries.findIndex(
            entry => entry.entryId === entryId
          );

          if (entryIndex >= 0) {
            const removedEntry = dailyData.rooms[roomIndex].entries[entryIndex];

            // Remove entry and update totals
            dailyData.rooms[roomIndex].entries.splice(entryIndex, 1);
            dailyData.rooms[roomIndex].totalPowerUsed -= removedEntry.powerUsed;
            dailyData.totalDailyUsage -= removedEntry.powerUsed;

            // Remove room if no entries left
            if (dailyData.rooms[roomIndex].entries.length === 0) {
              dailyData.rooms.splice(roomIndex, 1);
            }

            dailyData.updatedAt = new Date();

            // Update or delete document
            if (dailyData.rooms.length === 0) {
              await deleteDoc(dailySummaryRef);
            } else {
              await setDoc(dailySummaryRef, dailyData);
            }
          }
        }
      }

      console.log('✅ Usage entry deleted successfully');
    } catch (error) {
      console.error('Error deleting usage entry:', error);
      throw error;
    }
  }

  /**
   * Get category breakdown for energy insights
   */
  static async getCategoryBreakdown(
    userId: string,
    days: number = 7
  ): Promise<{ [key: string]: number }> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      let usageData: DailyUsageSummary[] = [];
      try {
        usageData = await this.getUsageRange(userId, startDate, endDate);
      } catch (error) {
        console.warn('Could not get category breakdown data, returning zero values');
        return {
          Lighting: 0,
          Appliances: 0,
          Electronics: 0,
          HVAC: 0,
          Other: 0,
        };
      }

      const categories: { [key: string]: number } = {
        Lighting: 0,
        Appliances: 0,
        Electronics: 0,
        HVAC: 0,
        Other: 0,
      };

      usageData.forEach(day => {
        day.rooms.forEach(room => {
          room.entries.forEach(entry => {
            const deviceName = entry.deviceName.toLowerCase();

            if (
              deviceName.includes('light') ||
              deviceName.includes('lamp') ||
              deviceName.includes('cfl') ||
              deviceName.includes('led')
            ) {
              categories['Lighting'] += entry.powerUsed;
            } else if (
              deviceName.includes('fridge') ||
              deviceName.includes('washing') ||
              deviceName.includes('microwave') ||
              deviceName.includes('oven')
            ) {
              categories['Appliances'] += entry.powerUsed;
            } else if (
              deviceName.includes('tv') ||
              deviceName.includes('computer') ||
              deviceName.includes('laptop') ||
              deviceName.includes('phone')
            ) {
              categories['Electronics'] += entry.powerUsed;
            } else if (
              deviceName.includes('ac') ||
              deviceName.includes('heater') ||
              deviceName.includes('fan') ||
              deviceName.includes('hvac')
            ) {
              categories['HVAC'] += entry.powerUsed;
            } else {
              categories['Other'] += entry.powerUsed;
            }
          });
        });
      });

      // Convert to percentages
      const total = Object.values(categories).reduce((sum, value) => sum + value, 0);
      if (total > 0) {
        Object.keys(categories).forEach(key => {
          categories[key] = Math.round((categories[key] / total) * 100);
        });
      } else {
        // Return zero percentages if no data
        return {
          Lighting: 0,
          Appliances: 0,
          Electronics: 0,
          HVAC: 0,
          Other: 0,
        };
      }

      return categories;
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return {
        Lighting: 0,
        Appliances: 0,
        Electronics: 0,
        HVAC: 0,
        Other: 0,
      };
    }
  }
}
