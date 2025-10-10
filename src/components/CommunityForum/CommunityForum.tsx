import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styles } from '../../../styles/CommunityForum.styles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db, storage } from '../../../config/firebase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

type ForumPost = {
  id: string;
  uid: string;
  author: string;
  title: string;
  content: string;
  createdAt?: Timestamp;
  likesCount?: number;
  mediaUrl?: string | null;
  upVotes?: number;
  downVotes?: number;
};

type ForumComment = {
  id: string;
  postId: string;
  uid: string;
  author: string;
  content: string;
  createdAt?: Timestamp;
};

const POSTS_COLLECTION = 'forum_posts';
const COMMENTS_COLLECTION = 'forum_comments';

const CommunityForum: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'date' | 'popularity'>('date');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postMenuFor, setPostMenuFor] = useState<ForumPost | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const insets = useSafeAreaInsets();

  // Subscribe to posts in real-time
  useEffect(() => {
    // default subscribe by date; we will client-sort for popularity
    const q = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snapshot => {
        const data: ForumPost[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setPosts(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Load comments when activePost changes
  useEffect(() => {
    if (!activePost) {
      setComments([]);
      return;
    }
    setCommentLoading(true);
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('postId', '==', activePost.id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snapshot => {
        const data: ForumComment[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setComments(data);
        setCommentLoading(false);
      },
      () => setCommentLoading(false)
    );
    return () => unsub();
  }, [activePost?.id]);

  const currentUser = auth.currentUser;

  const handleCreatePost = async () => {
    if (!currentUser) return;
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      let mediaUrl: string | undefined;
      if (mediaUri) {
        setUploadingMedia(true);
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const fileName = `${currentUser.uid}_${Date.now()}`;
        const ref = storageRef(storage, `forum_media/${currentUser.uid}/${fileName}`);
        await uploadBytes(ref, blob);
        mediaUrl = await getDownloadURL(ref);
        setUploadingMedia(false);
      }
      await addDoc(collection(db, POSTS_COLLECTION), {
        uid: currentUser.uid,
        author: currentUser.email?.split('@')[0] || 'User',
        title: newTitle.trim(),
        content: newContent.trim(),
        createdAt: serverTimestamp(),
        likesCount: 0,
        upVotes: 0,
        downVotes: 0,
        mediaUrl: mediaUrl || null,
      });
      setNewTitle('');
      setNewContent('');
      setShowNewPostModal(false);
      setMediaUri(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || !activePost) return;
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, COMMENTS_COLLECTION), {
        postId: activePost.id,
        uid: currentUser.uid,
        author: currentUser.email?.split('@')[0] || 'User',
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  // Voting system: store user votes in subcollection forum_posts/{postId}/votes/{uid}: { value: 1 | -1 }
  const handleVote = async (post: ForumPost, value: 1 | -1) => {
    if (!currentUser) return;
    try {
      const voteDocRef = doc(db, POSTS_COLLECTION, post.id, 'votes', currentUser.uid);
      const existingSnap = await getDoc(voteDocRef);
      const prev = existingSnap.exists() ? ((existingSnap.data() as any)?.value ?? null) : null;
      if (prev === value) {
        // unvote
        await deleteDoc(voteDocRef);
        const fields = value === 1 ? { upVotes: increment(-1) } : { downVotes: increment(-1) };
        await updateDoc(doc(db, POSTS_COLLECTION, post.id), fields);
      } else {
        // set or switch vote
        await updateDoc(
          doc(db, POSTS_COLLECTION, post.id),
          prev == null
            ? value === 1
              ? { upVotes: increment(1) }
              : { downVotes: increment(1) }
            : value === 1
              ? { upVotes: increment(1), downVotes: increment(-1) }
              : { downVotes: increment(1), upVotes: increment(-1) }
        );
        await setDoc(voteDocRef, { value }, { merge: true });
        if (post.uid && post.uid !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            type: value === 1 ? 'upvote' : 'downvote',
            toUid: post.uid,
            fromUid: currentUser.uid,
            postId: post.id,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (e) {
      // noop
    }
  };

  const handlePickImage = async () => {
    try {
      // Dynamically require to avoid type resolution error if not installed
      // @ts-ignore
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library access is needed to attach photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setMediaUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert(
        'Image picker not available',
        'Please install expo-image-picker to attach images.'
      );
    }
  };

  const openEditPost = (post: ForumPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setShowNewPostModal(true);
    setPostMenuFor(null);
  };

  const handleSavePost = async () => {
    if (!currentUser || !editingPostId) return;
    if (!editTitle.trim() || !editContent.trim()) return;
    setSubmitting(true);
    try {
      const postRef = doc(db, POSTS_COLLECTION, editingPostId);
      await updateDoc(postRef, { title: editTitle.trim(), content: editContent.trim() });
      setEditingPostId(null);
      setShowNewPostModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: ForumPost) => {
    if (!currentUser || post.uid !== currentUser.uid) return;
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, POSTS_COLLECTION, post.id));
            // Optionally: delete comments - fetch then delete
            const q = query(collection(db, COMMENTS_COLLECTION), where('postId', '==', post.id));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, COMMENTS_COLLECTION, d.id))));
          } catch {}
        },
      },
    ]);
  };

  const renderPost = ({ item }: { item: ForumPost }) => {
    const dateText = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '…';
    return (
      <View style={styles.card}>
        <View style={styles.postHeaderRow}>
          <Text style={styles.postTitle}>{item.title}</Text>
          {currentUser?.uid === item.uid && (
            <TouchableOpacity
              onPress={() => setPostMenuFor(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Post options"
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postMeta}>
          By {item.author} · {dateText}
        </Text>
        <Text style={styles.postContent}>{item.content}</Text>
        {item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="cover" />
        ) : null}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleVote(item, 1)}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.iconButtonText}>{item.upVotes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleVote(item, -1)}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.iconButtonText}>{item.downVotes || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => setActivePost(item)}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
            <Text style={styles.iconButtonText}>Comments</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Forum</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (!currentUser) {
              Alert.alert('Login required', 'Please log in to create a post.');
              return;
            }
            setShowNewPostModal(true);
          }}
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Create new post"
        >
          <Ionicons name="add" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.addButtonText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter below header */}
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
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setSortKey(prev => (prev === 'date' ? 'popularity' : 'date'))}
          >
            <Ionicons name="funnel-outline" size={16} color={Colors.primary} />
            <Text style={styles.filterChipText}>{sortKey === 'date' ? 'Date' : 'Popularity'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={(posts || [])
            .filter(
              p =>
                !search.trim() ||
                p.title.toLowerCase().includes(search.trim().toLowerCase()) ||
                p.content.toLowerCase().includes(search.trim().toLowerCase())
            )
            .sort((a, b) => {
              if (sortKey === 'date') {
                const at = a.createdAt?.toMillis?.() || 0;
                const bt = b.createdAt?.toMillis?.() || 0;
                return bt - at;
              }
              const ascore = (a.upVotes || 0) - (a.downVotes || 0);
              const bscore = (b.upVotes || 0) - (b.downVotes || 0);
              return bscore - ascore;
            })}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderPost}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>
                No posts yet. Be the first to start a discussion!
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* New Post Modal */}
      <Modal visible={showNewPostModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
            <TextInput
              placeholder="Title"
              placeholderTextColor={Colors.textLight}
              value={editingPostId ? editTitle : newTitle}
              onChangeText={editingPostId ? setEditTitle : setNewTitle}
              style={styles.input}
            />
            <TextInput
              placeholder="Share your thoughts…"
              placeholderTextColor={Colors.textLight}
              value={editingPostId ? editContent : newContent}
              onChangeText={editingPostId ? setEditContent : setNewContent}
              style={[styles.input, styles.textarea]}
              multiline
            />
            {!editingPostId && (
              <View style={styles.mediaRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={18} color={Colors.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { marginLeft: 6 }]}>Add Photo</Text>
                </TouchableOpacity>
                {mediaUri && <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setShowNewPostModal(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              {editingPostId ? (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!editTitle.trim() || !editContent.trim() || submitting) && styles.disabledBtn,
                  ]}
                  onPress={handleSavePost}
                  disabled={!editTitle.trim() || !editContent.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!newTitle.trim() || !newContent.trim() || submitting || uploadingMedia) &&
                      styles.disabledBtn,
                  ]}
                  onPress={handleCreatePost}
                  disabled={!newTitle.trim() || !newContent.trim() || submitting || uploadingMedia}
                >
                  {submitting || uploadingMedia ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Post</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Post action menu */}
      <Modal visible={!!postMenuFor} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setPostMenuFor(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.menuCard} onPress={() => {}}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => postMenuFor && openEditPost(postMenuFor)}
            >
              <Ionicons name="create-outline" size={18} color={Colors.textPrimary} />
              <Text style={styles.menuItemText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => postMenuFor && handleDeletePost(postMenuFor)}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setPostMenuFor(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={!!activePost} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActivePost(null)}
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
                <TouchableOpacity onPress={() => setActivePost(null)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {activePost && (
                <View style={styles.postPreview}>
                  <Text style={styles.postTitle}>{activePost.title}</Text>
                  <Text style={styles.postMeta}>By {activePost.author}</Text>
                  <Text style={styles.postContent}>{activePost.content}</Text>
                </View>
              )}

              <View style={styles.commentsListWrap}>
                {commentLoading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {comments.map(c => (
                      <View key={c.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{c.author}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={styles.commentDate}>
                              {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ''}
                            </Text>
                            {currentUser?.uid === c.uid && (
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingCommentId(c.id);
                                  setEditCommentText(c.content);
                                }}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        {editingCommentId === c.id ? (
                          <View>
                            <TextInput
                              style={[styles.input, { marginBottom: 8 }]}
                              value={editCommentText}
                              onChangeText={setEditCommentText}
                              multiline
                            />
                            <View
                              style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}
                            >
                              <TouchableOpacity
                                onPress={() => setEditingCommentId(null)}
                                style={styles.secondaryBtn}
                              >
                                <Text style={styles.secondaryBtnText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={async () => {
                                  try {
                                    await updateDoc(doc(db, COMMENTS_COLLECTION, c.id), {
                                      content: editCommentText.trim(),
                                    });
                                    setEditingCommentId(null);
                                  } catch {}
                                }}
                              >
                                <Text style={styles.primaryBtnText}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.secondaryBtn, { borderColor: '#DC2626' }]}
                                onPress={async () => {
                                  try {
                                    await deleteDoc(doc(db, COMMENTS_COLLECTION, c.id));
                                  } catch {}
                                }}
                              >
                                <Text style={[styles.secondaryBtnText, { color: '#DC2626' }]}>
                                  Delete
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.commentBody}>{c.content}</Text>
                        )}
                      </View>
                    ))}
                    {comments.length === 0 && (
                      <View style={styles.emptyWrap}>
                        <Ionicons name="chatbubble-outline" size={32} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No comments yet.</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>

              <View style={[styles.commentComposer, { paddingBottom: Math.max(8, insets.bottom) }]}>
                <TextInput
                  placeholder={currentUser ? 'Add a comment…' : 'Log in to comment'}
                  placeholderTextColor={Colors.textLight}
                  style={[styles.input, styles.commentInput]}
                  editable={!!currentUser}
                  value={newComment}
                  onChangeText={setNewComment}
                  returnKeyType="send"
                  onSubmitEditing={handleAddComment}
                />
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!newComment.trim() || !currentUser || submitting) && styles.disabledBtn,
                  ]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || !currentUser || submitting}
                  activeOpacity={0.9}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CommunityForum;
