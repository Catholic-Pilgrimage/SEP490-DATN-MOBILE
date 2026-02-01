/**
 * Auth API
 * Handles all authentication operations
 *
 * Endpoints:
 * - POST /api/auth/login          - User login
 * - POST /api/auth/register       - User registration
 * - POST /api/auth/logout         - User logout
 * - POST /api/auth/refresh-token  - Refresh access token
 * - GET  /api/auth/profile        - Get auth profile
 * - PUT  /api/auth/profile        - Update profile
 * - POST /api/auth/change-password - Change password
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password  - Reset password with token
 * - POST /api/auth/verify-email    - Verify email with OTP
 * - POST /api/auth/resend-otp      - Resend OTP
 */

import { ApiResponse } from "../../../types/api.types";
import {
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    ProfileResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    UpdateProfileRequest,
    VerifyEmailRequest,
} from "../../../types/auth.types";
import apiClient from "../apiClient";
import { AUTH_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Login user
 * Returns LoginResponse directly (already has success/data structure)
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    AUTH_ENDPOINTS.LOGIN,
    data,
  );
  return response.data;
};

/**
 * Register new user
 */
export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse>(
    AUTH_ENDPOINTS.REGISTER,
    data,
  );
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.LOGOUT,
  );
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  data: RefreshTokenRequest,
): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>(
    AUTH_ENDPOINTS.REFRESH_TOKEN,
    data,
  );
  return response.data;
};

/**
 * Get auth profile
 */
export const getProfile = async (): Promise<ProfileResponse> => {
  const response = await apiClient.get<ProfileResponse>(
    AUTH_ENDPOINTS.PROFILE,
  );
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (
  data: UpdateProfileRequest,
): Promise<ProfileResponse> => {
  const response = await apiClient.put<ProfileResponse>(
    AUTH_ENDPOINTS.PROFILE,
    data,
  );
  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.put<ApiResponse<void>>(
    AUTH_ENDPOINTS.CHANGE_PASSWORD,
    data,
  );
  return response.data;
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.FORGOT_PASSWORD,
    data,
  );
  return response.data;
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  data: ResetPasswordRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.RESET_PASSWORD,
    data,
  );
  return response.data;
};

/**
 * Verify email with OTP
 */
export const verifyEmail = async (
  data: VerifyEmailRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.VERIFY_EMAIL,
    data,
  );
  return response.data;
};

/**
 * Resend OTP
 */
export const resendOtp = async (email: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.RESEND_OTP,
    { email },
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const authApi = {
  login,
  register,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendOtp,
};

export default authApi;
