/**
 * Post API
 * Handles community posts endpoints
 *
 * Base URL: /api/posts
 */

import { ApiResponse, PaginatedResponse } from "../../../types/api.types";
import {
    CreateFeedCommentRequest,
    CreateFeedPostRequest,
    FeedPost,
    FeedPostComment,
    GetFeedPostsParams,
    UpdateFeedCommentRequest,
    UpdateFeedPostRequest,
} from "../../../types/post.types";
import apiClient from "../apiClient";
import ENDPOINTS from "../endpoints";

// ============================================
// POSTS
// ============================================

/**
 * Get list of posts with pagination
 */
export const getPosts = async (
    params?: GetFeedPostsParams,
): Promise<PaginatedResponse<FeedPost>> => {
    const response = await apiClient.get<PaginatedResponse<FeedPost>>(
        ENDPOINTS.SHARED.POSTS.BASE,
        { params },
    );
    return response.data;
};

/**
 * Get detail of a specific post
 */
export const getPostDetail = async (
    id: string,
): Promise<ApiResponse<FeedPost>> => {
    const response = await apiClient.get<ApiResponse<FeedPost>>(
        ENDPOINTS.SHARED.POSTS.DETAIL(id),
    );
    return response.data;
};

/**
 * Create a new post
 * Uses multipart/form-data for image uploads
 */
export const createPost = async (
    data: CreateFeedPostRequest,
): Promise<ApiResponse<FeedPost>> => {
    const formData = new FormData();
    formData.append("content", data.content);

    if (data.images && data.images.length > 0) {
        data.images.forEach((image: any) => {
            // In React Native, image object typically contains uri, type, and name
            formData.append("images", image as any);
        });
    }

    const response = await apiClient.post<ApiResponse<FeedPost>>(
        ENDPOINTS.SHARED.POSTS.BASE,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        },
    );
    return response.data;
};

/**
 * Update an existing post
 * Uses multipart/form-data for image uploads
 */
export const updatePost = async (
    id: string,
    data: UpdateFeedPostRequest,
): Promise<ApiResponse<FeedPost>> => {
    const formData = new FormData();

    if (data.content !== undefined) {
        formData.append("content", data.content);
    }

    if (data.images && data.images.length > 0) {
        data.images.forEach((image: any) => {
            formData.append("images", image as any);
        });
    }

    const response = await apiClient.put<ApiResponse<FeedPost>>(
        ENDPOINTS.SHARED.POSTS.DETAIL(id),
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        },
    );
    return response.data;
};

/**
 * Delete a post
 */
export const deletePost = async (
    id: string,
): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        ENDPOINTS.SHARED.POSTS.DETAIL(id),
    );
    return response.data;
};

/**
 * Like a post
 */
export const likePost = async (
    id: string,
): Promise<ApiResponse<{ message: string; likes_count: number }>> => {
    const response = await apiClient.post<
        ApiResponse<{ message: string; likes_count: number }>
    >(ENDPOINTS.SHARED.POSTS.LIKE(id));
    return response.data;
};

/**
 * Unlike a post
 */
export const unlikePost = async (
    id: string,
): Promise<ApiResponse<{ message: string; likes_count: number }>> => {
    const response = await apiClient.delete<
        ApiResponse<{ message: string; likes_count: number }>
    >(ENDPOINTS.SHARED.POSTS.LIKE(id));
    return response.data;
};

// ============================================
// COMMENTS
// ============================================

/**
 * Get comments for a post
 */
export const getComments = async (
    postId: string,
    params?: GetFeedPostsParams,
): Promise<PaginatedResponse<FeedPostComment>> => {
    const response = await apiClient.get<PaginatedResponse<FeedPostComment>>(
        ENDPOINTS.SHARED.POSTS.COMMENTS(postId),
        { params },
    );
    return response.data;
};

/**
 * Add a comment to a post
 */
export const addComment = async (
    postId: string,
    data: CreateFeedCommentRequest,
): Promise<ApiResponse<FeedPostComment>> => {
    const payload: { content: string; parent_id?: string } = {
        content: data.content,
    };
    if (data.parent_id) {
        payload.parent_id = data.parent_id;
    }
    const response = await apiClient.post<ApiResponse<FeedPostComment>>(
        ENDPOINTS.SHARED.POSTS.COMMENTS(postId),
        payload,
    );
    return response.data;
};

/**
 * Trả lời comment — POST /posts/:id/comments/:commentId/reply (BE post.routes.js)
 */
export const replyComment = async (
    postId: string,
    parentCommentId: string,
    data: Pick<CreateFeedCommentRequest, "content">,
): Promise<ApiResponse<FeedPostComment>> => {
    const response = await apiClient.post<ApiResponse<FeedPostComment>>(
        ENDPOINTS.SHARED.POSTS.COMMENT_REPLY(postId, parentCommentId),
        { content: data.content },
    );
    return response.data;
};

/**
 * Update a comment
 */
export const updateComment = async (
    postId: string,
    commentId: string,
    data: UpdateFeedCommentRequest,
): Promise<ApiResponse<FeedPostComment>> => {
    const response = await apiClient.put<ApiResponse<FeedPostComment>>(
        ENDPOINTS.SHARED.POSTS.COMMENT_DETAIL(postId, commentId),
        data,
    );
    return response.data;
};

/**
 * Delete a comment
 */
export const deleteComment = async (
    postId: string,
    commentId: string,
): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        ENDPOINTS.SHARED.POSTS.COMMENT_DETAIL(postId, commentId),
    );
    return response.data;
};

// ============================================
// EXPORT
// ============================================

const postApi = {
    // Posts
    getPosts,
    getPostDetail,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    // Comments
    getComments,
    addComment,
    replyComment,
    updateComment,
    deleteComment,
};

export default postApi;
