import { useEffect, useState } from 'react';
import {
  generateCommentSummary,
  subscribeToCommentSummary,
  getCommentSummary,
} from '../services/ForumService';
import { CommentSummary, ForumComment } from '../types';
import { openAIService } from '../services/OpenAIService';

interface UseCommentSummarizationProps {
  postId: string;
  comments: ForumComment[];
  autoGenerate?: boolean;
}

export const useCommentSummarization = ({
  postId,
  comments,
  autoGenerate = true,
}: UseCommentSummarizationProps) => {
  const [summary, setSummary] = useState<CommentSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to summary updates
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = subscribeToCommentSummary(postId, (newSummary: CommentSummary | null) => {
      setSummary(newSummary);
    });

    return () => unsubscribe();
  }, [postId]);

  // Auto-generate summary if conditions are met
  useEffect(() => {
    const autoGenerateSummary = async () => {
      if (!autoGenerate || !postId || !comments.length || summary || !openAIService.isConfigured())
        return;

      const shouldSummarize = openAIService.shouldSummarizeComments(comments, 5);

      if (shouldSummarize) {
        const existingSummary = await getCommentSummary(postId);
        if (!existingSummary || existingSummary.commentCount !== comments.length) {
          await generateSummary();
        }
      }
    };

    autoGenerateSummary();
  }, [postId, comments, autoGenerate, summary]);

  const generateSummary = async (): Promise<string | null> => {
    if (!postId || !comments.length) return null;

    setGenerating(true);
    setError(null);

    try {
      const newSummary = await generateCommentSummary(postId, comments);
      return newSummary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      console.error('Comment summary generation error:', err);
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
    commentCount: summary?.commentCount || comments.length,
  };
};
