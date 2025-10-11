import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { usePostForm } from '../hooks/usePostForm';
import { useMediaPicker } from '../hooks/useMediaPicker';

interface PostFormProps {
  isEditing?: boolean;
  editingPostId?: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export const PostForm: React.FC<PostFormProps> = ({
  isEditing = false,
  editingPostId,
  onSubmit,
  onCancel,
}) => {
  const { formData, submitting, uploadingMedia, updateField, submitPost, updatePost } =
    usePostForm();

  const { mediaUri, pickImage, clearMedia } = useMediaPicker();

  const handleSubmit = async () => {
    const success =
      isEditing && editingPostId ? await updatePost(editingPostId) : await submitPost();

    if (success) {
      onSubmit();
    }
  };

  const isDisabled =
    submitting || uploadingMedia || !formData.title.trim() || !formData.content.trim();

  return (
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>{isEditing ? 'Edit Post' : 'Create Post'}</Text>

      <TextInput
        placeholder="Title"
        placeholderTextColor={Colors.textLight}
        value={formData.title}
        onChangeText={value => updateField('title', value)}
        style={styles.input}
      />

      <TextInput
        placeholder="Share your thoughts…"
        placeholderTextColor={Colors.textLight}
        value={formData.content}
        onChangeText={value => updateField('content', value)}
        style={[styles.input, styles.textarea]}
        multiline
      />

      {!isEditing && (
        <View style={styles.mediaRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={18} color={Colors.textPrimary} />
            <Text style={[styles.secondaryBtnText, { marginLeft: 6 }]}>Add Photo</Text>
          </TouchableOpacity>
          {mediaUri && <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />}
        </View>
      )}

      <View style={styles.modalActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, isDisabled && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={isDisabled}
        >
          {submitting || uploadingMedia ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>{isEditing ? 'Save' : 'Post'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
