/**
 * Offline Sync Service - offline download helpers and bulk queue sync
 */
import * as FileSystem from "expo-file-system/legacy";

import pilgrimPlannerApi from "../api/pilgrim/plannerApi";
import networkService, { OfflineAction } from "../network/networkService";
import {
  OfflinePlannerData,
  OfflinePlannerStoredData,
  offlinePlannerService,
} from "./offlinePlannerService";

interface DownloadProgress {
  total: number;
  downloaded: number;
  currentStep: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  synced?: number;
  failed?: number;
}

interface SyncActionResult {
  client_action_id?: string;
  success?: boolean;
  status?: string;
}

interface SyncResponseData {
  synced_action_ids?: string[];
  failed_action_ids?: string[];
  results?: SyncActionResult[];
}

const isActionSuccessful = (result: SyncActionResult) => {
  if (typeof result.success === "boolean") {
    return result.success;
  }

  return !["failed", "error", "rejected"].includes(
    (result.status || "").toLowerCase(),
  );
};

class OfflineSyncService {
  constructor() {
    networkService.setSyncHandler(async () => {
      const result = await this.syncOfflineActions();
      return result.success && (result.failed || 0) === 0;
    });
  }

  /**
   * Download offline data for a planner
   */
  async downloadPlannerData(
    plannerId: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        return {
          success: false,
          message: "Không có kết nối mạng",
        };
      }

      onProgress?.({
        total: 3,
        downloaded: 0,
        currentStep: "Đang tải dữ liệu kế hoạch...",
      });

      const response = await pilgrimPlannerApi.getOfflineData(plannerId);

      if (!response.success || !response.data) {
        return {
          success: false,
          message: response.message || "Không thể tải dữ liệu",
        };
      }

      const offlineData = response.data as OfflinePlannerData;

      onProgress?.({
        total: 3,
        downloaded: 1,
        currentStep: "Đang tải hình ảnh...",
      });

      const cachedImages = await this.cacheImages(
        offlineData.site_media || [],
        (current, total) => {
          onProgress?.({
            total: 3,
            downloaded: 1,
            currentStep: `Đang tải hình ảnh ${current}/${total}...`,
          });
        },
      );

      onProgress?.({
        total: 3,
        downloaded: 2,
        currentStep: "Đang lưu dữ liệu...",
      });

      await offlinePlannerService.savePlannerData(plannerId, {
        ...offlineData,
        cached_images: cachedImages,
      } as OfflinePlannerStoredData);

      onProgress?.({
        total: 3,
        downloaded: 3,
        currentStep: "Hoàn thành!",
      });

      return {
        success: true,
        message: "Đã tải dữ liệu ngoại tuyến thành công",
      };
    } catch (error: any) {
      console.error("Download offline data error:", error);
      return {
        success: false,
        message: error.message || "Tải dữ liệu thất bại",
      };
    }
  }

  async getOfflinePlannerEntity(plannerId: string) {
    return offlinePlannerService.getPlannerEntity(plannerId);
  }

  /**
   * Cache images to local file system (thumbnails only)
   */
  private async cacheImages(
    siteMedia: any[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<Record<string, string>> {
    const cachedImages: Record<string, string> = {};
    const cacheDir = FileSystem.cacheDirectory;

    if (!cacheDir) {
      console.warn("cacheDirectory not available");
      return cachedImages;
    }

    const thumbnails = siteMedia.filter((media) => media.thumbnail_url);
    const total = Math.min(thumbnails.length, 20);

    for (let index = 0; index < total; index += 1) {
      const media = thumbnails[index];

      try {
        onProgress?.(index + 1, total);

        const fileUri = `${cacheDir}offline_${media.id}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(
          media.thumbnail_url,
          fileUri,
        );

        if (downloadResult.status === 200) {
          cachedImages[media.id] = downloadResult.uri;
        }
      } catch (error) {
        console.warn(`Failed to cache image ${media.id}:`, error);
      }
    }

    return cachedImages;
  }

  /**
   * Sync queued offline actions to server.
   */
  async syncOfflineActions(): Promise<SyncResult> {
    try {
      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        return {
          success: false,
          message: "Không có kết nối mạng",
        };
      }

      const queue = networkService.getOfflineQueue();

      if (queue.length === 0) {
        return {
          success: true,
          message: "Không có hành động nào cần đồng bộ",
          synced: 0,
          failed: 0,
        };
      }

      const actions = queue.map((action) => {
        let type = "UNKNOWN";
        if (action.endpoint.includes("/checkin")) {
          type = "CHECK_IN";
        } else if (action.endpoint.includes("/journals")) {
          type = "CREATE_JOURNAL";
        } else if (action.endpoint.includes("/items")) {
          if (action.method === "POST") type = "ADD_ITEM";
          if (action.method === "PUT" || action.method === "PATCH") {
            type = "UPDATE_ITEM";
          }
          if (action.method === "DELETE") type = "DELETE_ITEM";
        }

        return {
          client_action_id: action.id,
          type,
          offline_time: new Date(action.timestamp).toISOString(),
          ...action.data,
        };
      });

      const response = await pilgrimPlannerApi.syncOfflineActions({ actions });
      const syncData = (response.data || {}) as SyncResponseData;
      const queueResolution = this.resolveQueueAfterSync(queue, syncData);

      if (queueResolution.hasKnownResult) {
        await networkService.replaceOfflineQueue(queueResolution.failedActions);
      } else if (response.success) {
        await networkService.clearOfflineQueue();
      }

      const syncedCount = queue.length - queueResolution.failedActions.length;
      const failedCount = queueResolution.hasKnownResult
        ? queueResolution.failedActions.length
        : response.success
          ? 0
          : queue.length;

      return {
        success: response.success && failedCount === 0,
        message: response.message || "Đồng bộ hoàn tất",
        synced: queueResolution.hasKnownResult
          ? syncedCount
          : response.success
            ? queue.length
            : 0,
        failed: failedCount,
      };
    } catch (error: any) {
      console.error("Sync offline actions error:", error);
      return {
        success: false,
        message: error.message || "Đồng bộ thất bại",
        synced: 0,
        failed: networkService.getOfflineQueue().length,
      };
    }
  }

  /**
   * Check if planner is available offline
   */
  async isPlannerAvailableOffline(plannerId: string): Promise<boolean> {
    return offlinePlannerService.isPlannerAvailableOffline(plannerId);
  }

  /**
   * Delete offline planner data
   */
  async deleteOfflineData(plannerId: string): Promise<void> {
    const data = await offlinePlannerService.getPlannerData(plannerId);
    if (data?.cached_images) {
      for (const imageUri of Object.values(data.cached_images)) {
        try {
          await FileSystem.deleteAsync(imageUri, { idempotent: true });
        } catch (error) {
          console.warn("Failed to delete cached image:", error);
        }
      }
    }

    await offlinePlannerService.deletePlannerData(plannerId);
  }

  /**
   * Get offline storage stats
   */
  async getOfflineStats() {
    return offlinePlannerService.getOfflineStats();
  }

  private resolveQueueAfterSync(queue: OfflineAction[], syncData: SyncResponseData) {
    const explicitFailedIds = new Set(syncData.failed_action_ids || []);
    const explicitSyncedIds = new Set(syncData.synced_action_ids || []);

    syncData.results?.forEach((result) => {
      const actionId = result.client_action_id;
      if (!actionId) {
        return;
      }

      if (isActionSuccessful(result)) {
        explicitSyncedIds.add(actionId);
      } else {
        explicitFailedIds.add(actionId);
      }
    });

    const hasKnownResult =
      explicitFailedIds.size > 0 ||
      explicitSyncedIds.size > 0 ||
      Boolean(syncData.results?.length);

    if (!hasKnownResult) {
      return {
        hasKnownResult: false,
        failedActions: queue,
      };
    }

    const failedActions = queue.filter((action) => {
      if (explicitFailedIds.has(action.id)) {
        return true;
      }
      if (explicitSyncedIds.has(action.id)) {
        return false;
      }
      return true;
    });

    return {
      hasKnownResult: true,
      failedActions,
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
