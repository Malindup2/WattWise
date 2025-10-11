import { Timestamp } from 'firebase/firestore';

export interface ForumPost {
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
}

export interface ForumComment {
  id: string;
  postId: string;
  uid: string;
  author: string;
  content: string;
  createdAt?: Timestamp;
}

export interface VoteData {
  value: 1 | -1;
}

export interface NotificationData {
  type: 'upvote' | 'downvote';
  toUid: string;
  fromUid: string;
  postId: string;
  createdAt: Timestamp;
}

export type SortKey = 'date' | 'popularity';

export interface PostFormData {
  title: string;
  content: string;
  mediaUri?: string | null;
}

export interface CommentFormData {
  content: string;
}

// Summarization Types
export interface PostSummary {
  id: string;
  postId: string;
  summary: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CommentSummary {
  id: string;
  postId: string;
  summary: string;
  commentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SummarizationConfig {
  enabled: boolean;
  postLengthThreshold: number;
  commentCountThreshold: number;
  maxSummaryLength: number;
}

// OpenAI Service Types
export interface SummaryRequest {
  content: string;
  type: 'post' | 'comments';
  maxLength?: number;
}

export interface SummaryResponse {
  summary: string;
  truncated: boolean;
}
