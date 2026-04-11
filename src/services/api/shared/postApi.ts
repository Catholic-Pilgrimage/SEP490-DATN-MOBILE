/**
 * Post API
 * Handles community posts endpoints
 *
 * Base URL: /api/posts
 */

import { Platform } from "react-native";
import { ApiResponse, PaginatedResponse } from "../../../types/api.types";
import {
    CreateFeedCommentRequest,
    CreateFeedPostRequest,
    FeedPost,
    FeedPostComment,
    FeedTranslationResult,
    GetFeedPostsParams,
    UpdateFeedCommentRequest,
    UpdateFeedPostRequest,
} from "../../../types/post.types";
import { normalizeImageUrls } from "../../../utils/postgresArrayParser";
import { getAudioUploadMeta } from "../../../utils/audioUpload";
import { apiClient } from "../apiClient";
import { ENDPOINTS } from "../endpoints";

const mergeUrlLists = (...lists: (string[] | undefined)[]): string[] =>
    Array.from(
        new Set(
            lists
                .flatMap((list) => list || [])
                .map((item) => item.trim())
                .filter((item) => item.length > 0),
        ),
    );

const normalizeFeedPost = (post: any): FeedPost => {
    const sourceJournal = post?.sourceJournal
        ? {
              ...post.sourceJournal,
              image_url: normalizeImageUrls(post.sourceJournal.image_url),
              audio_url: post.sourceJournal.audio_url ?? null,
              video_url: post.sourceJournal.video_url ?? null,
          }
        : null;

    const imageUrls = mergeUrlLists(
        normalizeImageUrls(post?.image_urls),
        sourceJournal?.image_url,
    );

    return {
        ...post,
        image_urls: imageUrls,
        audio_url: post?.audio_url ?? sourceJournal?.audio_url ?? null,
        video_url: post?.video_url ?? sourceJournal?.video_url ?? null,
        comment_count: Number(post?.comment_count ?? post?.comments_count ?? 0),
        comments_count: Number(post?.comments_count ?? post?.comment_count ?? 0),
        is_liked: Boolean(post?.is_liked),
        sourceJournal,
    };
};

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
};

const firstMatchingFieldValue = (
    source: Record<string, unknown> | undefined,
    matcher: RegExp,
): string | undefined => {
    if (!source) return undefined;

    for (const [key, value] of Object.entries(source)) {
        if (matcher.test(key) && typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }

    return undefined;
};

const normalizeTranslationResult = (payload: any): FeedTranslationResult => {
    const container = payload?.data ?? payload;
    const containerRecord =
        container && typeof container === "object"
            ? (container as Record<string, unknown>)
            : undefined;

    const translatedText = firstNonEmptyString(
        container?.translated_text,
        container?.translatedText,
        container?.translated_content,
        container?.translatedContent,
        container?.translation_text,
        container?.translationText,
        container?.translation,
        container?.translated,
        container?.content_en,
        container?.content_vi,
        container?.comment_en,
        container?.comment_vi,
        container?.content,
        container?.text,
        container?.result,
        container?.output,
        container?.translated?.text,
        container?.translation?.text,
        firstMatchingFieldValue(containerRecord, /^content_[a-z]{2}(?:-[A-Z]{2})?$/i),
        firstMatchingFieldValue(containerRecord, /^comment_[a-z]{2}(?:-[A-Z]{2})?$/i),
        firstMatchingFieldValue(containerRecord, /^text_[a-z]{2}(?:-[A-Z]{2})?$/i),
    );

    if (!translatedText) {
        throw new Error("Translation response missing translated text.");
    }

    return {
        translated_text: translatedText,
        translated_title: firstNonEmptyString(
            container?.translated_title,
            container?.translatedTitle,
            container?.title_en,
            container?.title_vi,
            firstMatchingFieldValue(containerRecord, /^title_[a-z]{2}(?:-[A-Z]{2})?$/i),
        ),
        original_text: firstNonEmptyString(
            container?.original_text,
            container?.originalText,
            container?.source_text,
            container?.sourceText,
        ),
        source_language: firstNonEmptyString(
            container?.source_language,
            container?.sourceLanguage,
            container?.detected_language,
            container?.detectedLanguage,
            container?.from_language,
            container?.fromLanguage,
        ),
        target_language: firstNonEmptyString(
            container?.target_language,
            container?.targetLanguage,
            container?.to_language,
            container?.toLanguage,
            container?.language,
        ),
    };
};

const normalizeTranslationResponse = (
    payload: any,
): ApiResponse<FeedTranslationResult> => {
    const wrapper =
        payload && typeof payload === "object" ? payload : { data: payload };

    return {
        success: wrapper.success ?? true,
        message: typeof wrapper.message === "string" ? wrapper.message : "",
        data: normalizeTranslationResult(wrapper.data ?? wrapper),
        error: wrapper.error,
    };
};

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
    const rawData = response.data.data;
    const rawPosts = rawData?.items || (rawData as any)?.posts || [];
    const normalizedPosts = rawPosts.map(normalizeFeedPost);

    return {
        ...response.data,
        data: rawData
            ? {
                  ...rawData,
                  items: normalizedPosts,
                  posts: normalizedPosts,
              }
            : rawData,
    };
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
    return {
        ...response.data,
        data: response.data.data ? normalizeFeedPost(response.data.data) : response.data.data,
    };
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

    if (data.video) {
        formData.append("video", data.video as any);
    }

    if (data.audio) {
        // Re-build the audio file object at the service layer (same pattern as journalApi)
        // so that:
        //  1. The MIME type is always "audio/*"  (not inferred from extension by RN).
        //  2. The file name ends in .m4a, never .mp4, avoiding the backend
        //     image-format validator: "Image file format mp4 not allowed".
        const audioUri: string =
            typeof data.audio === "string" ? data.audio : data.audio.uri;
        const { extension, mimeType } = getAudioUploadMeta(audioUri);
        formData.append("audio", {
            uri: Platform.OS === "ios" ? audioUri.replace("file://", "") : audioUri,
            type: mimeType,
            name: `post_audio.${extension}`,
        } as any);
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

    if (data.image_urls !== undefined) {
        formData.append("image_urls", JSON.stringify(data.image_urls));
    }

    if (data.audio_url !== undefined) {
        formData.append("audio_url", data.audio_url ?? "");
    }

    if (data.video_url !== undefined) {
        formData.append("video_url", data.video_url ?? "");
    }

    if (data.clear_images !== undefined) {
        formData.append("clear_images", String(data.clear_images));
    }

    if (data.clear_audio !== undefined) {
        formData.append("clear_audio", String(data.clear_audio));
    }

    if (data.clear_video !== undefined) {
        formData.append("clear_video", String(data.clear_video));
    }

    if (data.images && data.images.length > 0) {
        data.images.forEach((image: any) => {
            formData.append("images", image as any);
        });
    }

    if (data.video) {
        formData.append("video", data.video as any);
    }

    if (data.audio) {
        // Same re-building logic as createPost — always use audio MIME type
        // and force .m4a extension to avoid backend image-validator rejection.
        const audioUri: string =
            typeof data.audio === "string" ? data.audio : data.audio.uri;
        const { extension, mimeType } = getAudioUploadMeta(audioUri);
        formData.append("audio", {
            uri: Platform.OS === "ios" ? audioUri.replace("file://", "") : audioUri,
            type: mimeType,
            name: `post_audio.${extension}`,
        } as any);
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
 * Translate a post content with AI
 */
export const translatePost = async (
    id: string,
): Promise<ApiResponse<FeedTranslationResult>> => {
    const response = await apiClient.get<ApiResponse<any>>(
        ENDPOINTS.SHARED.POSTS.TRANSLATE(id),
    );
    return normalizeTranslationResponse(response.data);
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

/**
 * Translate a comment content with AI
 */
export const translateComment = async (
    postId: string,
    commentId: string,
): Promise<ApiResponse<FeedTranslationResult>> => {
    const response = await apiClient.get<ApiResponse<any>>(
        ENDPOINTS.SHARED.POSTS.COMMENT_TRANSLATE(postId, commentId),
    );
    return normalizeTranslationResponse(response.data);
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
    translatePost,
    // Comments
    getComments,
    addComment,
    replyComment,
    updateComment,
    deleteComment,
    translateComment,
};

export default postApi;
