// Authentication API calls
// Login, register, logout, refresh token, etc.

import { API_CONFIG } from '../../config/api.config';
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
  ApiResponse,
} from '../../types/auth.types';
import apiClient from './apiClient';

const { ENDPOINTS } = API_CONFIG;

/**
 * Authentication API service
 * Handles all auth-related API calls
 */
class AuthApi {
  /**
   * Login user with email and password
   * @param credentials - Login credentials (email, password)
   * @returns LoginResponse with tokens on success
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data;
  }

  /**
   * Register a new user
   * @param data - Registration data
   * @returns RegisterResponse with user data on success
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  }

  /**
   * Logout user
   * @returns ApiResponse
   */
  async logout(): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  }

  /**
   * Refresh access token using refresh token
   * @param data - Refresh token request
   * @returns RefreshTokenResponse with new tokens
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(
      ENDPOINTS.AUTH.REFRESH_TOKEN,
      data
    );
    return response.data;
  }

  /**
   * Get current user profile
   * @returns ProfileResponse with user data
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>(ENDPOINTS.AUTH.PROFILE);
    return response.data;
  }

  /**
   * Update user profile
   * @param data - Profile update data
   * @returns ProfileResponse with updated user data
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    const response = await apiClient.put<ProfileResponse>(
      ENDPOINTS.AUTH.PROFILE,
      data
    );
    return response.data;
  }

  /**
   * Change user password
   * @param data - Change password data
   * @returns ApiResponse
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(
      ENDPOINTS.AUTH.CHANGE_PASSWORD,
      data
    );
    return response.data;
  }

  /**
   * Request password reset OTP
   * @param data - Email address
   * @returns ApiResponse
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      data
    );
    return response.data;
  }

  /**
   * Reset password with OTP
   * @param data - Reset password data with OTP
   * @returns ApiResponse
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      data
    );
    return response.data;
  }
}

export const authApi = new AuthApi();
export default authApi;
