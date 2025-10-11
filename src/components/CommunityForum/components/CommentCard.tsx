import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // Add haptic feedback
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumComment } from '../types';
import { useCommentForm } from '../hooks/useCommentForm';
import { HIT_SLOP } from '../constants';

interface CommentCardProps {
  comment: ForumComment;
  currentUserId?: string | null;
  onDelete: (commentId: string) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment, currentUserId, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { formData, submitting, updateContent, updateComment } = useCommentForm();

  const isOwner = currentUserId === comment.uid;
  const dateText = comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : '';

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditing(true);
    updateContent(comment.content);
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await updateComment(comment.id);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete(comment.id);
  };

  if (isEditing) {
    return (
      <View style={[styles.commentCard, isOwner && styles.ownCommentCard]}>
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          value={formData.content}
          onChangeText={updateContent}
          multiline
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <TouchableOpacity onPress={handleCancel} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: '#DC2626' }]}
            onPress={handleDelete}
          >
            <Text style={[styles.secondaryBtnText, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.commentCard, isOwner && styles.ownCommentCard]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>
          {comment.author}
          {isOwner && ' (You)'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={styles.commentDate}>{dateText}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleEdit} hitSlop={HIT_SLOP.SMALL}>
              <Ionicons name="ellipsis-vertical" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.commentBody}>{comment.content}</Text>
    </View>
  );
};