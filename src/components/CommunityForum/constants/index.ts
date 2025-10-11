export const COLLECTIONS = {
  FORUM_POSTS: 'forum_posts',
  FORUM_COMMENTS: 'forum_comments',
  NOTIFICATIONS: 'notifications',
  VOTES: 'votes',
} as const;

export const MEDIA_CONFIG = {
  STORAGE_PATH: 'forum_media',
  IMAGE_QUALITY: 0.8,
} as const;

export const UI_MESSAGES = {
  LOGIN_REQUIRED: 'Please log in to create a post.',
  PERMISSION_REQUIRED: 'Media library access is needed to attach photos.',
  IMAGE_PICKER_UNAVAILABLE: 'Please install expo-image-picker to attach images.',
  DELETE_POST_CONFIRM: 'Are you sure you want to delete this post?',
  NO_POSTS: 'No posts yet. Be the first to start a discussion!',
  NO_COMMENTS: 'No comments yet.',
  LOGIN_TO_COMMENT: 'Log in to comment',
} as const;

export const ACCESSIBILITY_LABELS = {
  POST_OPTIONS: 'Post options',
  CREATE_NEW_POST: 'Create new post',
} as const;

export const HIT_SLOP = {
  SMALL: { top: 6, bottom: 6, left: 6, right: 6 },
  MEDIUM: { top: 8, bottom: 8, left: 8, right: 8 },
  LARGE: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;
