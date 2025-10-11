import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../../config/firebase';
import { COLLECTIONS, MEDIA_CONFIG } from '../constants';
import { ForumPost, ForumComment, VoteData, NotificationData } from '../types';

// Posts CRUD operations
export const createPost = async (
  uid: string,
  author: string,
  title: string,
  content: string,
  mediaUrl?: string | null
): Promise<void> => {
  await addDoc(collection(db, COLLECTIONS.FORUM_POSTS), {
    uid,
    author,
    title: title.trim(),
    content: content.trim(),
    createdAt: serverTimestamp(),
    likesCount: 0,
    upVotes: 0,
    downVotes: 0,
    mediaUrl: mediaUrl || null,
  });
};

export const updatePost = async (postId: string, title: string, content: string): Promise<void> => {
  const postRef = doc(db, COLLECTIONS.FORUM_POSTS, postId);
  await updateDoc(postRef, { 
    title: title.trim(), 
    content: content.trim() 
  });
};

export const deletePost = async (postId: string): Promise<void> => {
  // Delete the post
  await deleteDoc(doc(db, COLLECTIONS.FORUM_POSTS, postId));
  
  // Delete associated comments
  const commentsQuery = query(
    collection(db, COLLECTIONS.FORUM_COMMENTS), 
    where('postId', '==', postId)
  );
  const commentsSnapshot = await getDocs(commentsQuery);
  await Promise.all(
    commentsSnapshot.docs.map(d => 
      deleteDoc(doc(db, COLLECTIONS.FORUM_COMMENTS, d.id))
    )
  );
};

export const subscribeToPosts = (callback: (posts: ForumPost[]) => void): () => void => {
  const postsQuery = query(
    collection(db, COLLECTIONS.FORUM_POSTS), 
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(postsQuery, (snapshot) => {
    const posts: ForumPost[] = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...(d.data() as any) 
    }));
    callback(posts);
  });
};

// Comments operations
export const createComment = async (
  postId: string,
  uid: string,
  author: string,
  content: string
): Promise<void> => {
  await addDoc(collection(db, COLLECTIONS.FORUM_COMMENTS), {
    postId,
    uid,
    author,
    content: content.trim(),
    createdAt: serverTimestamp(),
  });
};

export const updateComment = async (commentId: string, content: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.FORUM_COMMENTS, commentId), {
    content: content.trim(),
  });
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.FORUM_COMMENTS, commentId));
};

export const subscribeToComments = (postId: string, callback: (comments: ForumComment[]) => void): () => void => {
  const commentsQuery = query(
    collection(db, COLLECTIONS.FORUM_COMMENTS),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(commentsQuery, (snapshot) => {
    const comments: ForumComment[] = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...(d.data() as any) 
    }));
    callback(comments);
  });
};

// Voting system
export const vote = async (postId: string, uid: string, value: 1 | -1): Promise<void> => {
  const voteDocRef = doc(db, COLLECTIONS.FORUM_POSTS, postId, COLLECTIONS.VOTES, uid);
  const existingSnap = await getDoc(voteDocRef);
  const prev = existingSnap.exists() ? ((existingSnap.data() as VoteData)?.value ?? null) : null;
  
  if (prev === value) {
    // Unvote
    await deleteDoc(voteDocRef);
    const fields = value === 1 ? { upVotes: increment(-1) } : { downVotes: increment(-1) };
    await updateDoc(doc(db, COLLECTIONS.FORUM_POSTS, postId), fields);
  } else {
    // Set or switch vote
    const updateFields = prev == null
      ? value === 1
        ? { upVotes: increment(1) }
        : { downVotes: increment(1) }
      : value === 1
        ? { upVotes: increment(1), downVotes: increment(-1) }
        : { downVotes: increment(1), upVotes: increment(-1) };
    
    await updateDoc(doc(db, COLLECTIONS.FORUM_POSTS, postId), updateFields);
    await setDoc(voteDocRef, { value }, { merge: true });
  }
};

export const createNotification = async (
  type: 'upvote' | 'downvote',
  toUid: string,
  fromUid: string,
  postId: string
): Promise<void> => {
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    type,
    toUid,
    fromUid,
    postId,
    createdAt: serverTimestamp(),
  } as Omit<NotificationData, 'id'>);
};

// Media operations
export const uploadMedia = async (uid: string, mediaUri: string): Promise<string> => {
  const response = await fetch(mediaUri);
  const blob = await response.blob();
  const fileName = `${uid}_${Date.now()}`;
  const ref = storageRef(storage, `${MEDIA_CONFIG.STORAGE_PATH}/${uid}/${fileName}`);
  await uploadBytes(ref, blob);
  return await getDownloadURL(ref);
};
