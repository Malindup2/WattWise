import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { auth } from '../../../config/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../../../styles/CommunityForum.styles';
import { Colors } from '../../constants/Colors';
import { vote, deletePost, deleteComment, createNotification } from './services';
import { useForumPosts } from './hooks/useForumPosts';
import { usePostForm } from './hooks/usePostForm';
import { useMediaPicker } from './hooks/useMediaPicker';
import { ForumPost, SortKey } from './types';
import { UI_MESSAGES, ACCESSIBILITY_LABELS, HIT_SLOP } from './constants';
import { PostCard, PostForm, PostMenu, CommentsModal } from './components';

const getUserDisplayName = async (uid: string): Promise<string> => {
  try {
    // For now, use a simple approach - you can enhance this later
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      return currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    }
    
    // If it's not the current user, return a generic name for now
    return 'User';
  } catch (error) {
    console.error('Error getting user display name:', error);
    return 'User';
  }
};

const CommunityForum: React.FC = () => {
  // State management
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [postMenuFor, setPostMenuFor] = useState<ForumPost | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});

  // Custom hooks
  const { posts, loading } = useForumPosts();
  const { formData, resetForm } = usePostForm();
  const { mediaUri, clearMedia } = useMediaPicker();

  const currentUser = auth.currentUser;

  // Event handlers
  const handleCreatePost = () => {
    if (!currentUser) {
      Alert.alert('Login Required', UI_MESSAGES.LOGIN_REQUIRED);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetForm();
    clearMedia();
    setShowNewPostModal(true);
  };

  const handleEditPost = (post: ForumPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingPostId(post.id);
    setShowNewPostModal(true);
    setPostMenuFor(null);
  };

const handleVote = async (post: ForumPost, value: 1 | -1) => {
  if (!currentUser) return;

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  try {
    setUserVotes(prev => ({
      ...prev,
      [post.id]: value,
    }));

    await vote(post.id, currentUser.uid, value);
    if (post.uid && post.uid !== currentUser.uid) {
      // Get the user's display name properly
      const currentUserName = await getUserDisplayName(currentUser.uid);
      const postTitle = post.title || 'Your post';
      
      console.log('🔔 Creating notification with:', {
        userName: currentUserName,
        postTitle: postTitle
      });
      
      await createNotification(
        value === 1 ? 'upvote' : 'downvote',
        post.uid,
        currentUser.uid,
        currentUserName,
        post.id,
        postTitle
      );
    }
  } catch (error) {
    setUserVotes(prev => {
      const newVotes = { ...prev };
      delete newVotes[post.id];
      return newVotes;
    });
    console.error('Error voting:', error);
  }
};

  const handleDeletePost = async (post: ForumPost) => {
    if (!currentUser || post.uid !== currentUser.uid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete post', UI_MESSAGES.DELETE_POST_CONFIRM, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deletePost(post.id);
          } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleModalClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNewPostModal(false);
    setEditingPostId(null);
    resetForm();
    clearMedia();
  };

  const handleCommentsClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePost(null);
  };

  const handleMenuClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPostMenuFor(null);
  };

  const handleSortChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortKey((prev: SortKey) => (prev === 'date' ? 'popularity' : 'date'));
  };

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    return (posts || [])
      .filter(
        (post: ForumPost) =>
          !search.trim() ||
          post.title.toLowerCase().includes(search.trim().toLowerCase()) ||
          post.content.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a: ForumPost, b: ForumPost) => {
        if (sortKey === 'date') {
          const at = a.createdAt?.toMillis?.() || 0;
          const bt = b.createdAt?.toMillis?.() || 0;
          return bt - at;
        }
        const ascore = (a.upVotes || 0) - (a.downVotes || 0);
        const bscore = (b.upVotes || 0) - (b.downVotes || 0);
        return bscore - ascore;
      });
  }, [posts, search, sortKey]);

  const renderPost = ({ item }: { item: ForumPost }) => (
    <PostCard
      post={item}
      currentUserId={currentUser?.uid}
      onVote={handleVote}
      onShowComments={setActivePost}
      onShowMenu={setPostMenuFor}
      userVotes={userVotes} // Pass the user votes state
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View>
          <Text
            style={[
              styles.headerTitle,
              {
                marginBottom: 0,
                marginTop: 20,
              },
            ]}
          >
            WattSpace 🍃
          </Text>
          <Text
            style={[
              styles.postMeta,
              {
                marginBottom: 0,
              },
            ]}
          >
            Connect with other WattWise users.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreatePost}
          activeOpacity={0.9}
          hitSlop={HIT_SLOP.LARGE}
          accessibilityRole="button"
          accessibilityLabel={ACCESSIBILITY_LABELS.CREATE_NEW_POST}
        >
          <Ionicons name="add" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.addButtonText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={16} color={Colors.textLight} />
            <TextInput
              placeholder="Search posts"
              placeholderTextColor={Colors.textLight}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterChip} onPress={handleSortChange}>
            <Ionicons name="funnel-outline" size={16} color={Colors.primary} />
            <Text style={styles.filterChipText}>{sortKey === 'date' ? 'Date' : 'Popularity'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item: ForumPost) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 0 }]}
          renderItem={renderPost}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>{UI_MESSAGES.NO_POSTS}</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Post Form Modal */}
      <Modal visible={showNewPostModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <PostForm
            isEditing={!!editingPostId}
            editingPostId={editingPostId}
            onSubmit={handleModalClose}
            onCancel={handleModalClose}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Post Menu Modal */}
      <Modal visible={!!postMenuFor} transparent animationType="fade">
        <PostMenu
          post={postMenuFor}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onClose={handleMenuClose}
        />
      </Modal>

      {/* Comments Modal */}
      <CommentsModal
        post={activePost}
        currentUser={currentUser}
        onClose={handleCommentsClose}
        onDeleteComment={handleDeleteComment}
      />
    </View>
  );
};

export default CommunityForum;