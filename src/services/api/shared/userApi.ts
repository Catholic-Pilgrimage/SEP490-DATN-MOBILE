/**
 * User API
 * Handles user profile and settings management
 *
 * Endpoints:
 * - GET  /api/users/profile   - Get user profile
 * - PUT  /api/users/profile   - Update user profile
 * - POST /api/users/avatar    - Update avatar
 * - GET  /api/users/settings  - Get user settings
 * - PUT  /api/users/settings  - Update user settings
 * - DELETE /api/users/account - Delete account
 */

import { ApiResponse } from "../../../types/api.types";
import {
    UpdateProfileRequest,
    UserProfile,
    UserSettings
} from "../../../types/user.types";
import apiClient from "../apiClient";
import { USER_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get user profile
 */
export const getProfile = async (): Promise<ApiResponse<UserProfile>> => {
  const response = await apiClient.get<ApiResponse<UserProfile>>(
    USER_ENDPOINTS.GET_PROFILE,
  );
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (
  data: UpdateProfileRequest,
): Promise<ApiResponse<UserProfile>> => {
  const response = await apiClient.put<ApiResponse<UserProfile>>(
    USER_ENDPOINTS.UPDATE_PROFILE,
    data,
  );
  return response.data;
};

/**
 * Update avatar
 */
export const updateAvatar = async (
  file: FormData,
): Promise<ApiResponse<{ avatarUrl: string }>> => {
  const response = await apiClient.post<ApiResponse<{ avatarUrl: string }>>(
    USER_ENDPOINTS.UPDATE_AVATAR,
    file,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

/**
 * Get user settings
 */
export const getSettings = async (): Promise<ApiResponse<UserSettings>> => {
  const response = await apiClient.get<ApiResponse<UserSettings>>(
    USER_ENDPOINTS.GET_SETTINGS,
  );
  return response.data;
};

/**
 * Update user settings
 */
export const updateSettings = async (
  data: Partial<UserSettings>,
): Promise<ApiResponse<UserSettings>> => {
  const response = await apiClient.put<ApiResponse<UserSettings>>(
    USER_ENDPOINTS.UPDATE_SETTINGS,
    data,
  );
  return response.data;
};

/**
 * Delete account
 */
export const deleteAccount = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    USER_ENDPOINTS.DELETE_ACCOUNT,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const userApi = {
  getProfile,
  updateProfile,
  updateAvatar,
  getSettings,
  updateSettings,
  deleteAccount,
};

export default userApi;
