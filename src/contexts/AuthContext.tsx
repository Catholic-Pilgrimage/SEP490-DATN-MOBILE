// Authentication context
// Manage user authentication state, login, logout, etc.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import Toast from 'react-native-toast-message';
import { authApi } from "../services/api";
import notificationService from "../services/notification/notificationService";
import { secureStorage } from "../services/storage/secureStorage";
import {
  AUTH_STORAGE_KEYS,
  AuthContextType,
  AuthState,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
} from "../types/auth.types";

// Initial auth state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading to check stored tokens
  error: null,
};

// Auth action types
type AuthAction =
  | { type: "AUTH_LOADING" }
  | {
    type: "AUTH_SUCCESS";
    payload: { user: User; accessToken: string; refreshToken: string };
  }
  | { type: "AUTH_ERROR"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | {
    type: "AUTH_RESTORE";
    payload: { user: User; accessToken: string; refreshToken: string };
  }
  | { type: "AUTH_UPDATE_USER"; payload: User }
  | { type: "AUTH_CLEAR_ERROR" }
  | { type: "AUTH_SET_LOADING"; payload: boolean }
  | { type: "AUTH_GUEST_MODE" };

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_LOADING":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...initialState,
        isLoading: false,
      };
    case "AUTH_RESTORE":
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    case "AUTH_CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "AUTH_SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "AUTH_GUEST_MODE":
      return {
        ...initialState,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isGuest, setIsGuest] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);

  // Restore auth state from storage on app start
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        // Check if user is in guest mode
        const guestMode = await secureStorage.getItem(
          AUTH_STORAGE_KEYS.IS_GUEST,
        );
        if (guestMode === "true") {
          setIsGuest(true);
          dispatch({ type: "AUTH_GUEST_MODE" });
          return;
        }

        // Get stored tokens and user
        const [accessToken, refreshToken, userJson] = await Promise.all([
          secureStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
          secureStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
          secureStorage.getItem(AUTH_STORAGE_KEYS.USER),
        ]);

        if (accessToken && refreshToken && userJson) {
          const user = JSON.parse(userJson) as User;
          dispatch({
            type: "AUTH_RESTORE",
            payload: { user, accessToken, refreshToken },
          });

          // ✅ Register push token if user is restored
          registerPushToken();
        } else {
          dispatch({ type: "AUTH_SET_LOADING", payload: false });
        }
      } catch {
        dispatch({ type: "AUTH_SET_LOADING", payload: false });
      }
    };

    restoreAuthState();
  }, []);

  // ✅ Register push notification token
  const registerPushToken = useCallback(async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setPushToken(token);
        console.log("✅ Push token registered:", token);
      }
    } catch (error) {
      console.error("❌ Failed to register push token:", error);
    }
  }, []);

  // Login function
  const login = useCallback(
    async (credentials: LoginRequest) => {
      dispatch({ type: "AUTH_LOADING" });

      try {
        // Call login API
        const response = await authApi.login(credentials);

        if (!response.success || !response.data) {
          const errorMessage =
            response.error?.message || response.message || "Đăng nhập thất bại";
          throw new Error(errorMessage);
        }

        const { accessToken, refreshToken } = response.data;

        // Save tokens to secure storage
        await Promise.all([
          secureStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken),
          secureStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
          secureStorage.removeItem(AUTH_STORAGE_KEYS.IS_GUEST), // Clear guest mode
        ]);

        // Fetch user profile
        const profileResponse = await authApi.getProfile();

        if (!profileResponse.success || !profileResponse.data) {
          throw new Error("Không thể lấy thông tin người dùng");
        }

        const user = profileResponse.data;

        // Save user to storage
        await secureStorage.setItem(
          AUTH_STORAGE_KEYS.USER,
          JSON.stringify(user),
        );

        setIsGuest(false);
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user, accessToken, refreshToken },
        });

        // ✅ Register push notification token after successful login
        await registerPushToken();
      } catch (error: any) {
        const errorMessage =
          error.message || "Đăng nhập thất bại. Vui lòng thử lại.";
        dispatch({ type: "AUTH_ERROR", payload: errorMessage });
        throw error;
      }
    },
    [registerPushToken],
  );

  // Register function
  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: "AUTH_LOADING" });

    try {
      const response = await authApi.register(data);

      if (!response.success) {
        const errorMessage =
          response.error?.message || response.message || "Đăng ký thất bại";
        throw new Error(errorMessage);
      }

      dispatch({ type: "AUTH_SET_LOADING", payload: false });

      // After successful registration, user should login
      // We don't auto-login here, let user login manually
    } catch (error: any) {
      const errorMessage =
        error.message || "Đăng ký thất bại. Vui lòng thử lại.";
      dispatch({ type: "AUTH_ERROR", payload: errorMessage });
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // ✅ Revoke push notification token before logout (silent fail)
      if (pushToken) {
        await notificationService.unregisterPushToken(pushToken).catch(() => {
          console.log(
            "⚠️ Failed to unregister push token, but continuing logout",
          );
        });
        setPushToken(null);
      }

      // Call logout API (ignore errors)
      await authApi.logout().catch(() => null);

      // Clear all auth data from storage regardless of API result
      await secureStorage.clearKeys([
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
        AUTH_STORAGE_KEYS.REFRESH_TOKEN,
        AUTH_STORAGE_KEYS.USER,
        AUTH_STORAGE_KEYS.IS_GUEST,
      ]);

      setIsGuest(false);
      dispatch({ type: "AUTH_LOGOUT" });

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Bạn đã đăng xuất khỏi hệ thống',
      });
    } catch {
      // ✅ Try to revoke token even in error case (silent fail)
      if (pushToken) {
        notificationService.unregisterPushToken(pushToken).catch(() => {
          console.log("⚠️ Failed to unregister push token in error handler");
        });
        setPushToken(null);
      }

      // Still logout locally even if API call fails
      await secureStorage
        .clearKeys([
          AUTH_STORAGE_KEYS.ACCESS_TOKEN,
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
          AUTH_STORAGE_KEYS.USER,
          AUTH_STORAGE_KEYS.IS_GUEST,
        ])
        .catch(() => { });
      setIsGuest(false);
      dispatch({ type: "AUTH_LOGOUT" });

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Bạn đã đăng xuất khỏi hệ thống',
      });
    }
  }, [pushToken]);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await secureStorage.getItem(
        AUTH_STORAGE_KEYS.REFRESH_TOKEN,
      );

      if (!refreshToken) {
        return false;
      }

      const response = await authApi.refreshToken({ refreshToken });

      if (!response.success || !response.data?.accessToken) {
        return false;
      }

      // Save new tokens
      await secureStorage.setItem(
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
        response.data.accessToken,
      );

      if (response.data.refreshToken) {
        await secureStorage.setItem(
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
          response.data.refreshToken,
        );
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  // Get user profile
  const getProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile();

      if (response?.success && response?.data) {
        const user = response.data;
        await secureStorage.setItem(
          AUTH_STORAGE_KEYS.USER,
          JSON.stringify(user),
        );
        dispatch({ type: "AUTH_UPDATE_USER", payload: user });
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    try {
      const response = await authApi.updateProfile(data);

      if (response?.success && response?.data) {
        const user = response.data;
        await secureStorage.setItem(
          AUTH_STORAGE_KEYS.USER,
          JSON.stringify(user),
        );
        dispatch({ type: "AUTH_UPDATE_USER", payload: user });
      } else {
        throw new Error(response?.error?.message || "Cập nhật thất bại");
      }
    } catch (error: any) {
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "AUTH_CLEAR_ERROR" });
  }, []);

  // Continue as guest
  const continueAsGuest = useCallback(async () => {
    await secureStorage.setItem(AUTH_STORAGE_KEYS.IS_GUEST, "true");
    setIsGuest(true);
    dispatch({ type: "AUTH_GUEST_MODE" });
  }, []);

  // Exit guest mode - call this before navigating to login
  const exitGuestMode = useCallback(async () => {
    await secureStorage.removeItem(AUTH_STORAGE_KEYS.IS_GUEST);
    setIsGuest(false);
    dispatch({ type: "AUTH_SET_LOADING", payload: false });
  }, []);

  // Memoize context value
  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshAccessToken,
      getProfile,
      updateProfile,
      clearError,
      isGuest,
      continueAsGuest,
      exitGuestMode,
    }),
    [
      state,
      login,
      register,
      logout,
      refreshAccessToken,
      getProfile,
      updateProfile,
      clearError,
      isGuest,
      continueAsGuest,
      exitGuestMode,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthContext;
