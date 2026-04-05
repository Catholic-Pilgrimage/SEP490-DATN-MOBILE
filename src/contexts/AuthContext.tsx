import { statusCodes } from "@react-native-google-signin/google-signin";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import Toast from "react-native-toast-message";
import { queryClient } from "../config/query-client";
import { authApi } from "../services/api";
import {
  clearGoogleSession,
  signInWithGoogle,
} from "../services/auth/googleAuthService";
import { networkService } from "../services/network/networkService";
import {
  registerForPushNotifications,
  unregisterPushToken,
} from "../services/notification/notificationService";
import { setOfflineStorageScopeUserId } from "../services/offline/offlineStorageScope";
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

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isGuest, setIsGuest] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);

  const registerPushToken = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        console.log("Push token registered:", token);
      }
    } catch (error) {
      console.error("Failed to register push token:", error);
    }
  }, []);

  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        const guestMode = await secureStorage.getItem(
          AUTH_STORAGE_KEYS.IS_GUEST,
        );
        if (guestMode === "true") {
          setIsGuest(true);
          setOfflineStorageScopeUserId(null);
          await networkService.setStorageScope(null);
          dispatch({ type: "AUTH_GUEST_MODE" });
          return;
        }

        const [accessToken, refreshToken, userJson] = await Promise.all([
          secureStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
          secureStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
          secureStorage.getItem(AUTH_STORAGE_KEYS.USER),
        ]);

        if (accessToken && refreshToken && userJson) {
          const user = JSON.parse(userJson) as User;
          setOfflineStorageScopeUserId(user.id);
          await networkService.setStorageScope(user.id);
          dispatch({
            type: "AUTH_RESTORE",
            payload: { user, accessToken, refreshToken },
          });
          registerPushToken();
          return;
        }

        setOfflineStorageScopeUserId(null);
        await networkService.setStorageScope(null);
        dispatch({ type: "AUTH_SET_LOADING", payload: false });
      } catch {
        setOfflineStorageScopeUserId(null);
        await networkService.setStorageScope(null);
        dispatch({ type: "AUTH_SET_LOADING", payload: false });
      }
    };

    restoreAuthState();
  }, [registerPushToken]);

  const completeAuthenticatedLogin = useCallback(
    async ({
      accessToken,
      refreshToken,
    }: {
      accessToken: string;
      refreshToken: string;
    }) => {
      await Promise.all([
        secureStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        secureStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        secureStorage.removeItem(AUTH_STORAGE_KEYS.IS_GUEST),
      ]);

      const profileResponse = await authApi.getProfile();
      if (!profileResponse.success || !profileResponse.data) {
        throw new Error("Unable to load user profile.");
      }

      const user = profileResponse.data;
      await secureStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));

      setIsGuest(false);
      setOfflineStorageScopeUserId(user.id);
      await networkService.setStorageScope(user.id);

      // Ensure push token is registered before entering authenticated screens
      // to avoid race conditions where backend sends notifications too early.
      await registerPushToken();

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, accessToken, refreshToken },
      });
    },
    [registerPushToken],
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      dispatch({ type: "AUTH_LOADING" });

      try {
        const response = await authApi.login(credentials);
        if (!response.success || !response.data) {
          throw new Error(
            response.error?.message || response.message || "Login failed.",
          );
        }

        const { accessToken, refreshToken } = response.data;
        await completeAuthenticatedLogin({ accessToken, refreshToken });
      } catch (error: any) {
        const errorMessage = error.message || "Login failed. Please try again.";
        dispatch({ type: "AUTH_ERROR", payload: errorMessage });
        throw error;
      }
    },
    [completeAuthenticatedLogin],
  );

  const loginWithGoogle = useCallback(async () => {
    dispatch({ type: "AUTH_LOADING" });

    try {
      const { firebaseIdToken } = await signInWithGoogle();
      const response = await authApi.googleLogin({ firebaseIdToken });

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message ||
            response.message ||
            "Google sign-in failed.",
        );
      }

      const { accessToken, refreshToken } = response.data;
      await completeAuthenticatedLogin({ accessToken, refreshToken });
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        dispatch({ type: "AUTH_SET_LOADING", payload: false });
        throw error;
      }

      await clearGoogleSession().catch(() => null);

      const errorMessage =
        error.message || "Google sign-in failed. Please try again.";
      dispatch({ type: "AUTH_ERROR", payload: errorMessage });
      throw error;
    }
  }, [completeAuthenticatedLogin]);

  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: "AUTH_LOADING" });

    try {
      const response = await authApi.register(data);
      if (!response.success) {
        throw new Error(
          response.error?.message || response.message || "Register failed.",
        );
      }

      dispatch({ type: "AUTH_SET_LOADING", payload: false });
    } catch (error: any) {
      const errorMessage =
        error.message || "Register failed. Please try again.";
      dispatch({ type: "AUTH_ERROR", payload: errorMessage });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const clearLocalAuth = async () => {
      await secureStorage
        .clearKeys([
          AUTH_STORAGE_KEYS.ACCESS_TOKEN,
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
          AUTH_STORAGE_KEYS.USER,
          AUTH_STORAGE_KEYS.IS_GUEST,
        ])
        .catch(() => null);

      await clearGoogleSession().catch(() => null);
      setOfflineStorageScopeUserId(null);
      await networkService.setStorageScope(null);
      setIsGuest(false);
      dispatch({ type: "AUTH_LOGOUT" });
      queryClient.clear();
    };

    try {
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => null);
        setPushToken(null);
      }

      await authApi.logout().catch(() => null);
      await clearLocalAuth();

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "You have been logged out.",
      });
    } catch {
      if (pushToken) {
        unregisterPushToken(pushToken).catch(() => null);
        setPushToken(null);
      }

      await clearLocalAuth();

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "You have been logged out.",
      });
    }
  }, [pushToken]);

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

  const getProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile();

      if (response.success && response.data) {
        await secureStorage.setItem(
          AUTH_STORAGE_KEYS.USER,
          JSON.stringify(response.data),
        );
        dispatch({ type: "AUTH_UPDATE_USER", payload: response.data });
      }
    } catch {
      // Silent fail
    }
  }, []);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest): Promise<string | undefined> => {
      const response = await authApi.updateProfile(data);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Update failed.");
      }

      await secureStorage.setItem(
        AUTH_STORAGE_KEYS.USER,
        JSON.stringify(response.data),
      );
      dispatch({ type: "AUTH_UPDATE_USER", payload: response.data });
      return response.message;
    },
    [],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "AUTH_CLEAR_ERROR" });
  }, []);

  const continueAsGuest = useCallback(async () => {
    await secureStorage.setItem(AUTH_STORAGE_KEYS.IS_GUEST, "true");
    setOfflineStorageScopeUserId(null);
    await networkService.setStorageScope(null);
    setIsGuest(true);
    dispatch({ type: "AUTH_GUEST_MODE" });
  }, []);

  const exitGuestMode = useCallback(async () => {
    await secureStorage.removeItem(AUTH_STORAGE_KEYS.IS_GUEST);
    setOfflineStorageScopeUserId(null);
    await networkService.setStorageScope(null);
    setIsGuest(false);
    dispatch({ type: "AUTH_SET_LOADING", payload: false });
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      loginWithGoogle,
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
      loginWithGoogle,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthContext;
