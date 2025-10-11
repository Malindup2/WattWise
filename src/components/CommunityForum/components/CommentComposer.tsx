import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics'; // Add haptic feedback
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { useCommentForm } from '../hooks/useCommentForm';
import { UI_MESSAGES } from '../constants';

interface CommentComposerProps {
  postId: string;
  currentUser: any;
  onSubmit: () => void;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  postId,
  currentUser,
  onSubmit,
}) => {
  const { formData, submitting, updateContent, submitComment } = useCommentForm();

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await submitComment(postId);
    if (success) {
      onSubmit();
    }
  };

  const isDisabled = !formData.content.trim() || !currentUser || submitting;

  return (
    <View style={[styles.commentComposer, { paddingBottom: 8 }]}>
      <TextInput
        placeholder={currentUser ? 'Add a comment…' : UI_MESSAGES.LOGIN_TO_COMMENT}
        placeholderTextColor={Colors.textLight}
        style={[styles.input, styles.commentInput]}
        editable={!!currentUser}
        value={formData.content}
        onChangeText={updateContent}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />
      <TouchableOpacity
        style={[styles.primaryBtn, isDisabled && styles.disabledBtn]}
        onPress={handleSubmit}
        disabled={isDisabled}
        activeOpacity={0.9}
      >
        {submitting ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>Post</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};