import { useEffect, useState } from 'react';
import {
  generatePostSummary,
  subscribeToPostSummary,
  getPostSummary,
} from '../services/ForumService';
import { PostSummary } from '../types';
import { openAIService } from '../services/OpenAIService';

interface UsePostSummarizationProps {
  postId: string;
  content: string;
  autoGenerate?: boolean;
}

export const usePostSummarization = ({
  postId,
  content,
  autoGenerate = true,
}: UsePostSummarizationProps) => {
  const [summary, setSummary] = useState<PostSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to summary updates
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = subscribeToPostSummary(postId, (newSummary: PostSummary | null) => {
      setSummary(newSummary);
    });

    return () => unsubscribe();
  }, [postId]);

  // Auto-generate summary if conditions are met
  useEffect(() => {
    const autoGenerateSummary = async () => {
      if (!autoGenerate || !postId || !content || summary || !openAIService.isConfigured()) return;

      const shouldSummarize = openAIService.shouldSummarizePost(content, 300);

      if (shouldSummarize) {
        const existingSummary = await getPostSummary(postId);
        if (!existingSummary) {
          await generateSummary();
        }
      }
    };

    autoGenerateSummary();
  }, [postId, content, autoGenerate, summary]);

  const generateSummary = async (): Promise<string | null> => {
    if (!postId || !content) return null;

    setGenerating(true);
    setError(null);

    try {
      const newSummary = await generatePostSummary(postId, content);
      return newSummary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      console.error('Summary generation error:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const refreshSummary = async (): Promise<string | null> => {
    return generateSummary();
  };

  return {
    summary: summary?.summary,
    generating,
    error,
    generateSummary,
    refreshSummary,
    hasSummary: !!summary,
  };
};
