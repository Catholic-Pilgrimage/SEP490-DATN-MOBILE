/**
 * Post Types
 * Type definitions for Post feature
 */

export interface PostAuthor {
    id: string;
    full_name: string;
    avatar_url?: string;
    role?: string;
}

export interface FeedPost {
    id: string;
    user_id: string;
    content: string;
    image_urls: string[];
    likes_count: number;
    comment_count: number;
    status: string;
    created_at: string;
    updated_at: string;
    is_liked: boolean;
    author: PostAuthor;
}

export interface FeedPostComment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    status: string;
    created_at: string;
    author: PostAuthor;
}

export interface CreateFeedPostRequest {
    content: string;
    images?: any[]; // Array of file objects for React Native (typically with uri, type, name)
}

export interface UpdateFeedPostRequest {
    content?: string;
    images?: any[];
}

export interface CreateFeedCommentRequest {
    content: string;
}

export interface UpdateFeedCommentRequest {
    content: string;
}

export interface GetFeedPostsParams {
    page?: number;
    limit?: number;
}
