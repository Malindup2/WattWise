import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { useCommentForm } from '../hooks/useCommentForm';

interface CommentComposerProps {
  postId: string;
  currentUser: any;
  replyingTo?: string | null;
  parentCommentId?: string | null;
  onCancelReply?: () => void;
  onSubmit?: () => void;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  postId,
  currentUser,
  replyingTo,
  parentCommentId,
  onCancelReply,
  onSubmit,
}) => {
  const { formData, submitting, updateContent, submitComment, resetForm } = useCommentForm();
  const [inputHeight, setInputHeight] = useState(40);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      // Auto-focus and set mention text when replying
      inputRef.current.focus();
      updateContent(`@${replyingTo} `);
    }
  }, [replyingTo]);

  const handleSubmit = async () => {
    if (!formData.content.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Convert null to undefined for the service call
    const commentParentId = parentCommentId || undefined;
    
    const success = await submitComment(postId, commentParentId);
    
    if (success) {
      resetForm();
      onSubmit?.();
      Keyboard.dismiss();
      onCancelReply?.();
    }
  };

  const handleCancelReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    onCancelReply?.();
  };

  const isDisabled = submitting || !formData.content.trim();

  return (
    <View style={styles.commentComposerContainer}>
      {/* Reply Header */}
      {replyingTo && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingHorizontal: 8,
        }}>
          <Text style={{ color: Colors.primary, fontSize: 14 }}>
            Replying to <Text style={{ fontWeight: '600' }}>{replyingTo}</Text>
          </Text>
          <TouchableOpacity onPress={handleCancelReply} hitSlop={8}>
            <Ionicons name="close" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment Input */}
      <View style={styles.commentComposer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            styles.commentInput,
            { height: Math.max(40, inputHeight) }
          ]}
          placeholder={replyingTo ? `Reply to ${replyingTo}...` : "Add a comment..."}
          placeholderTextColor={Colors.textLight}
          value={formData.content}
          onChangeText={updateContent}
          multiline
          onContentSizeChange={(e) => {
            setInputHeight(e.nativeEvent.contentSize.height);
          }}
          editable={!submitting}
        />
        <TouchableOpacity
          style={[styles.primaryBtnSm, isDisabled && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={isDisabled}
        >
          {submitting ? (
            <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textOnPrimary} />
          ) : (
            <Ionicons name="send" size={16} color={Colors.textOnPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};