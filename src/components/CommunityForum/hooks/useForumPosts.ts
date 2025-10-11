import { useEffect, useState } from 'react';
import { subscribeToPosts } from '../services';
import { ForumPost } from '../types';

export const useForumPosts = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  return { posts, loading, error };
};
