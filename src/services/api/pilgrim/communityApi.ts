/**
 * Pilgrim Community API
 * Handles community features for Pilgrims
 *
 * Endpoints:
 * - GET/POST /api/posts — bài viết & bình luận (khớp post.routes.js)
 * - POST /api/posts/:id/comments/:commentId/reply — trả lời comment
 * - GET    /api/community/testimonies   - List testimonies
 * - POST   /api/community/testimonies   - Create testimony
 * - GET    /api/community/groups        - List groups
 * - POST   /api/community/groups/:id/join - Join group
 * - POST   /api/community/groups/:id/leave - Leave group
 */

import { ApiResponse, PaginatedResponse } from "../../../types/api.types";
import {
    CommunityGroup,
    CommunityPost,
    CreateCommentRequest,
    CreatePostRequest,
    CreateTestimonyRequest,
    GetPostsParams,
    PostComment,
    Testimony,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// POSTS
// ============================================

/**
 * Get list of posts
 */
export const getPosts = async (
  params?: GetPostsParams,
): Promise<PaginatedResponse<CommunityPost>> => {
  const response = await apiClient.get<PaginatedResponse<CommunityPost>>(
    PILGRIM_ENDPOINTS.COMMUNITY.POSTS,
    { params },
  );
  return response.data;
};

/**
 * Get post detail
 */
export const getPostDetail = async (
  id: string,
): Promise<ApiResponse<CommunityPost>> => {
  const response = await apiClient.get<ApiResponse<CommunityPost>>(
    PILGRIM_ENDPOINTS.COMMUNITY.POST_DETAIL(id),
  );
  return response.data;
};

/**
 * Create post
 */
export const createPost = async (
  data: CreatePostRequest,
): Promise<ApiResponse<CommunityPost>> => {
  const response = await apiClient.post<ApiResponse<CommunityPost>>(
    PILGRIM_ENDPOINTS.COMMUNITY.CREATE_POST,
    data,
  );
  return response.data;
};

/**
 * Like/unlike post
 */
export const likePost = async (
  postId: string,
): Promise<ApiResponse<{ liked: boolean }>> => {
  const response = await apiClient.post<ApiResponse<{ liked: boolean }>>(
    PILGRIM_ENDPOINTS.COMMUNITY.LIKE_POST(postId),
  );
  return response.data;
};

// ============================================
// COMMENTS
// ============================================

/**
 * Get post comments
 */
export const getComments = async (
  postId: string,
): Promise<ApiResponse<PostComment[]>> => {
  const response = await apiClient.get<ApiResponse<PostComment[]>>(
    PILGRIM_ENDPOINTS.COMMUNITY.COMMENTS(postId),
  );
  return response.data;
};

/**
 * Add comment to post
 */
export const addComment = async (
  postId: string,
  data: CreateCommentRequest,
): Promise<ApiResponse<PostComment>> => {
  const payload: { content: string; parent_id?: string } = {
    content: data.content,
  };
  if (data.parentId) {
    payload.parent_id = data.parentId;
  }
  const response = await apiClient.post<ApiResponse<PostComment>>(
    PILGRIM_ENDPOINTS.COMMUNITY.ADD_COMMENT(postId),
    payload,
  );
  return response.data;
};

/** POST /posts/:postId/comments/:commentId/reply */
export const replyComment = async (
  postId: string,
  parentCommentId: string,
  data: Pick<CreateCommentRequest, "content">,
): Promise<ApiResponse<PostComment>> => {
  const response = await apiClient.post<ApiResponse<PostComment>>(
    PILGRIM_ENDPOINTS.COMMUNITY.COMMENT_REPLY(postId, parentCommentId),
    data,
  );
  return response.data;
};

// ============================================
// TESTIMONIES
// ============================================

/**
 * Get testimonies
 */
export const getTestimonies = async (
  params?: GetPostsParams,
): Promise<PaginatedResponse<Testimony>> => {
  const response = await apiClient.get<PaginatedResponse<Testimony>>(
    PILGRIM_ENDPOINTS.COMMUNITY.TESTIMONIES,
    { params },
  );
  return response.data;
};

/**
 * Create testimony
 */
export const createTestimony = async (
  data: CreateTestimonyRequest,
): Promise<ApiResponse<Testimony>> => {
  const response = await apiClient.post<ApiResponse<Testimony>>(
    PILGRIM_ENDPOINTS.COMMUNITY.CREATE_TESTIMONY,
    data,
  );
  return response.data;
};

// ============================================
// GROUPS
// ============================================

/**
 * Get groups
 */
export const getGroups = async (): Promise<ApiResponse<CommunityGroup[]>> => {
  const response = await apiClient.get<ApiResponse<CommunityGroup[]>>(
    PILGRIM_ENDPOINTS.COMMUNITY.GROUPS,
  );
  return response.data;
};

/**
 * Get group detail
 */
export const getGroupDetail = async (
  id: string,
): Promise<ApiResponse<CommunityGroup>> => {
  const response = await apiClient.get<ApiResponse<CommunityGroup>>(
    PILGRIM_ENDPOINTS.COMMUNITY.GROUP_DETAIL(id),
  );
  return response.data;
};

/**
 * Join group
 */
export const joinGroup = async (
  groupId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.COMMUNITY.JOIN_GROUP(groupId),
  );
  return response.data;
};

/**
 * Leave group
 */
export const leaveGroup = async (
  groupId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.COMMUNITY.LEAVE_GROUP(groupId),
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimCommunityApi = {
  // Posts
  getPosts,
  getPostDetail,
  createPost,
  likePost,
  // Comments
  getComments,
  addComment,
  replyComment,
  // Testimonies
  getTestimonies,
  createTestimony,
  // Groups
  getGroups,
  getGroupDetail,
  joinGroup,
  leaveGroup,
};

export default pilgrimCommunityApi;
