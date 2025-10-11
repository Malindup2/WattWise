import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumPost } from '../types';
import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import { useForumComments } from '../hooks/useForumComments';
import { UI_MESSAGES } from '../constants';

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

  if (!post) return null;

  return (
    <Modal visible={!!post} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalCard, { maxHeight: '86%' }]}
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

            <View style={styles.commentsListWrap}>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
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

            <CommentComposer
              postId={post.id}
              currentUser={currentUser}
              onSubmit={() => {}}
            />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};
