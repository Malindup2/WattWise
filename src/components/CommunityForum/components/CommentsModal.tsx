import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
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

  const { summary, generating, error, generateSummary, hasSummary, commentCount } =
    useCommentSummarization({
      postId: post?.id || '',
      comments,
      autoGenerate: true,
    });

  const handleManualCommentSummary = async () => {
    if (generating) return;

    const result = await generateSummary();
    if (result) {
      Alert.alert('Success', 'Discussion summary generated!');
    } else if (error) {
      Alert.alert('Error', SUMMARIZATION_MESSAGES.SUMMARY_ERROR);
    }
  };

  const shouldShowManualTrigger = !hasSummary && !generating && comments.length >= 3;

  if (!post) return null;

  return (
    <Modal visible={!!post} animationType="slide" transparent>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalCard, { maxHeight: '86%', flex: 1 }]}
            onPress={() => {}}
          >
            <View style={styles.commentsHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.postPreview}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postMeta}>By {post.author}</Text>
              <Text style={styles.postContent}>{post.content}</Text>
            </View>

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

            <View style={{ flex: 1 }}>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {comments.map(comment => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.uid}
                      onDelete={onDeleteComment}
                    />
                  ))}
                  {comments.length === 0 && (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="chatbubble-outline" size={32} color={Colors.textLight} />
                      <Text style={styles.emptyText}>{UI_MESSAGES.NO_COMMENTS}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>

            <CommentComposer postId={post.id} currentUser={currentUser} onSubmit={() => {}} />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};
