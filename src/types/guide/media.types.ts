/**
 * Guide Types - Media
 * Type definitions for Local Guide Media feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Media type
 */
export type MediaType = "image" | "video" | "panorama";

/**
 * Media approval status
 */
export type MediaStatus = "pending" | "approved" | "rejected";

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
 */
export interface GetMediaParams {
  page?: number;
  limit?: number;
  type?: MediaType;
  status?: MediaStatus;
  is_active?: boolean;
}

/**
 * Request body for uploading media with file
 * POST /api/local-guide/media (multipart/form-data)
 */
export interface UploadMediaRequest {
  type: MediaType;
  caption?: string;
  file?: RNFileObject;
}

/**
 * Request body for uploading media with YouTube URL
 * POST /api/local-guide/media (application/json)
 */
export interface UploadMediaWithYouTubeRequest {
  type: MediaType;
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
