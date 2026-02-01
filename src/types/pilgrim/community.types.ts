/**
 * Pilgrim Types - Community
 * Type definitions for Pilgrim Community feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Post visibility
 */
export type PostVisibility = "public" | "group" | "friends";

/**
 * Content type
 */
export type ContentType = "post" | "testimony" | "prayer_request" | "event";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Community post
 */
export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  images: string[];
  contentType: ContentType;
  visibility: PostVisibility;
  siteId?: string;
  siteName?: string;
  groupId?: string;
  groupName?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Post comment
 */
export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  isLiked: boolean;
  replies?: PostComment[];
  createdAt: string;
}

/**
 * Testimony
 */
export interface Testimony {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  content: string;
  siteId?: string;
  siteName?: string;
  likes: number;
  isLiked: boolean;
  isApproved: boolean;
  createdAt: string;
}

/**
 * Community group
 */
export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  memberCount: number;
  postCount: number;
  isJoined: boolean;
  isPublic: boolean;
  createdAt: string;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create post request
 */
export interface CreatePostRequest {
  content: string;
  images?: string[];
  contentType?: ContentType;
  visibility?: PostVisibility;
  siteId?: string;
  groupId?: string;
}

/**
 * Create comment request
 */
export interface CreateCommentRequest {
  content: string;
  parentId?: string; // for replies
}

/**
 * Create testimony request
 */
export interface CreateTestimonyRequest {
  title: string;
  content: string;
  siteId?: string;
}

/**
 * Get posts params
 */
export interface GetPostsParams {
  contentType?: ContentType;
  siteId?: string;
  groupId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}
