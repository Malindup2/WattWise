import { useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../../../config/firebase';
import { createComment, updateComment } from '../services';
import { CommentFormData } from '../types';
import { UI_MESSAGES } from '../constants';

export const useCommentForm = () => {
  const [formData, setFormData] = useState<CommentFormData>({
    content: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateContent = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const resetForm = () => {
    setFormData({ content: '' });
  };

  const submitComment = async (postId: string, parentCommentId?: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Login Required', UI_MESSAGES.LOGIN_REQUIRED);
      return false;
    }

    if (!formData.content.trim()) {
      return false;
    }

    setSubmitting(true);
    try {
      const author = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      
      // Create comment - parentCommentId is optional and will be undefined if not provided
      await createComment(postId, currentUser.uid, author, formData.content);
      
      resetForm();
      return true;
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateCommentHandler = async (commentId: string): Promise<boolean> => {
    if (!formData.content.trim()) {
      return false;
    }

    setSubmitting(true);
    try {
      await updateComment(commentId, formData.content);
      resetForm();
      return true;
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    submitting,
    updateContent,
    resetForm,
    submitComment,
    updateComment: updateCommentHandler,
  };
};