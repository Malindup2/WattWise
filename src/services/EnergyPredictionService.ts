import Constants from 'expo-constants';

export interface EnergyData {
  userId: string;
  averageDailyKwh: number;
  last7Days: number[];
  last30Days?: number[];
  deviceCount: number;
  monthlyBudget?: number;
}

export interface PredictionResponse {
  predictions: {
    next5Days: number[];
    nextWeek: number[];
    nextMonth: number[];
  };
  insights: {
    title: string;
    description: string;
    type: 'warning' | 'tip' | 'info';
  }[];
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  co2Saved?: number;
  confidence: number;
}

export interface ChartDataPoint {
  value: number;
  label: string;
  type: 'past' | 'predicted';
}

export class EnergyPredictionService {
  static get apiKey(): string | undefined {
    return (
      (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY
    );
  }

  static async testApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      console.log('❌ No Gemini API key found');
      return false;
    }

    try {
      // Test both API versions to see if gemini-2.5-flash is available
      const apiVersions = ['v1beta', 'v1'];
      let foundModel = false;
      
      for (const version of apiVersions) {
        try {
          const testUrl = `https://generativelanguage.googleapis.com/${version}/models?key=${this.apiKey}`;
          console.log(`🧪 Testing ${version} API for gemini-2.5-flash...`);
          
          const response = await fetch(testUrl);
          console.log(`🧪 ${version} API response status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            const models = data.models?.map((m: any) => m.name) || [];
            const hasGemini25Flash = models.includes('models/gemini-2.5-flash');
            console.log(`📋 ${version} API models:`, models.filter((name: string) => name.includes('gemini')));
            console.log(`🎯 gemini-2.5-flash available in ${version}:`, hasGemini25Flash);
            
            if (hasGemini25Flash) {
              foundModel = true;
              console.log(`✅ Found gemini-2.5-flash in ${version} API`);
            }
          } else {
            const errorText = await response.text();
            console.log(`❌ ${version} API failed:`, errorText);
          }
        } catch (error) {
          console.log(`❌ ${version} API error:`, error);
        }
      }
      
      if (foundModel) {
        console.log('✅ Gemini API key is valid and gemini-2.5-flash is available');
        return true;
      } else {
        console.log('❌ gemini-2.5-flash model not found in any API version');
        return false;
      }
    } catch (error) {
      console.log('❌ API key test error:', error);
      return false;
    }
  }

  static async getPredictions(energyData: EnergyData): Promise<PredictionResponse> {
    if (!this.apiKey) {
      console.warn('🔑 Gemini API key not configured');
      return this.getMockPredictions(energyData);
    }

    // Use only the specified free model
    const modelName = 'gemini-2.5-flash';
    
    try {
      console.log(`🤖 Using model: ${modelName}`);
      const result = await this.tryGetPredictions(energyData, modelName);
      console.log(`✅ Success with model: ${modelName}`);
      return result;
    } catch (error) {
      console.log(`❌ Failed with model ${modelName}:`, error);
      console.log('🔄 Using mock predictions instead');
      return this.getMockPredictions(energyData);
    }
  }

  private static async tryGetPredictions(energyData: EnergyData, modelName: string): Promise<PredictionResponse> {
    console.log('🔑 Using Gemini API key:', this.apiKey!.substring(0, 10) + '...');
    
    // Try both v1 and v1beta API versions for gemini-2.5-flash
    const apiVersions = ['v1beta', 'v1'];
    
    for (const version of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${this.apiKey}`;
        console.log(`🌐 Trying ${version} API with model ${modelName}`);
        
        const result = await this.makeApiRequest(url, energyData);
        console.log(`✅ Success with ${version} API`);
        return result;
      } catch (error) {
        console.log(`❌ Failed with ${version} API:`, error);
        continue;
      }
    }
    
    throw new Error(`All API versions failed for model ${modelName}`);
  }

  private static async makeApiRequest(url: string, energyData: EnergyData): Promise<PredictionResponse> {
    const prompt = `You are an energy forecasting assistant. Given the user's past daily kWh data, predict their energy consumption and provide actionable insights.

User Data:
- Average Daily kWh: ${energyData.averageDailyKwh}
- Last 7 Days Usage: ${energyData.last7Days.join(', ')} kWh
- Device Count: ${energyData.deviceCount}
- Monthly Budget: ${energyData.monthlyBudget || 'Not set'} LKR

Please provide:
1. Predictions for next 5 days (array of numbers)
2. Predictions for next 7 days (array of numbers) 
3. Predictions for next 30 days (array of numbers)
4. 3 actionable insights with titles and descriptions
5. Cost estimates (daily, weekly, monthly) assuming 25 LKR per kWh
6. CO2 emissions saved if they reduce usage by 10%
7. Confidence level (0-100)

Return ONLY a valid JSON object with this exact structure:
{
  "predictions": {
    "next5Days": [number array],
    "nextWeek": [number array],
    "nextMonth": [number array]
  },
  "insights": [
    {"title": "string", "description": "string", "type": "warning|tip|info"}
  ],
  "costEstimate": {
    "daily": number,
    "weekly": number,
    "monthly": number
  },
  "co2Saved": number,
  "confidence": number
}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    console.log('🌐 Making request to:', url.split('?')[0]);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('🤖 Gemini raw response:', text);
    
    if (!text.trim()) {
      throw new Error('Empty response from Gemini API');
    }
    
    // Clean up the response and parse JSON
    let cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    // Additional cleanup for common issues
    cleanedText = cleanedText.replace(/^[^{]*({.*})[^}]*$/s, '$1');
    
    console.log('🤖 Cleaned Gemini response:', cleanedText);
    
    const parsed = JSON.parse(cleanedText) as PredictionResponse;
    
    // Validate the response structure
    if (!parsed.predictions || !parsed.insights || !parsed.costEstimate) {
      throw new Error('Invalid response structure from Gemini');
    }
    
    console.log('✅ Gemini prediction successful');
    return parsed;
  }

  static getMockPredictions(energyData: EnergyData): PredictionResponse {
    console.log('🎲 Generating mock predictions for:', {
      userId: energyData.userId,
      avgUsage: energyData.averageDailyKwh.toFixed(1),
      deviceCount: energyData.deviceCount
    });

    const avgUsage = energyData.averageDailyKwh;
    const variance = avgUsage * 0.15; // 15% variance
    
    // Generate predictions with slight trends
    const next5Days = Array.from({ length: 5 }, (_, i) => {
      const trendFactor = 1 + (i * 0.02); // Slight upward trend
      return Math.max(0, avgUsage * trendFactor + (Math.random() - 0.5) * variance);
    });

    const nextWeek = Array.from({ length: 7 }, (_, i) => {
      const isWeekend = i === 5 || i === 6; // Weekend effect
      const weekendMultiplier = isWeekend ? 1.2 : 1.0;
      return Math.max(0, avgUsage * weekendMultiplier + (Math.random() - 0.5) * variance);
    });

    const nextMonth = Array.from({ length: 30 }, (_, i) => {
      const seasonalFactor = 1 + Math.sin((i / 30) * Math.PI) * 0.1;
      return Math.max(0, avgUsage * seasonalFactor + (Math.random() - 0.5) * variance);
    });

    const dailyCost = avgUsage * 25; // 25 LKR per kWh
    const weeklyCost = dailyCost * 7;
    const monthlyCost = dailyCost * 30;

    const mockResponse: PredictionResponse = {
      predictions: {
        next5Days,
        nextWeek,
        nextMonth,
      },
      insights: [
        {
          title: "Peak Usage Alert",
          description: `Your usage tends to peak on weekends. Consider using energy-efficient appliances during these times.`,
          type: "warning"
        },
        {
          title: "Energy Saving Tip",
          description: `You could save up to ${(dailyCost * 0.1).toFixed(0)} LKR daily by reducing AC usage by 1 hour.`,
          type: "tip"
        },
        {
          title: "Usage Pattern",
          description: `Your daily average of ${avgUsage.toFixed(1)} kWh is consistent with similar households.`,
          type: "info"
        }
      ],
      costEstimate: {
        daily: Math.round(dailyCost),
        weekly: Math.round(weeklyCost),
        monthly: Math.round(monthlyCost),
      },
      co2Saved: Math.round(avgUsage * 0.1 * 0.5 * 30), // 10% reduction for 30 days
      confidence: Math.floor(Math.random() * 15) + 80, // 80-95%
    };

    console.log('🎲 Generated mock predictions:', {
      next5DaysAvg: (next5Days.reduce((a, b) => a + b, 0) / next5Days.length).toFixed(1),
      confidence: mockResponse.confidence,
      dailyCost: mockResponse.costEstimate.daily.toString(),
      insightsCount: mockResponse.insights.length
    });

    return mockResponse;
  }

  static generateChartData(
    pastData: number[],
    predictions: number[],
    period: 'daily' | 'weekly' | 'monthly'
  ): ChartDataPoint[] {
    const chartData: ChartDataPoint[] = [];
    const today = new Date();

    // Add past data points
    pastData.forEach((value, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (pastData.length - 1 - index));
      
      chartData.push({
        value: Math.round(value * 100) / 100,
        label: this.formatDate(date, period),
        type: 'past'
      });
    });

    // Add predicted data points
    predictions.forEach((value, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index + 1);
      
      chartData.push({
        value: Math.round(value * 100) / 100,
        label: this.formatDate(date, period),
        type: 'predicted'
      });
    });

    return chartData;
  }

  private static formatDate(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `W${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short' });
      default:
        return date.toLocaleDateString();
    }
  }
}