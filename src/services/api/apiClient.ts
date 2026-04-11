// API Client configuration
// Configure axios instance with base URL, interceptors, etc.

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  API_CONFIG,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from "../../config/api.config";
import i18n from "../../i18n";
import { AUTH_STORAGE_KEYS } from "../../types/auth.types";
import { secureStorage } from "../storage/secureStorage";
import { AUTH_ENDPOINTS } from "./endpoints";

// Extended config to track retry attempts
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": API_CONFIG.HEADERS.CONTENT_TYPE,
    Accept: API_CONFIG.HEADERS.ACCEPT,
  },
});

// Token refresh state to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Process failed queue after token refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = await secureStorage.getItem(
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
      );

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Add Accept-Language header from current i18n language (always in sync)
      config.headers["Accept-Language"] = i18n.language || "vi";

      // Debug logging for API requests (only in development)
      if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(
          `[API] Accept-Language: ${config.headers["Accept-Language"]}`,
        );
        if (config.data) {
          // Don't log FormData content (binary files)
          const isFormData = config.data instanceof FormData;
          console.log(
            `[API] Body: ${isFormData ? "[FormData]" : JSON.stringify(config.data)}`,
          );
        }
      }
    } catch {
      // Silent fail - continue without token
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle responses and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Debug logging for successful responses (only in development)
    if (__DEV__) {
      console.log(
        `[API] Response ${response.status}:`,
        JSON.stringify(response.data).substring(0, 500),
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // Handle 401 Unauthorized - Try to refresh token
    if (
      error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
      !originalRequest._retry
    ) {
      // Don't retry for login/refresh-token endpoints
      const isAuthEndpoint =
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh-token");

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await secureStorage.getItem(
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
        );

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(
          `${API_CONFIG.BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`,
          { refreshToken },
        );

        if (response.data.success && response.data.data?.accessToken) {
          const newAccessToken = response.data.data.accessToken;

          // Save new tokens
          await secureStorage.setItem(
            AUTH_STORAGE_KEYS.ACCESS_TOKEN,
            newAccessToken,
          );

          if (response.data.data.refreshToken) {
            await secureStorage.setItem(
              AUTH_STORAGE_KEYS.REFRESH_TOKEN,
              response.data.data.refreshToken,
            );
          }

          // Update authorization header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);

          return apiClient(originalRequest);
        } else {
          throw new Error("Token refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Clear tokens on refresh failure
        await secureStorage.clearKeys([
          AUTH_STORAGE_KEYS.ACCESS_TOKEN,
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
          AUTH_STORAGE_KEYS.USER,
        ]);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to user-friendly message
    const transformedError = transformError(error);
    return Promise.reject(transformedError);
  },
);

// Transform axios error to user-friendly error
function transformError(error: AxiosError): Error {
  if (!error.response) {
    // Network error
    if (error.message === "Network Error") {
      return new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    if (error.code === "ECONNABORTED") {
      return new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
    }
    return new Error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
  }

  const { status } = error.response as AxiosResponse<any>;
  let data: any = (error.response as AxiosResponse<any>).data;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }

  const coalesceMessage = (m: unknown): string | null => {
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m)) {
      const parts = m
        .map((item) =>
          typeof item === "string"
            ? item
            : (item as { message?: string; msg?: string })?.message ||
              (item as { msg?: string })?.msg ||
              "",
        )
        .filter(Boolean);
      return parts.length ? parts.join(". ") : null;
    }
    return null;
  };

  // Extract error message from API response (hỗ trợ nhiều dạng body)
  const apiMessage =
    coalesceMessage(data?.message) ??
    (typeof data?.error === "string" ? data.error : null) ??
    coalesceMessage(data?.error?.message) ??
    (typeof data?.title === "string" ? data.title : null);

  // Extract validation details if available
  const details = data?.error?.details || data?.details || data?.errors;
  let detailMessage = "";

  if (
    !detailMessage &&
    details &&
    typeof details === "object" &&
    !Array.isArray(details)
  ) {
    const msgs = Object.values(details as Record<string, unknown>)
      .map((v) => coalesceMessage(v))
      .filter((s): s is string => Boolean(s));
    if (msgs.length) {
      detailMessage = msgs.join(". ");
    }
  }

  if (details && Array.isArray(details) && details.length > 0) {
    // Format validation errors - only show the message, not field name
    detailMessage = details
      .map((detail: any) => {
        if (typeof detail === "string") return detail;
        if (detail.message) return detail.message;
        if (detail.msg) return detail.msg;
        return "";
      })
      .filter(Boolean)
      .join(". ");
  }

  // Ưu tiên chi tiết validation (errors/details) hơn message tổng quát như
  // "Dữ liệu không hợp lệ" để FE hiển thị rõ nguyên nhân cụ thể.
  const fullMessage = detailMessage || apiMessage;

  if (__DEV__ && error.response) {
    console.warn(
      "[API] Error response",
      status,
      typeof (error.response as AxiosResponse<any>).data === "string"
        ? String((error.response as AxiosResponse<any>).data).slice(0, 400)
        : (error.response as AxiosResponse<any>).data,
    );
  }

  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return new Error(fullMessage || "Yêu cầu không hợp lệ.");
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return new Error(fullMessage || "Dữ liệu không hợp lệ.");
    case HTTP_STATUS.UNAUTHORIZED:
      return new Error(fullMessage || ERROR_MESSAGES.INVALID_CREDENTIALS);
    case HTTP_STATUS.FORBIDDEN:
      return new Error(fullMessage || ERROR_MESSAGES.ACCOUNT_LOCKED);
    case HTTP_STATUS.NOT_FOUND:
      return new Error(fullMessage || "Không tìm thấy tài nguyên.");
    case HTTP_STATUS.CONFLICT:
      return new Error(
        fullMessage ||
          "Dữ liệu xung đột với trạng thái hiện tại (ví dụ trùng ca).",
      );
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return new Error(fullMessage || ERROR_MESSAGES.SERVER_ERROR);
    default:
      return new Error(fullMessage || ERROR_MESSAGES.UNKNOWN_ERROR);
  }
}

export { apiClient };
export default apiClient;
