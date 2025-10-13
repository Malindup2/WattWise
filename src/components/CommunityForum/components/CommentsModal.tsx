import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumPost } from '../types';
import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import { useForumComments } from '../hooks/useForumComments';
import { useCommentSummarization } from '../hooks/useCommentSummarization';
import { UI_MESSAGES, SUMMARIZATION_MESSAGES } from '../constants';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface CommentsModalProps {
  post: ForumPost | null;
  currentUser: any;
  onClose: () => void;
  onDeleteComment: (commentId: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  post,
  currentUser,
  onClose,
  onDeleteComment,
}) => {
  const { comments, loading } = useForumComments(post?.id || null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [parentCommentId, setParentCommentId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const { summary, generating, error, generateSummary, hasSummary, commentCount } =
    useCommentSummarization({
      postId: post?.id || '',
      comments,
      autoGenerate: true,
    });

  // Handle keyboard visibility
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleManualCommentSummary = async () => {
    if (generating) return;

    const result = await generateSummary();
    if (result) {
      Alert.alert('Success', 'Discussion summary generated!');
    } else if (error) {
      Alert.alert('Error', SUMMARIZATION_MESSAGES.SUMMARY_ERROR);
    }
  };

  const handleReply = (username: string, commentId?: string) => {
    setReplyingTo(username);
    setParentCommentId(commentId ? commentId : null);
  };

  const handleSwipeToComment = (username: string) => {
    // Simply set the reply without any popup or haptic feedback
    setReplyingTo(username);
    setParentCommentId(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setParentCommentId(null);
  };

  const handleCommentSubmit = () => {
    setReplyingTo(null);
    setParentCommentId(null);
  };

  const shouldShowManualTrigger = !hasSummary && !generating && comments.length >= 3;

  if (!post) return null;

  return (
    <Modal visible={!!post} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ 
              flex: 1, 
              justifyContent: 'flex-end',
            }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -10 : 0}
          >
            <TouchableWithoutFeedback>
              <View 
                style={[
                  styles.modalCard, 
                  {  
                    flex: 1,
                    maxHeight: keyboardVisible ? '80%' : '90%'
                  }
                ]}
              >
                <View style={styles.commentsHeader}>
                  <Text style={styles.modalTitle}>Comments</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Fixed Content - Header and Post Preview */}
                <View style={styles.postPreview}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postMeta}>By {post.author}</Text>
                  <Text style={styles.postContent}>{post.content}</Text>
                </View>

                {/* Scrollable Content - Summary and Comments */}
                <View style={{ flex: 1 }}>
                  {loading ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator color={Colors.primary} />
                    </View>
                  ) : (
                    <KeyboardAwareScrollView
                      contentContainerStyle={{ 
                        flexGrow: 1,
                        paddingBottom: keyboardVisible ? 80 : 16 
                      }}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      extraScrollHeight={Platform.OS === 'ios' ? 0 : 20}
                      enableOnAndroid={true}
                    >
                      {/* Discussion Summary Section */}
                      {(hasSummary || generating || shouldShowManualTrigger) && (
                        <View style={styles.summaryContainer}>
                          <View style={styles.summaryHeader}>
                            <Ionicons
                              name={hasSummary ? 'chatbubbles' : 'chatbubbles-outline'}
                              size={16}
                              color={Colors.primary}
                            />
                            <Text style={styles.summaryTitle}>
                              {SUMMARIZATION_MESSAGES.COMMENT_SUMMARY_TITLE}
                              {commentCount > 0 && ` (${commentCount} comments)`}
                            </Text>
                            {hasSummary && !generating && (
                              <TouchableOpacity
                                onPress={handleManualCommentSummary}
                                style={styles.refreshButton}
                              >
                                <Ionicons name="refresh" size={14} color={Colors.primary} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {generating ? (
                            <View style={styles.generatingContainer}>
                              <Text style={styles.generatingText}>
                                {SUMMARIZATION_MESSAGES.GENERATING_SUMMARY}
                              </Text>
                            </View>
                          ) : summary ? (
                            <Text style={styles.summaryText}>{summary}</Text>
                          ) : error ? (
                            <View style={styles.errorContainer}>
                              <Text style={styles.errorText}>{SUMMARIZATION_MESSAGES.SUMMARY_ERROR}</Text>
                              <TouchableOpacity onPress={handleManualCommentSummary}>
                                <Text style={styles.retryText}>Retry</Text>
                              </TouchableOpacity>
                            </View>
                          ) : shouldShowManualTrigger ? (
                            <TouchableOpacity
                              style={styles.generateSummaryButton}
                              onPress={handleManualCommentSummary}
                            >
                              <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                              <Text style={styles.generateSummaryText}>
                                {SUMMARIZATION_MESSAGES.GENERATE_SUMMARY}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}

                      {/* Comments List */}
                      {comments.map(comment => (
                        <CommentCard
                          key={comment.id}
                          comment={comment}
                          currentUserId={currentUser?.uid}
                          onDelete={onDeleteComment}
                          onReply={handleReply}
                          onSwipeToComment={handleSwipeToComment}
                        />
                      ))}
                      
                      {comments.length === 0 && (
                        <View style={styles.emptyWrap}>
                          <Ionicons name="chatbubble-outline" size={32} color={Colors.textLight} />
                          <Text style={styles.emptyText}>{UI_MESSAGES.NO_COMMENTS}</Text>
                        </View>
                      )}
                    </KeyboardAwareScrollView>
                  )}
                </View>

                {/* Comment Composer - Fixed at bottom */}
                <View style={[
                  styles.composerWrapper,
                  keyboardVisible && styles.composerWithKeyboard
                ]}>
                  <CommentComposer 
                    postId={post.id} 
                    currentUser={currentUser} 
                    replyingTo={replyingTo}
                    parentCommentId={parentCommentId}
                    onCancelReply={handleCancelReply}
                    onSubmit={handleCommentSubmit}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};