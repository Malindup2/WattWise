import { Platform } from 'react-native';
import Constants from 'expo-constants';

type GeminiQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  tip: string;
  category: 'energy-saving' | 'device-efficiency' | 'cost-reduction' | 'eco-tips';
  points: number;
};

export class GeminiService {
  static get apiKey(): string | undefined {
    // Prefer env provided via Expo extra
    return (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  }

  static async generateQuestions(prompt: string): Promise<GeminiQuestion[]> {
    if (!this.apiKey) {
      console.warn('Gemini API key not configured');
      return [];
    }

    // Minimal REST call to Gemini text generation
    // Replace with official SDK if available in project
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + this.apiKey;

    const body = {
      contents: [
        {
          parts: [
            {
              text: `${prompt}\nReturn JSON array with fields: id, question, options[4], answer, tip, category(one of energy-saving|device-efficiency|cost-reduction|eco-tips), points(number). Ensure multiple-choice only and use LKR for costs.`
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed as GeminiQuestion[];
      return [];
    } catch (e) {
      console.warn('Gemini generation failed', e);
      return [];
    }
  }
}


