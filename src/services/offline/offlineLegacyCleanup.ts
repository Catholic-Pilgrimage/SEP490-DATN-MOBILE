import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import type { OfflinePlannerStoredData } from "./offlinePlannerService";

const LEGACY_CLEANUP_FLAG_KEY = "@offline_storage_cleanup_v1";
const LEGACY_PLANNER_KEY_PREFIX = "@offline_planner_";
const LEGACY_LAST_SYNC_KEY_PREFIX = "@offline_last_sync_";
const LEGACY_PLANNER_LIST_KEY = "@offline_planner_list";
const LEGACY_QUEUE_KEY = "@offline_queue";

let cleanupPromise: Promise<void> | null = null;

const isLegacyPlannerKey = (key: string) =>
  key.startsWith(LEGACY_PLANNER_KEY_PREFIX);

const isLegacyKey = (key: string) =>
  key === LEGACY_PLANNER_LIST_KEY ||
  key === LEGACY_QUEUE_KEY ||
  isLegacyPlannerKey(key) ||
  key.startsWith(LEGACY_LAST_SYNC_KEY_PREFIX);

const deleteFileIfExists = async (fileUri?: string | null) => {
  if (!fileUri) {
    return;
  }

  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.warn(`Failed to delete legacy offline file at ${fileUri}:`, error);
  }
};

const cleanupLegacyPlannerFiles = async (rawPlannerData: string) => {
  try {
    const parsed = JSON.parse(rawPlannerData) as OfflinePlannerStoredData;
    const cachedImageUris = Object.values(parsed.cached_images || {});

    await Promise.all([
      ...cachedImageUris.map((fileUri) => deleteFileIfExists(fileUri)),
      deleteFileIfExists(parsed.offline_map?.directory_uri),
    ]);
  } catch (error) {
    console.warn("Failed to parse legacy offline planner data for cleanup:", error);
  }
};

export const ensureLegacyOfflineStorageCleanup = async () => {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    try {
      const alreadyCleaned = await AsyncStorage.getItem(LEGACY_CLEANUP_FLAG_KEY);
      if (alreadyCleaned === "true") {
        return;
      }

      const allKeys = await AsyncStorage.getAllKeys();
      const legacyKeys = allKeys.filter(isLegacyKey);

      if (legacyKeys.length > 0) {
        const legacyPlannerEntries = await AsyncStorage.multiGet(
          legacyKeys.filter(isLegacyPlannerKey),
        );

        await Promise.all(
          legacyPlannerEntries
            .map(([, rawPlannerData]) => rawPlannerData)
            .filter((rawPlannerData): rawPlannerData is string => Boolean(rawPlannerData))
            .map((rawPlannerData) => cleanupLegacyPlannerFiles(rawPlannerData)),
        );

        await AsyncStorage.multiRemove(legacyKeys);
      }

      await AsyncStorage.setItem(LEGACY_CLEANUP_FLAG_KEY, "true");
    } catch (error) {
      console.warn("Failed to clean up legacy offline storage:", error);
    }
  })();

  return cleanupPromise;
};
