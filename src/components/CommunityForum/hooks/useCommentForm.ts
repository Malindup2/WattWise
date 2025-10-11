import { useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../../../config/firebase';
import { createComment, updateComment } from '../services';
import { CommentFormData } from '../types';

export const useCommentForm = () => {
  const [formData, setFormData] = useState<CommentFormData>({ content: '' });
  const [submitting, setSubmitting] = useState(false);

  const updateContent = (content: string) => {
    setFormData({ content });
  };

  const resetForm = () => {
    setFormData({ content: '' });
  };

  const validateForm = (): boolean => {
    return !!formData.content.trim();
  };

  const submitComment = async (postId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to comment.');
      return false;
    }

    if (!validateForm()) {
      return false;
    }

    setSubmitting(true);
    try {
      await createComment(
        postId,
        currentUser.uid,
        currentUser.email?.split('@')[0] || 'User',
        formData.content
      );
      resetForm();
      return true;
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to create comment. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateCommentHandler = async (commentId: string): Promise<boolean> => {
    if (!validateForm()) {
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
    validateForm,
    submitComment,
    updateComment: updateCommentHandler,
  };
};
