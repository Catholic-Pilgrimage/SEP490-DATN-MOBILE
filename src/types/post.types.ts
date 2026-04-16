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

export interface SharedLocation {
    site_id: string;
    name: string;
    province?: string;
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
    shared_locations?: SharedLocation[];
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
    shared_locations?: SharedLocation[];
    planner?: any;
    journey?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        status: string;
        number_of_days: number;
        number_of_people: number;
        transportation: string;
        cloneable?: boolean;
        summary?: {
            total_days: number;
            total_stops: number;
            visited_stops: number;
            skipped_stops: number;
            upcoming_stops: number;
            visited_percentage: number;
            cover_image?: string;
            can_clone?: boolean;
        };
        items_by_day?: Record<string, any[]>;
    } | null;
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
    title?: string;
    content: string;
    images?: any[]; // Array of file objects for React Native (typically with uri, type, name)
    video?: any;
    audio?: any;
}

export interface UpdateFeedPostRequest {
    title?: string;
    content?: string;
    images?: any[];
    video?: any;
    audio?: any;
    image_urls?: string[];
    video_url?: string | null;
    audio_url?: string | null;
    clear_images?: boolean;
    clear_video?: boolean;
    clear_audio?: boolean;
}

export interface CreateFeedCommentRequest {
    content: string;
    /** Gửi qua POST .../comments/reply/:id hoặc body `parent_id` tùy API client */
    parent_id?: string;
}

export interface UpdateFeedCommentRequest {
    content: string;
}

export interface FeedTranslationResult {
    translated_text: string;
    translated_title?: string;
    original_text?: string;
    source_language?: string;
    target_language?: string;
}

export interface GetFeedPostsParams {
    page?: number;
    limit?: number;
}
