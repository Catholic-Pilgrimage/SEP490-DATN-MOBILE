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

export interface FeedPostSourceJournal {
    id: string;
    title?: string;
    content?: string;
    image_url?: string[];
    audio_url?: string | null;
    video_url?: string | null;
    planner_id?: string | null;
    planner_item_id?: string | string[] | null;
    planner_item_ids?: string[] | string | null;
    site_id?: string | null;
    resolved_site_id?: string | null;
    location_scope?: "single_site" | "multi_site";
    site?: FeedPostSite | null;
}

export interface FeedPostSite {
    id: string;
    name: string;
    province?: string;
}

export interface FeedPost {
    id: string;
    user_id: string;
    content: string;
    title?: string;
    image_urls: string[];
    audio_url?: string | null;
    video_url?: string | null;
    likes_count: number;
    comment_count: number;
    comments_count?: number;
    status: string;
    created_at: string;
    updated_at: string;
    is_liked: boolean;
    author: PostAuthor;
    journal_id?: string | null;
    site_id?: string | null;
    planner_id?: string | null;
    is_active?: boolean;
    sourceJournal?: FeedPostSourceJournal | null;
    site?: FeedPostSite | null;
}

export interface FeedPostComment {
    id: string;
    post_id: string;
    user_id: string;
    /** Bình luận gốc: null/undefined; phản hồi: id comment cha (BE `parent_id`) */
    parent_id?: string | null;
    content: string;
    status: string;
    created_at: string;
    author: PostAuthor;
}

export interface CreateFeedPostRequest {
    content: string;
    images?: any[]; // Array of file objects for React Native (typically with uri, type, name)
    video?: any;
    audio?: any;
}

export interface UpdateFeedPostRequest {
    content?: string;
    images?: any[];
    video?: any;
    audio?: any;
}

export interface CreateFeedCommentRequest {
    content: string;
    /** Gửi qua POST .../comments/reply/:id hoặc body `parent_id` tùy API client */
    parent_id?: string;
}

export interface UpdateFeedCommentRequest {
    content: string;
}

export interface GetFeedPostsParams {
    page?: number;
    limit?: number;
}
