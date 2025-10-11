import { SummaryRequest, SummaryResponse } from '../types';

class OpenAIService {
  private apiKey: string | undefined;
  private baseURL: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Summarization will be disabled.');
    }
  }

  async summarizeContent(request: SummaryRequest): Promise<SummaryResponse | null> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
      return null;
    }

    try {
      const prompt = this.buildPrompt(request);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that creates concise, informative summaries. Always respond with just the summary text, no additional commentary.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: request.maxLength || 150,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content?.trim();

      if (!summary) {
        throw new Error('No summary generated');
      }

      return {
        summary,
        truncated: summary.length >= (request.maxLength || 150),
      };
    } catch (error) {
      console.error('OpenAI summarization error:', error);
      return null;
    }
  }

  private buildPrompt(request: SummaryRequest): string {
    const { content, type, maxLength = 150 } = request;

    if (type === 'post') {
      return `Please provide a concise summary of the following forum post in ${maxLength} characters or less. Focus on the main points and key information:

"${content}"

Summary:`;
    } else {
      return `Please provide a concise summary of the main discussion points from these forum comments in ${maxLength} characters or less. Identify key themes and conclusions:

"${content}"

Summary:`;
    }
  }

  // Check if content needs summarization
  shouldSummarizePost(content: string, threshold: number): boolean {
    return content.length > threshold;
  }

  shouldSummarizeComments(comments: any[], threshold: number): boolean {
    return comments.length >= threshold;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const openAIService = new OpenAIService();
