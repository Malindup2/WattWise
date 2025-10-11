import { useEffect, useState } from 'react';
import { subscribeToComments } from '../services';
import { ForumComment } from '../types';

export const useForumComments = (postId: string | null) => {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      return;
    }

    setLoading(true);
    
    const unsubscribe = subscribeToComments(postId, (newComments) => {
      setComments(newComments);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [postId]);

  return { comments, loading, error };
};
