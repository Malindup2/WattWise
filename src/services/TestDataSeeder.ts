import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

export class TestDataSeeder {
  static async seedEnergyData(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🌱 Seeding test energy data for user:', user.uid);

      // Generate 30 days of realistic energy data
      const testData = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Simulate realistic daily usage patterns
        const baseUsage = 8.5;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const weekendMultiplier = isWeekend ? 1.3 : 1.0;
        const seasonalVariation = 1 + Math.sin((i / 30) * Math.PI) * 0.2;
        const randomVariation = 0.8 + Math.random() * 0.4; // ±20% random variation

        const totalKwh = baseUsage * weekendMultiplier * seasonalVariation * randomVariation;

        // Generate device breakdown
        const devices = {
          ac_unit: {
            name: 'Air Conditioning',
            kwh: totalKwh * 0.4, // 40% of total usage
            hours: 8 + Math.random() * 4,
          },
          lighting: {
            name: 'Lighting',
            kwh: totalKwh * 0.15, // 15% of total usage
            hours: 6 + Math.random() * 2,
          },
          refrigerator: {
            name: 'Refrigerator',
            kwh: totalKwh * 0.2, // 20% of total usage
            hours: 24,
          },
          washing_machine: {
            name: 'Washing Machine',
            kwh: totalKwh * 0.1, // 10% of total usage
            hours: Math.random() > 0.7 ? 2 : 0, // Used 30% of days
          },
          other_appliances: {
            name: 'Other Appliances',
            kwh: totalKwh * 0.15, // 15% of total usage
            hours: 4 + Math.random() * 4,
          },
        };

        testData.push({
          userId: user.uid,
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          totalKwh: Math.round(totalKwh * 10) / 10, // Round to 1 decimal
          devices,
          createdAt: date,
        });
      }

      // Add all test data to Firestore
      const promises = testData.map(data => addDoc(collection(db, 'dailyUsage'), data));

      await Promise.all(promises);

      console.log(`✅ Successfully seeded ${testData.length} days of energy data`);
      console.log('📊 Sample data:', {
        averageKwh: (testData.reduce((sum, d) => sum + d.totalKwh, 0) / testData.length).toFixed(1),
        minKwh: Math.min(...testData.map(d => d.totalKwh)).toFixed(1),
        maxKwh: Math.max(...testData.map(d => d.totalKwh)).toFixed(1),
      });
    } catch (error) {
      console.error('❌ Error seeding test data:', error);
      throw error;
    }
  }

  static async seedUserProfile(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🌱 Seeding user profile for:', user.uid);

      const userProfile = {
        monthlyBudget: 6000, // 6000 LKR
        deviceCount: 12,
        householdSize: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'users'), userProfile);

      console.log('✅ Successfully seeded user profile');
    } catch (error) {
      console.error('❌ Error seeding user profile:', error);
      throw error;
    }
  }

  static async seedAllTestData(): Promise<void> {
    try {
      await this.seedUserProfile();
      await this.seedEnergyData();
      console.log('🎉 All test data seeded successfully!');
    } catch (error) {
      console.error('❌ Error seeding test data:', error);
      throw error;
    }
  }
}
