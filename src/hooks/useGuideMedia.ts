/**
 * useGuideMedia Hook
 * Custom hook for managing Local Guide media operations
 *
 * Provides methods for:
 * - Fetching media list with pagination and filters
 * - Uploading new media
 * - Updating existing media
 * - Deleting media (soft delete)
 * - Restoring deleted media
 */

import { useCallback, useState } from "react";
import { guideMediaApi } from "../services/api";
import {
    GetMediaParams,
    MediaItem,
    MediaPagination,
    UpdateMediaRequest,
    UploadMediaRequest
} from "../types/guide";

// ============================================
// TYPES
// ============================================

export interface UseGuideMediaState {
  /** List of media items */
  media: MediaItem[];
  /** Pagination info */
  pagination: MediaPagination | null;
  /** Loading state for list fetch */
  loading: boolean;
  /** Loading state for upload operation */
  uploading: boolean;
  /** Loading state for update/delete operations */
  processing: boolean;
  /** Error message if any */
  error: string | null;
  /** Error code for specific handling */
  errorCode: number | null;
}

export interface UseGuideMediaActions {
  /** Fetch media list with optional filters */
  fetchMedia: (params?: GetMediaParams) => Promise<void>;
  /** Load more media (next page) */
  loadMore: () => Promise<void>;
  /** Refresh media list (reset to page 1) */
  refresh: () => Promise<void>;
  /** Upload new media */
  uploadMedia: (data: UploadMediaRequest) => Promise<MediaItem | null>;
  /** Update existing media */
  updateMedia: (
    id: string,
    data: UpdateMediaRequest,
  ) => Promise<MediaItem | null>;
  /** Delete media (soft delete) */
  deleteMedia: (id: string) => Promise<boolean>;
  /** Restore deleted media */
  restoreMedia: (id: string) => Promise<MediaItem | null>;
  /** Clear error state */
  clearError: () => void;
}

export interface UseGuideMediaResult
  extends UseGuideMediaState, UseGuideMediaActions {
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Whether the list is empty */
  isEmpty: boolean;
}

// ============================================
// ERROR HANDLING
// ============================================

interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const getErrorMessage = (
  error: ApiErrorResponse,
  defaultMessage: string,
): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

const getErrorCode = (error: ApiErrorResponse): number | null => {
  return error.response?.status || null;
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing Local Guide media
 *
 * @param initialParams - Initial filter parameters
 * @returns State and actions for media management
 *
 * @example
 * ```tsx
 * const {
 *   media,
 *   loading,
 *   fetchMedia,
 *   uploadMedia
 * } = useGuideMedia();
 *
 * // Fetch all images
 * await fetchMedia({ type: 'image', status: 'approved' });
 *
 * // Upload new image
 * const newMedia = await uploadMedia({
 *   type: 'image',
 *   file: imageFile,
 *   caption: 'My photo'
 * });
 * ```
 */
export const useGuideMedia = (
  initialParams?: GetMediaParams,
): UseGuideMediaResult => {
  // State
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState<MediaPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [currentParams, setCurrentParams] = useState<GetMediaParams>(
    initialParams || {},
  );

  // Computed values
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;
  const isEmpty = !loading && media.length === 0;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Fetch media list
  const fetchMedia = useCallback(
    async (params?: GetMediaParams) => {
      try {
        setLoading(true);
        clearError();

        const queryParams = params || currentParams;
        setCurrentParams(queryParams);

        const response = await guideMediaApi.getMedia(queryParams);

        if (response?.success && response?.data) {
          setMedia(response.data.data);
          setPagination(response.data.pagination);
        } else {
          setError(response?.message || "Không thể tải danh sách media");
        }
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(getErrorMessage(apiError, "Không thể tải danh sách media"));
        setErrorCode(getErrorCode(apiError));
      } finally {
        setLoading(false);
      }
    },
    [currentParams, clearError],
  );

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);

      const nextPage = (pagination?.page || 1) + 1;
      const response = await guideMediaApi.getMedia({
        ...currentParams,
        page: nextPage,
      });

      if (response?.success && response?.data) {
        setMedia((prev) => [...prev, ...response.data!.data]);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      const apiError = err as ApiErrorResponse;
      setError(getErrorMessage(apiError, "Không thể tải thêm media"));
      setErrorCode(getErrorCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, pagination, currentParams]);

  // Refresh (reset to page 1)
  const refresh = useCallback(async () => {
    await fetchMedia({ ...currentParams, page: 1 });
  }, [fetchMedia, currentParams]);

  // Upload media
  const uploadMedia = useCallback(
    async (data: UploadMediaRequest): Promise<MediaItem | null> => {
      try {
        setUploading(true);
        clearError();

        const response = await guideMediaApi.uploadMedia(data);

        if (response?.success && response?.data) {
          // Add new media to the beginning of the list
          setMedia((prev) => [response.data!, ...prev]);

          // Update pagination total
          if (pagination) {
            setPagination({
              ...pagination,
              totalItems: pagination.totalItems + 1,
            });
          }

          return response.data;
        } else {
          setError(response?.message || "Không thể upload media");
          return null;
        }
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(getErrorMessage(apiError, "Không thể upload media"));
        setErrorCode(getErrorCode(apiError));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [clearError, pagination],
  );

  // Update media
  const updateMedia = useCallback(
    async (id: string, data: UpdateMediaRequest): Promise<MediaItem | null> => {
      try {
        setProcessing(true);
        clearError();

        const response = await guideMediaApi.updateMedia(id, data);

        if (response?.success && response?.data) {
          // Update the media in the list
          setMedia((prev) =>
            prev.map((item) => (item.id === id ? response.data! : item)),
          );

          return response.data;
        } else {
          setError(response?.message || "Không thể cập nhật media");
          return null;
        }
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(getErrorMessage(apiError, "Không thể cập nhật media"));
        setErrorCode(getErrorCode(apiError));
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [clearError],
  );

  // Delete media
  const deleteMedia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setProcessing(true);
        clearError();

        const response = await guideMediaApi.deleteMedia(id);

        if (response?.success) {
          // Remove from list or mark as inactive
          setMedia((prev) => prev.filter((item) => item.id !== id));

          // Update pagination total
          if (pagination) {
            setPagination({
              ...pagination,
              totalItems: Math.max(0, pagination.totalItems - 1),
            });
          }

          return true;
        } else {
          setError(response?.message || "Không thể xóa media");
          return false;
        }
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(getErrorMessage(apiError, "Không thể xóa media"));
        setErrorCode(getErrorCode(apiError));
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [clearError, pagination],
  );

  // Restore media
  const restoreMedia = useCallback(
    async (id: string): Promise<MediaItem | null> => {
      try {
        setProcessing(true);
        clearError();

        const response = await guideMediaApi.restoreMedia(id);

        if (response?.success && response?.data) {
          // Update the media in the list if it exists
          setMedia((prev) =>
            prev.map((item) => (item.id === id ? response.data! : item)),
          );

          return response.data;
        } else {
          setError(response?.message || "Không thể khôi phục media");
          return null;
        }
      } catch (err) {
        const apiError = err as ApiErrorResponse;
        setError(getErrorMessage(apiError, "Không thể khôi phục media"));
        setErrorCode(getErrorCode(apiError));
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [clearError],
  );

  return {
    // State
    media,
    pagination,
    loading,
    uploading,
    processing,
    error,
    errorCode,

    // Computed
    hasMore,
    isEmpty,

    // Actions
    fetchMedia,
    loadMore,
    refresh,
    uploadMedia,
    updateMedia,
    deleteMedia,
    restoreMedia,
    clearError,
  };
};

export default useGuideMedia;
