// API Client configuration
// Configure axios instance with base URL, interceptors, etc.

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../../config/api.config';
import { AUTH_STORAGE_KEYS } from '../../types/auth.types';
import { secureStorage } from '../storage/secureStorage';

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
    'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
    'Accept': API_CONFIG.HEADERS.ACCEPT,
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
      const accessToken = await secureStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch {
      // Silent fail - continue without token
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      // Don't retry for login/refresh-token endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/refresh-token');
      
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
        const refreshToken = await secureStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN}`,
          { refreshToken }
        );

        if (response.data.success && response.data.data?.accessToken) {
          const newAccessToken = response.data.data.accessToken;
          
          // Save new tokens
          await secureStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          
          if (response.data.data.refreshToken) {
            await secureStorage.setItem(
              AUTH_STORAGE_KEYS.REFRESH_TOKEN,
              response.data.data.refreshToken
            );
          }

          // Update authorization header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          
          return apiClient(originalRequest);
        } else {
          throw new Error('Token refresh failed');
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
  }
);

// Transform axios error to user-friendly error
function transformError(error: AxiosError): Error {
  if (!error.response) {
    // Network error
    if (error.message === 'Network Error') {
      return new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    if (error.code === 'ECONNABORTED') {
      return new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
    }
    return new Error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
  }

  const { status, data } = error.response as AxiosResponse<any>;
  
  // Extract error message from API response
  const apiMessage = data?.error?.message || data?.message;
  
  // Extract validation details if available
  const details = data?.error?.details || data?.details;
  let detailMessage = '';
  
  if (details && Array.isArray(details) && details.length > 0) {
    // Format validation errors - only show the message, not field name
    detailMessage = details
      .map((detail: any) => {
        if (typeof detail === 'string') return detail;
        if (detail.message) return detail.message;
        if (detail.msg) return detail.msg;
        return '';
      })
      .filter(Boolean)
      .join('. ');
  }
  
  // Use detail message if available, otherwise use main message
  const fullMessage = detailMessage || apiMessage;
  
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return new Error(fullMessage || 'Yêu cầu không hợp lệ.');
    case HTTP_STATUS.UNAUTHORIZED:
      return new Error(fullMessage || ERROR_MESSAGES.INVALID_CREDENTIALS);
    case HTTP_STATUS.FORBIDDEN:
      return new Error(fullMessage || ERROR_MESSAGES.ACCOUNT_LOCKED);
    case HTTP_STATUS.NOT_FOUND:
      return new Error(fullMessage || 'Không tìm thấy tài nguyên.');
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return new Error(ERROR_MESSAGES.SERVER_ERROR);
    default:
      return new Error(fullMessage || ERROR_MESSAGES.UNKNOWN_ERROR);
  }
}

export { apiClient };
export default apiClient;
