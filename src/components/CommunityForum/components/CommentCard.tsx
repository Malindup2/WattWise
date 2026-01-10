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

  // Smooth swipe animation
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeThreshold = 40;
  const isSwiping = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes that start from the left
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
      },
      onPanResponderGrant: () => {
        isSwiping.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) { // Right swipe only
          // Smooth damping effect - slows down as it approaches threshold
          const dampedX = gestureState.dx * (1 - Math.min(gestureState.dx / 200, 0.3));
          translateX.setValue(Math.min(dampedX, swipeThreshold));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isSwiping.current = false;
        
        if (gestureState.dx > swipeThreshold * 0.4) {
          // Successful swipe - smooth animation to threshold and back
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: swipeThreshold,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            onSwipeToComment?.(comment.author);
          });
        } else {
          // Return to original position with spring animation
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        isSwiping.current = false;
        // Return to original position if gesture is interrupted
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
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

  // Smooth background fade based on swipe progress
  const bgOpacity = translateX.interpolate({
    inputRange: [0, swipeThreshold],
    outputRange: [0, 0.08],
    extrapolate: 'clamp',
  });

  // Smooth translate animation
  const cardStyle = {
    transform: [{ translateX }],
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
    <View style={{ position: 'relative' }}>
      {/* Subtle swipe background */}
      <Animated.View 
        style={[
          styles.commentCard,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            backgroundColor: Colors.primary,
            opacity: bgOpacity,
          }
        ]}
      />

      {/* Main Comment Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.commentCard, 
          isOwner && styles.ownCommentCard, 
          { backgroundColor: '#fff' },
          cardStyle
        ]}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {comment.author}
            {isOwner && ' (You)'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={styles.commentDate}>{dateText}</Text>

            {/* Options menu for owner */}
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

        {/* Reply button */}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity 
            onPress={handleReply}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 6,
              backgroundColor: 'transparent',
            }}
          >
            <Ionicons name="arrow-undo" size={14} color={Colors.primary} />
            <Text style={{ 
              color: Colors.primary, 
              fontSize: 12, 
              marginLeft: 4,
              fontWeight: '500'
            }}>
              Reply
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
            <TouchableOpacity 
              onPress={handleEdit} 
              style={[styles.menuItem, { paddingVertical: 8 }]}
            >
              <Ionicons name="create-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDelete} 
              style={[styles.menuItem, { paddingVertical: 8 }]}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};