import { AUTH_STORAGE_KEYS } from "../../types/auth.types";
import { secureStorage } from "../storage/secureStorage";

interface StoredAuthUser {
  id?: string;
}

let cachedUserId: string | null | undefined;

const parseStoredUserId = (rawUser: string | null): string | null => {
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as StoredAuthUser;
    return typeof parsed.id === "string" && parsed.id.trim()
      ? parsed.id.trim()
      : null;
  } catch (error) {
    console.warn("Failed to parse stored auth user for offline scope:", error);
    return null;
  }
};

export const getOfflineStorageScopeUserId = async (): Promise<string | null> => {
  if (cachedUserId !== undefined) {
    return cachedUserId;
  }

  const rawUser = await secureStorage.getItem(AUTH_STORAGE_KEYS.USER);
  cachedUserId = parseStoredUserId(rawUser);
  return cachedUserId;
};

export const setOfflineStorageScopeUserId = (userId: string | null) => {
  cachedUserId = userId && userId.trim() ? userId.trim() : null;
};

export const resetOfflineStorageScopeUserId = async () => {
  cachedUserId = undefined;
  return getOfflineStorageScopeUserId();
};

