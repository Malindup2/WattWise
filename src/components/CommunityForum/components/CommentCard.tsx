import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentUserId,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { formData, submitting, updateContent, updateComment } = useCommentForm();

  const isOwner = currentUserId === comment.uid;
  const dateText = comment.createdAt?.toDate 
    ? comment.createdAt.toDate().toLocaleString() 
    : '';

  const handleEdit = () => {
    setIsEditing(true);
    updateContent(comment.content);
  };

  const handleSave = async () => {
    const success = await updateComment(comment.id);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(comment.id);
  };

  if (isEditing) {
    return (
      <View style={styles.commentCard}>
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
            <Text style={[styles.secondaryBtnText, { color: '#DC2626' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{comment.author}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={styles.commentDate}>{dateText}</Text>
          {isOwner && (
            <TouchableOpacity
              onPress={handleEdit}
              hitSlop={HIT_SLOP.SMALL}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.commentBody}>{comment.content}</Text>
    </View>
  );
};
