// Authentication type definitions

import { UpdateProfileRequest, User } from "./user.types";

// User roles and interface imported from other files

// Login request payload
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response from API
export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

// Register request payload (snake_case for API)
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  date_of_birth: string; // Format: YYYY-MM-DD
}

// Register response from API
export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      full_name: string;
      role: string;
      avatar_url?: string;
    };
  };
  error?: {
    message: string;
    details?: any[];
  };
}

// Refresh token request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Refresh token response
export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Profile response
export interface ProfileResponse {
  success: boolean;
  message: string;
  data?: User;
  error?: {
    code: string;
    message: string;
  };
}

// Update profile request imported from user.types

// Change password request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Forgot password request
export interface ForgotPasswordRequest {
  email: string;
}

// Reset password request
export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

// Verify email request
export interface VerifyEmailRequest {
  email: string;
  otp: string;
}



// Auth state for context/store
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context actions
export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  getProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  clearError: () => void;
  isGuest: boolean;
  continueAsGuest: () => void;
  exitGuestMode: () => Promise<void>;
}

// Token storage keys
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
  USER: "auth_user",
  IS_GUEST: "auth_is_guest",
} as const;
