/**
 * API Response Type Definitions
 * Generic types for API responses used across the application
 */

/**
 * Base API response structure
 * All API responses should follow this format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiError;
}

/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/**
 * Validation error detail
 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data?: {
    items: T[];
    pagination: Pagination;
  };
  error?: ApiError;
}

/**
 * Pagination metadata
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search parameters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, unknown>;
}

/**
 * Upload response
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  error?: ApiError;
}

/**
 * Multiple upload response
 */
export interface MultiUploadResponse {
  success: boolean;
  message: string;
  data?: {
    files: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>;
  };
  error?: ApiError;
}

/**
 * Delete response
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
  error?: ApiError;
}

/**
 * Request config for API calls
 */
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * API state for hooks
 */
export interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Mutation state for hooks
 */
export interface MutationState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
}
