import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumPost } from '../types';
import { ACCESSIBILITY_LABELS, HIT_SLOP } from '../constants';

interface PostCardProps {
  post: ForumPost;
  currentUserId?: string | null;
  onVote: (post: ForumPost, value: 1 | -1) => void;
  onShowComments: (post: ForumPost) => void;
  onShowMenu: (post: ForumPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onVote,
  onShowComments,
  onShowMenu,
}) => {
  const dateText = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '…';

  const isOwner = currentUserId === post.uid;

  return (
    <View style={styles.card}>
      <View style={styles.postHeaderRow}>
        <Text style={styles.postTitle}>{post.title}</Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => onShowMenu(post)}
            hitSlop={HIT_SLOP.MEDIUM}
            accessibilityLabel={ACCESSIBILITY_LABELS.POST_OPTIONS}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.postMeta}>
        By {post.author} · {dateText}
      </Text>

      <Text style={styles.postContent}>{post.content}</Text>

      {post.mediaUrl && (
        <Image source={{ uri: post.mediaUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => onVote(post, 1)}>
          <Ionicons name="arrow-up-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.iconButtonText}>{post.upVotes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => onVote(post, -1)}>
          <Ionicons name="arrow-down-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.iconButtonText}>{post.downVotes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => onShowComments(post)}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
          <Text style={styles.iconButtonText}>Comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
