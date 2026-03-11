/**
 * Auth API
 * Handles all authentication operations
 *
 * Endpoints:
 * - POST /api/auth/login          - User login
 * - POST /api/auth/google         - User login with Google Firebase token
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
  GoogleLoginRequest,
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
import apiClientInstance from "../apiClient";
import { AUTH_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Login user
 * Returns LoginResponse directly (already has success/data structure)
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClientInstance.post<LoginResponse>(
    AUTH_ENDPOINTS.LOGIN,
    data,
  );
  return response.data;
};

/**
 * Login user with Firebase ID token from Google sign-in
 */
export const googleLogin = async (
  data: GoogleLoginRequest,
): Promise<LoginResponse> => {
  const response = await apiClientInstance.post<LoginResponse>(AUTH_ENDPOINTS.GOOGLE, {
    firebaseIdToken: data.firebaseIdToken,
  });
  return response.data;
};

/**
 * Register new user
 */
export const register = async (
  data: RegisterRequest,
): Promise<RegisterResponse> => {
  const response = await apiClientInstance.post<RegisterResponse>(
    AUTH_ENDPOINTS.REGISTER,
    data,
  );
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<ApiResponse<void>> => {
  const response = await apiClientInstance.post<ApiResponse<void>>(
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
  const response = await apiClientInstance.post<RefreshTokenResponse>(
    AUTH_ENDPOINTS.REFRESH_TOKEN,
    data,
  );
  return response.data;
};

// Helper to map snake_case API response to camelCase User object
const mapUserResponse = (data: any): any => {
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name || data.fullName, // Handle both just in case
    role: data.role,
    avatar: data.avatar_url || data.avatar,
    phone: data.phone,
    address: data.address,
    bio: data.bio,
    isVerified: !!data.verified_at || data.isVerified,
    isActive: data.status === "active" || data.isActive,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    dateOfBirth: data.date_of_birth || data.dateOfBirth,
    gender: data.gender,
    nationality: data.nationality,
    language: data.language,
  };
};

// Helper to map camelCase UpdateProfileRequest to snake_case for API
const mapUpdateProfileRequest = (data: UpdateProfileRequest): any => {
  const mapped: any = {};
  if (data.fullName !== undefined) mapped.full_name = data.fullName;
  if (data.phone !== undefined) mapped.phone = data.phone;
  if (data.address !== undefined) mapped.address = data.address;
  if (data.bio !== undefined) mapped.bio = data.bio;
  if (data.avatar !== undefined) mapped.avatar_url = data.avatar;
  if (data.dateOfBirth !== undefined) mapped.date_of_birth = data.dateOfBirth;
  if (data.gender !== undefined) mapped.gender = data.gender;
  if (data.nationality !== undefined) mapped.nationality = data.nationality;
  if (data.language !== undefined) mapped.language = data.language;
  return mapped;
};

/**
 * Get auth profile
 */
export const getProfile = async (): Promise<ProfileResponse> => {
  const response = await apiClientInstance.get<ProfileResponse>(AUTH_ENDPOINTS.PROFILE);

  if (response.data && response.data.data) {
    // Map the inner data object
    response.data.data = mapUserResponse(response.data.data);
  }

  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (
  data: UpdateProfileRequest,
): Promise<ProfileResponse> => {
  let response;

  if (data.avatar) {
    // Send as multipart/form-data when avatar is included
    const formData = new FormData();
    if (data.fullName !== undefined)
      formData.append("full_name", data.fullName);
    if (data.phone !== undefined) formData.append("phone", data.phone);
    if (data.address !== undefined) formData.append("address", data.address);
    if (data.bio !== undefined) formData.append("bio", data.bio);
    if (data.dateOfBirth !== undefined)
      formData.append("date_of_birth", data.dateOfBirth);
    if (data.gender !== undefined) formData.append("gender", data.gender);
    if (data.nationality !== undefined)
      formData.append("nationality", data.nationality);
    if (data.language !== undefined) formData.append("language", data.language);

    const filename = data.avatar.split("/").pop() || "avatar.jpg";
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    formData.append("avatar", {
      uri: data.avatar,
      name: filename,
      type: mimeType,
    } as any);

    response = await apiClientInstance.put<ProfileResponse>(
      AUTH_ENDPOINTS.PROFILE,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  } else {
    const snakeCaseData = mapUpdateProfileRequest(data);
    response = await apiClientInstance.put<ProfileResponse>(
      AUTH_ENDPOINTS.PROFILE,
      snakeCaseData,
    );
  }

  if (response.data && response.data.data) {
    response.data.data = mapUserResponse(response.data.data);
  }

  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ApiResponse<void>> => {
  const payload = {
    current_password: data.currentPassword,
    new_password: data.newPassword,
    confirm_password: data.confirmPassword,
  };
  const response = await apiClientInstance.put<ApiResponse<void>>(
    AUTH_ENDPOINTS.CHANGE_PASSWORD,
    payload,
  );
  return response.data;
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClientInstance.post<ApiResponse<void>>(
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
  const payload = {
    email: data.email,
    otp: data.otp,
    new_password: data.newPassword,
    confirm_password: data.confirmPassword,
  };
  const response = await apiClientInstance.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.RESET_PASSWORD,
    payload,
  );
  return response.data;
};

/**
 * Verify email with OTP
 */
export const verifyEmail = async (
  data: VerifyEmailRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClientInstance.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.VERIFY_EMAIL,
    data,
  );
  return response.data;
};

/**
 * Resend OTP
 */
export const resendOtp = async (email: string): Promise<ApiResponse<void>> => {
  const response = await apiClientInstance.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.RESEND_OTP,
    { email },
  );
  return response.data;
};

/**
 * Verify OTP for forgot password
 * Calls /api/auth/verify-otp with { email, otp }
 */
export const verifyOtp = async (
  data: VerifyEmailRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClientInstance.post<ApiResponse<void>>(
    AUTH_ENDPOINTS.VERIFY_OTP,
    data,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const authApi = {
  login,
  googleLogin,
  register,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyOtp,
  resendOtp,
};

export default authApi;
