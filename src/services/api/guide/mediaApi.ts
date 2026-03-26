/**
 * Guide Media API
 * Handles media operations for Local Guide
 *
 * Endpoints:
 * - GET    /api/local-guide/media          - List media (bản của Local Guide; không gồm 3D do Manager)
 * - GET    /api/local-guide/site-media     - Media đã duyệt của site (gồm model_3d)
 * - POST   /api/local-guide/media          - Upload media
 * - PUT    /api/local-guide/media/:id      - Update media
 * - DELETE /api/local-guide/media/:id      - Delete media (soft)
 * - PATCH  /api/local-guide/media/:id/restore - Restore media
 */

import { ApiResponse } from "../../../types/api.types";
import {
    GetMediaParams,
    GetSiteMediaParams,
    MediaItem,
    MediaListData,
    UpdateMediaRequest,
    UploadMediaRequest,
    UploadMediaWithYouTubeRequest,
} from "../../../types/guide";
import { normalizeMediaItem } from "../../../utils/mediaUtils";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

function normalizeMediaListData(data: MediaListData): MediaListData {
  return {
    ...data,
    data: data.data.map(normalizeMediaItem),
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get media list for the local guide's site
 *
 * @param params - Query parameters for filtering and pagination
 * @param params.type - Optional: `image` | `video` | `model_3d` (API values)
 * @returns Paginated list of media items
 *
 * Response codes:
 * - 200: Success
 * - 401: Not logged in
 * - 403: Not a Local Guide
 */
export const getMedia = async (
  params?: GetMediaParams,
): Promise<ApiResponse<MediaListData>> => {
  const response = await apiClient.get<ApiResponse<MediaListData>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.LIST,
    { params },
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaListData(out.data) };
  }
  return out;
};

/**
 * Media đã duyệt của site (Local Guide) — dùng để hiển thị mô hình 3D do Manager upload,
 * không xuất hiện trong {@link getMedia}.
 */
export const getSiteApprovedMedia = async (
  params?: GetSiteMediaParams,
): Promise<ApiResponse<MediaListData>> => {
  const response = await apiClient.get<ApiResponse<MediaListData>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.SITE_MEDIA_LIST,
    { params },
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaListData(out.data) };
  }
  return out;
};

/**
 * Upload media for the local guide's site (File upload)
 * Uses multipart/form-data format for file uploads
 *
 * @param data - Upload data including file info
 * @returns Created media item
 *
 * Response codes:
 * - 201: Upload successful
 * - 400: Invalid media type or missing file/URL
 * - 401: Not logged in
 * - 403: Not a Local Guide
 */
export const uploadMedia = async (
  data: UploadMediaRequest,
): Promise<ApiResponse<MediaItem>> => {
  const formData = new FormData();

  formData.append("type", data.type);

  if (data.caption) {
    formData.append("caption", data.caption);
  }

  // React Native FormData format for file upload
  // The file object should have: uri, name, type
  if (data.file) {
    formData.append("file", {
      uri: data.file.uri,
      name: data.file.name,
      type: data.file.type,
    } as any);
  }

  const response = await apiClient.post<ApiResponse<MediaItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.UPLOAD,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaItem(out.data) };
  }
  return out;
};

/**
 * Upload media with YouTube URL
 * Uses application/json format for URL-based media
 *
 * @param data - Upload data including YouTube URL
 * @returns Created media item
 *
 * Response codes:
 * - 201: Upload successful
 * - 400: Invalid media type or URL
 * - 401: Not logged in
 * - 403: Not a Local Guide
 */
export const uploadMediaWithYouTube = async (
  data: UploadMediaWithYouTubeRequest,
): Promise<ApiResponse<MediaItem>> => {
  const response = await apiClient.post<ApiResponse<MediaItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.UPLOAD,
    {
      type: data.type,
      url: data.url,
      caption: data.caption,
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaItem(out.data) };
  }
  return out;
};

/**
 * Update media item
 * Note: Only media with status 'pending' or 'rejected' can be updated
 * Backend only accepts multipart/form-data format
 *
 * @param id - Media ID
 * @param data - Update data
 * @returns Updated media item
 *
 * Response codes:
 * - 200: Update successful
 * - 400: Cannot update approved media
 * - 404: Media not found
 */
export const updateMedia = async (
  id: string,
  data: UpdateMediaRequest,
): Promise<ApiResponse<MediaItem>> => {
  const formData = new FormData();

  if (data.type) formData.append("type", data.type);
  if (data.caption !== undefined) formData.append("caption", data.caption);
  if (data.url) formData.append("url", data.url);

  // React Native FormData format for file upload
  if (data.file) {
    formData.append("file", {
      uri: data.file.uri,
      name: data.file.name,
      type: data.file.type,
    } as any);
  }

  const response = await apiClient.put<ApiResponse<MediaItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.UPDATE(id),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaItem(out.data) };
  }
  return out;
};

/**
 * Delete media item (soft delete)
 * Note: Only media with status 'pending' or 'rejected' can be deleted
 *
 * @param id - Media ID
 * @returns Success response
 *
 * Response codes:
 * - 200: Delete successful
 * - 400: Cannot delete approved media
 * - 404: Media not found
 */
export const deleteMedia = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.DELETE(id),
  );
  return response.data;
};

/**
 * Restore soft-deleted media
 * Note: Only media with is_active: false and status 'pending' or 'rejected' can be restored
 *
 * @param id - Media ID
 * @returns Restored media item
 *
 * Response codes:
 * - 200: Restore successful
 * - 400: Cannot restore approved media / Media is already active
 * - 401: Not logged in
 * - 403: Not a Local Guide
 * - 404: Media not found
 */
export const restoreMedia = async (
  id: string,
): Promise<ApiResponse<MediaItem>> => {
  const response = await apiClient.patch<ApiResponse<MediaItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.RESTORE(id),
  );
  const out = response.data;
  if (out.success && out.data) {
    return { ...out, data: normalizeMediaItem(out.data) };
  }
  return out;
};

// ============================================
// EXPORT AS OBJECT (for consistent API pattern)
// ============================================

const guideMediaApi = {
  getMedia,
  getSiteApprovedMedia,
  uploadMedia,
  uploadMediaWithYouTube,
  updateMedia,
  deleteMedia,
  restoreMedia,
};

export default guideMediaApi;
