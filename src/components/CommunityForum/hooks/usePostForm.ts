import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../../../config/firebase';
import { createPost, updatePost, uploadMedia } from '../services';
import { PostFormData, ForumPost } from '../types';
import { UI_MESSAGES } from '../constants';

interface UsePostFormProps {
  isEditing?: boolean;
  editingPost?: ForumPost | null; // Add editingPost prop
}

export const usePostForm = ({ isEditing = false, editingPost }: UsePostFormProps = {}) => {
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    mediaUri: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Load post data when editing
  useEffect(() => {
    if (isEditing && editingPost) {
      setFormData({
        title: editingPost.title || '',
        content: editingPost.content || '',
        mediaUri: editingPost.mediaUrl || null,
      });
    }
  }, [isEditing, editingPost]);

  const updateField = (field: keyof PostFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      mediaUri: null,
    });
  };

  const validateForm = (): boolean => {
    return !!(formData.title.trim() && formData.content.trim());
  };

  const submitPost = async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Login Required', UI_MESSAGES.LOGIN_REQUIRED);
      return false;
    }

    if (!validateForm()) {
      return false;
    }

    setSubmitting(true);
    try {
      let mediaUrl: string | undefined;

      if (formData.mediaUri) {
        setUploadingMedia(true);
        mediaUrl = await uploadMedia(currentUser.uid, formData.mediaUri);
        setUploadingMedia(false);
      }

      await createPost(
        currentUser.uid,
        currentUser.email?.split('@')[0] || 'User',
        formData.title,
        formData.content,
        mediaUrl
      );

      resetForm();
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updatePostHandler = async (postId: string): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    setSubmitting(true);
    try {
      await updatePost(postId, formData.title, formData.content);
      resetForm();
      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    submitting,
    uploadingMedia,
    updateField,
    resetForm,
    validateForm,
    submitPost,
    updatePost: updatePostHandler,
  };
};