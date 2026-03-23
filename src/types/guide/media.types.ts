/**
 * Guide Types - Media
 * Type definitions for Local Guide Media feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Media type (API / GET list).
 * Upload từ app Guide: chỉ `image` | `video` (file hoặc URL YouTube → lưu `video`).
 * `model_3d` do hệ thống quản trị; client chỉ đọc & hiển thị.
 */
export type MediaType = "image" | "video" | "model_3d";

/** Chỉ `image` | `video` gửi được từ app Guide (file hoặc YouTube → video). */
export type GuideUploadableMediaType = Extract<MediaType, "image" | "video">;

/**
 * Media approval status
 */
export type MediaStatus = "pending" | "approved" | "rejected";

/**
 * Trạng thái thuyết minh 3D — đồng bộ `narrative_status` backend (SiteMedia).
 * Khai báo inline để tránh import vòng với `narrative.types.ts`.
 */
export type MediaNarrativeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processing";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Media item returned from API
 */
export interface MediaItem {
  id: string;
  site_id: string;
  code: string;
  url: string;
  type: MediaType;
  caption: string;
  status: MediaStatus;
  rejection_reason: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  duration?: number;
  /** Chỉ meaningful với `type === "model_3d"` — thuyết minh TTS / upload */
  narration_text?: string | null;
  audio_url?: string | null;
  narrative_status?: MediaNarrativeStatus | null;
  narrative_rejection_reason?: string | null;
}

/**
 * Media list pagination info
 */
export interface MediaPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Media list response data structure
 */
export interface MediaListData {
  data: MediaItem[];
  pagination: MediaPagination;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * React Native file object for FormData
 * This is the format React Native expects for file uploads
 */
export interface RNFileObject {
  uri: string;
  name: string;
  type: string; // MIME type like "image/jpeg", "video/mp4"
}

/**
 * Parameters for fetching media list
 * GET /api/local-guide/media
 * @param type - Optional filter; allowed values: `image` | `video` | `model_3d`
 */
export interface GetMediaParams {
  page?: number;
  limit?: number;
  type?: MediaType;
  status?: MediaStatus;
  is_active?: boolean;
}

/**
 * GET /api/local-guide/site-media — toàn bộ media đã duyệt của site (Local Guide xem được, gồm 3D).
 * Cùng cấu trúc response với {@link MediaListData} nếu backend dùng chung wrapper.
 */
export type GetSiteMediaParams = Pick<
  GetMediaParams,
  "page" | "limit" | "type"
>;

/**
 * Request body for uploading media with file
 * POST /api/local-guide/media (multipart/form-data)
 */
export interface UploadMediaRequest {
  type: GuideUploadableMediaType;
  caption?: string;
  file?: RNFileObject;
}

/**
 * Request body for uploading media with YouTube URL
 * POST /api/local-guide/media (application/json)
 */
export interface UploadMediaWithYouTubeRequest {
  type: "video";
  url: string;
  caption?: string;
}

/**
 * Request body for updating media
 * PUT /api/local-guide/media/{id}
 * Note: Only pending or rejected media can be updated
 */
export interface UpdateMediaRequest {
  type?: MediaType;
  caption?: string;
  file?: RNFileObject;
  url?: string;
}
