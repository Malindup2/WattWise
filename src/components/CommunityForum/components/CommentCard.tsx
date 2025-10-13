import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumComment } from '../types';
import { useCommentForm } from '../hooks/useCommentForm';
import { HIT_SLOP, UI_MESSAGES } from '../constants';

interface CommentCardProps {
  comment: ForumComment;
  currentUserId?: string | null;
  onDelete: (commentId: string) => void;
  onReply?: (username: string, commentId?: string) => void;
  onSwipeToComment?: (username: string) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({ 
  comment, 
  currentUserId, 
  onDelete,
  onReply,
  onSwipeToComment 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showReplyOptions, setShowReplyOptions] = useState(false);
  const { formData, submitting, updateContent, updateComment } = useCommentForm();

  const isOwner = currentUserId === comment.uid;
  const dateText = comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : '';

  // Swipe gesture animation
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const swipeThreshold = 60;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) { // Right swipe only
          swipeAnim.setValue(Math.min(gestureState.dx, swipeThreshold));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > swipeThreshold * 0.7) {
          // Successful swipe - trigger mention without popup
          onSwipeToComment?.(comment.author);
        }
        
        // Reset animation
        Animated.spring(swipeAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      },
    })
  ).current;

  const handleEdit = () => {
    setIsEditing(true);
    updateContent(comment.content);
    setShowReplyOptions(false);
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
    Alert.alert('Delete Comment', UI_MESSAGES.DELETE_POST_CONFIRM, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(comment.id),
      },
    ]);
    setShowReplyOptions(false);
  };

  const handleReply = () => {
    onReply?.(comment.author, comment.id);
    setShowReplyOptions(false);
  };

  const handleMention = () => {
    onReply?.(comment.author);
    setShowReplyOptions(false);
  };

  const swipeStyle = {
    transform: [
      {
        translateX: swipeAnim.interpolate({
          inputRange: [0, swipeThreshold],
          outputRange: [0, swipeThreshold],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  if (isEditing) {
    return (
      <View style={[styles.commentCard, isOwner && styles.ownCommentCard]}>
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          value={formData.content}
          onChangeText={updateContent}
          multiline
          placeholder="Edit your comment..."
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <TouchableOpacity onPress={handleCancel} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryBtn, submitting && styles.disabledBtn]} 
            onPress={handleSave}
            disabled={submitting}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Comment Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.commentCard, isOwner && styles.ownCommentCard, { backgroundColor: '#fff' }]}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {comment.author}
            {isOwner && ' (You)'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={styles.commentDate}>{dateText}</Text>

            {/* Options menu for owner - REMOVED REPLY BUTTON FROM HERE */}
            {isOwner && (
              <TouchableOpacity 
                onPress={() => setShowReplyOptions(!showReplyOptions)} 
                hitSlop={HIT_SLOP.SMALL}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.commentBody}>{comment.content}</Text>

        {/* Reply/Mention options - KEEPING ONLY BOTTOM LEFT OPTIONS */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
          <TouchableOpacity 
            onPress={handleReply}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="arrow-undo" size={14} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: 12, marginLeft: 4 }}>
              Reply
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleMention}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="at" size={14} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: 12, marginLeft: 4 }}>
              Mention
            </Text>
          </TouchableOpacity>
        </View>

        {/* Owner options dropdown */}
        {showReplyOptions && isOwner && (
          <View style={{
            position: 'absolute',
            top: 40,
            right: 8,
            backgroundColor: Colors.white,
            borderRadius: 8,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 10,
            borderWidth: 1,
            borderColor: Colors.border,
          }}>
            <TouchableOpacity onPress={handleEdit} style={styles.menuItem}>
              <Ionicons name="create-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.menuItem}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};