import { SummaryRequest, SummaryResponse } from '../types';

class HuggingFaceService {
  private apiKey: string | undefined;
  private baseURL: string = 'https://api-inference.huggingface.co/models';

  // Different models for different tasks
  private models = {
    summarization: 'facebook/bart-large-cnn', // Best for summarization
    // Alternatives:
    // 'google/pegasus-xsum',
    // 'microsoft/DialoGPT-medium'
  };

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY;
    if (!this.apiKey) {
      console.warn('Hugging Face API key not found.');
    }
  }

  async summarizeContent(request: SummaryRequest): Promise<SummaryResponse | null> {
    if (!this.apiKey) {
      console.warn('Hugging Face API key not configured');
      return this.generateFallbackSummary(request);
    }

    try {
      // Hugging Face needs different prompts for summarization models
      const inputs = this.prepareInputs(request);

      const response = await fetch(`${this.baseURL}/${this.models.summarization}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: inputs,
          parameters: {
            max_length: request.maxLength || 150,
            min_length: 30,
            do_sample: false, // Better for consistent summaries
          },
          options: {
            wait_for_model: true, // Wait if model is loading
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle different Hugging Face errors
        if (errorData.error && errorData.error.includes('loading')) {
          console.warn('Hugging Face model is loading, please wait...');
          return this.generateFallbackSummary(request);
        }

        throw new Error(
          `Hugging Face API error: ${response.status} - ${errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();

      // Hugging Face returns array with summary_text
      const summary = data[0]?.summary_text?.trim();

      if (!summary) {
        throw new Error('No summary generated');
      }

      return {
        summary,
        truncated: summary.length >= (request.maxLength || 150),
      };
    } catch (error) {
      console.error('Hugging Face summarization error:', error);
      return this.generateFallbackSummary(request);
    }
  }

  private prepareInputs(request: SummaryRequest): string {
    const { content, type } = request;

    if (type === 'post') {
      return `Bullet summary • key points only: ${content}`;
    } else {
      return `bullet point summary. Identify key themes and conclusions.

"${content}"

Bullet point summary:`;
    }
  }

  private generateFallbackSummary(request: SummaryRequest): SummaryResponse {
    const { content, type, maxLength = 150 } = request;

    let summary: string;

    if (type === 'post') {
      summary = content.length <= maxLength ? content : content.substring(0, maxLength - 3) + '...';
    } else {
      const lines = content.split('\n\n');
      summary = `Discussion with ${lines.length} comments.`;

      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }
    }

    return {
      summary,
      truncated: summary.length >= maxLength,
    };
  }

  // Check if service is available
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.baseURL}/${this.models.summarization}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  shouldSummarizePost(content: string, threshold: number): boolean {
    return content.length > threshold;
  }

  shouldSummarizeComments(comments: any[], threshold: number): boolean {
    return comments.length >= threshold;
  }
}

export const huggingFaceService = new HuggingFaceService();
