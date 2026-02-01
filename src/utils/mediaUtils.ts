/**
 * Media Utils
 * Utility functions for handling media operations
 */

import { MediaItem, MediaStatus, MediaType } from "../types/guide";

// ============================================
// CONSTANTS
// ============================================

/**
 * Allowed file types for each media type
 */
export const MEDIA_MIME_TYPES: Record<MediaType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
  panorama: ["image/jpeg", "image/png"],
};

/**
 * Maximum file sizes (in bytes)
 */
export const MEDIA_MAX_SIZES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  panorama: 20 * 1024 * 1024, // 20MB
};

/**
 * Media type labels (Vietnamese)
 */
export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: "Hình ảnh",
  video: "Video",
  panorama: "Ảnh 360°",
};

/**
 * Media status labels (Vietnamese)
 */
export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

/**
 * Media status colors for UI
 */
export const MEDIA_STATUS_COLORS: Record<
  MediaStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#F59E0B",
    border: "rgba(245, 158, 11, 0.3)",
  },
  approved: {
    bg: "rgba(34, 197, 94, 0.1)",
    text: "#22C55E",
    border: "rgba(34, 197, 94, 0.3)",
  },
  rejected: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#EF4444",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

// ============================================
// VALIDATION
// ============================================

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type for a given media type
 */
export const validateMediaFileType = (
  file: File | Blob,
  mediaType: MediaType,
): MediaValidationResult => {
  const allowedTypes = MEDIA_MIME_TYPES[mediaType];
  const fileType = "type" in file ? file.type : "";

  if (!allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: `Loại file không hợp lệ. Chấp nhận: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
};

/**
 * Validate file size for a given media type
 */
export const validateMediaFileSize = (
  file: File | Blob,
  mediaType: MediaType,
): MediaValidationResult => {
  const maxSize = MEDIA_MAX_SIZES[mediaType];
  const fileSize = file.size;

  if (fileSize > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Validate YouTube URL
 */
export const validateYouTubeUrl = (url: string): MediaValidationResult => {
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+(&[\w=]*)*$/;

  if (!youtubeRegex.test(url)) {
    return {
      valid: false,
      error: "URL YouTube không hợp lệ",
    };
  }

  return { valid: true };
};

/**
 * Comprehensive media validation
 */
export const validateMediaUpload = (
  mediaType: MediaType,
  file?: File | Blob,
  url?: string,
): MediaValidationResult => {
  // For video, either file or YouTube URL is required
  if (mediaType === "video") {
    if (!file && !url) {
      return {
        valid: false,
        error: "Vui lòng chọn file hoặc nhập URL YouTube",
      };
    }

    if (url) {
      return validateYouTubeUrl(url);
    }
  }

  // For image and panorama, file is required
  if (mediaType !== "video" && !file) {
    return {
      valid: false,
      error: "Vui lòng chọn file để upload",
    };
  }

  // Validate file if provided
  if (file) {
    const typeValidation = validateMediaFileType(file, mediaType);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    const sizeValidation = validateMediaFileSize(file, mediaType);
    if (!sizeValidation.valid) {
      return sizeValidation;
    }
  }

  return { valid: true };
};

// ============================================
// HELPERS
// ============================================

/**
 * Get thumbnail URL from video URL
 */
export const getVideoThumbnail = (url: string): string | null => {
  // Extract YouTube video ID
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
  );

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  return null;
};

/**
 * Check if media can be edited (only pending or rejected)
 */
export const canEditMedia = (media: MediaItem): boolean => {
  return media.status === "pending" || media.status === "rejected";
};

/**
 * Check if media can be deleted (only pending or rejected)
 */
export const canDeleteMedia = (media: MediaItem): boolean => {
  return media.status === "pending" || media.status === "rejected";
};

/**
 * Check if media can be restored
 */
export const canRestoreMedia = (media: MediaItem): boolean => {
  return (
    !media.is_active &&
    (media.status === "pending" || media.status === "rejected")
  );
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get media type icon name (for MaterialIcons)
 */
export const getMediaTypeIcon = (type: MediaType): string => {
  switch (type) {
    case "image":
      return "image";
    case "video":
      return "videocam";
    case "panorama":
      return "360";
    default:
      return "insert-drive-file";
  }
};

/**
 * Filter active media from list
 */
export const filterActiveMedia = (media: MediaItem[]): MediaItem[] => {
  return media.filter((item) => item.is_active);
};

/**
 * Filter media by status
 */
export const filterMediaByStatus = (
  media: MediaItem[],
  status: MediaStatus,
): MediaItem[] => {
  return media.filter((item) => item.status === status);
};

/**
 * Filter media by type
 */
export const filterMediaByType = (
  media: MediaItem[],
  type: MediaType,
): MediaItem[] => {
  return media.filter((item) => item.type === type);
};

/**
 * Sort media by date (newest first)
 */
export const sortMediaByDate = (
  media: MediaItem[],
  order: "asc" | "desc" = "desc",
): MediaItem[] => {
  return [...media].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return order === "desc" ? dateB - dateA : dateA - dateB;
  });
};
