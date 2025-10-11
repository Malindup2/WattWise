import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // Add haptic feedback
import { Colors } from '../../../constants/Colors';
import { styles } from '../../../../styles/CommunityForum.styles';
import { ForumPost } from '../types';
import { ACCESSIBILITY_LABELS, HIT_SLOP, SUMMARIZATION_MESSAGES } from '../constants';
import { usePostSummarization } from '../hooks/usePostSummarization';

interface PostCardProps {
  post: ForumPost;
  currentUserId?: string | null;
  onVote: (post: ForumPost, value: 1 | -1) => void;
  onShowComments: (post: ForumPost) => void;
  onShowMenu: (post: ForumPost) => void;
  userVotes?: Record<string, 1 | -1>; // Add user votes state
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onVote,
  onShowComments,
  onShowMenu,
  userVotes = {},
}) => {
  const { summary, generating, error, generateSummary, hasSummary } = usePostSummarization({
    postId: post.id,
    content: post.content,
    autoGenerate: true,
  });

  const dateText = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : '…';
  const isOwner = currentUserId === post.uid;
  const userVote = userVotes[post.id]; // Get user's vote for this post

  const handleVote = async (value: 1 | -1) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVote(post, value);
  };

  const handleShowComments = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowComments(post);
  };

  const handleShowMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShowMenu(post);
  };

  const handleManualSummary = async () => {
    if (generating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await generateSummary();
    if (result) {
      Alert.alert('Success', 'Summary generated successfully!');
    } else if (error) {
      Alert.alert('Error', SUMMARIZATION_MESSAGES.SUMMARY_ERROR);
    }
  };

  const shouldShowManualTrigger = !hasSummary && !generating && post.content.length > 200;

  // Determine icon colors based on vote state
  const upVoteIconColor = userVote === 1 ? styles.votedUpIcon : styles.defaultVoteIcon;
  const downVoteIconColor = userVote === -1 ? styles.votedDownIcon : styles.defaultVoteIcon;

  return (
    <View style={[styles.card, isOwner && styles.ownPostCard]}>
      <View style={styles.postHeaderRow}>
        <Text style={styles.postTitle}>{post.title}</Text>
        {isOwner && (
          <TouchableOpacity
            onPress={handleShowMenu}
            hitSlop={HIT_SLOP.MEDIUM}
            accessibilityLabel={ACCESSIBILITY_LABELS.POST_OPTIONS}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.postMeta}>
        By {post.author} · {dateText}
        {isOwner && ' · Your post'}
      </Text>

      <Text style={styles.postContent}>{post.content}</Text>

      {post.mediaUrl && (
        <Image source={{ uri: post.mediaUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* AI Summary Section */}
      {(hasSummary || generating || shouldShowManualTrigger) && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Ionicons
              name={hasSummary ? 'sparkles' : 'sparkles-outline'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.summaryTitle}>{SUMMARIZATION_MESSAGES.POST_SUMMARY_TITLE}</Text>
            {hasSummary && !generating && (
              <TouchableOpacity
                onPress={handleManualSummary}
                style={styles.refreshButton}
                hitSlop={HIT_SLOP.SMALL}
              >
                <Ionicons name="refresh" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {generating ? (
            <View style={styles.generatingContainer}>
              <Text style={styles.generatingText}>{SUMMARIZATION_MESSAGES.GENERATING_SUMMARY}</Text>
            </View>
          ) : summary ? (
            <Text style={styles.summaryText}>{summary}</Text>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{SUMMARIZATION_MESSAGES.SUMMARY_ERROR}</Text>
              <TouchableOpacity onPress={handleManualSummary}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : shouldShowManualTrigger ? (
            <TouchableOpacity style={styles.generateSummaryButton} onPress={handleManualSummary}>
              <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
              <Text style={styles.generateSummaryText}>
                {SUMMARIZATION_MESSAGES.GENERATE_SUMMARY}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleVote(1)}>
          <Ionicons 
            name={userVote === 1 ? "arrow-up-circle" : "arrow-up-circle-outline"} 
            size={20} 
            style={upVoteIconColor}
          />
          <Text style={styles.iconButtonText}>{post.upVotes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => handleVote(-1)}>
          <Ionicons 
            name={userVote === -1 ? "arrow-down-circle" : "arrow-down-circle-outline"} 
            size={20} 
            style={downVoteIconColor}
          />
          <Text style={styles.iconButtonText}>{post.downVotes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleShowComments}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
          <Text style={styles.iconButtonText}>Comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};