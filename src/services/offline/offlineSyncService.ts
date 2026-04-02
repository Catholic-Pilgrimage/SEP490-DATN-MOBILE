/**
 * Offline Sync Service - offline download helpers and bulk queue sync
 */
import * as FileSystem from "expo-file-system/legacy";
import Toast from "react-native-toast-message";

import pilgrimPlannerApi from "../api/pilgrim/plannerApi";
import networkService, { OfflineAction } from "../network/networkService";
import offlineMapService from "./offlineMapService";
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
  source?: SyncSource;
  syncedActions?: OfflineAction[];
  failedActions?: OfflineAction[];
}

type SyncSource = "manual" | "auto";
type SyncResultListener = (result: SyncResult) => void;
type SyncOfflineActionsOptions = {
  source?: SyncSource;
  showToast?: boolean;
};

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

interface NormalizedApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface DirectSyncActionResult {
  success: boolean;
  message?: string;
  plannerIds?: string[];
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object";

const isOfflinePlannerPayload = (value: unknown): value is OfflinePlannerData =>
  isRecord(value) &&
  isRecord(value.planner) &&
  Array.isArray(value.items) &&
  Array.isArray(value.sites);

const normalizeApiResponse = <T>(
  payload: unknown,
  isData: (value: unknown) => value is T,
): NormalizedApiResponse<T> => {
  if (isData(payload)) {
    return {
      success: true,
      message: "",
      data: payload,
    };
  }

  if (!isRecord(payload)) {
    return {
      success: false,
      message: "Phan hoi tu server khong hop le",
    };
  }

  const success =
    typeof payload.success === "boolean" ? payload.success : undefined;
  const message = typeof payload.message === "string" ? payload.message : "";

  if (isData(payload.data)) {
    return {
      success: success ?? true,
      message,
      data: payload.data,
    };
  }

  if (isRecord(payload.data) && isData(payload.data.data)) {
    return {
      success: success ?? true,
      message,
      data: payload.data.data,
    };
  }

  if (success !== undefined) {
    return {
      success,
      message,
    };
  }

  return {
    success: false,
    message: "Dinh dang phan hoi khong nhu mong doi",
  };
};

const OFFLINE_ITEM_PREFIX = "offline_";
const ADD_ITEM_ENDPOINT_PATTERN = /^\/api\/planners\/([^/]+)\/items$/;
const ITEM_ENDPOINT_PATTERN = /^\/api\/planners\/([^/]+)\/items\/([^/]+)$/;
const CHECKIN_ENDPOINT_PATTERN =
  /^\/api\/planners\/([^/]+)\/items\/([^/]+)\/checkin$/;
const REORDER_ENDPOINT_PATTERN =
  /^\/api\/planners\/([^/]+)\/items\/reorder$/;

const getNestedString = (
  container: Record<string, any>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = container[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const collectResponseRecords = (payload: unknown): Record<string, any>[] => {
  if (!isRecord(payload)) {
    return [];
  }

  const records: Record<string, any>[] = [payload];
  const directKeys = ["data", "item", "planner_item", "plannerItem"];

  directKeys.forEach((key) => {
    if (isRecord(payload[key])) {
      records.push(payload[key]);
    }
  });

  if (isRecord(payload.data)) {
    directKeys.forEach((key) => {
      if (isRecord(payload.data[key])) {
        records.push(payload.data[key]);
      }
    });
  }

  return records;
};

const extractPlannerItemId = (payload: unknown): string | undefined => {
  const records = collectResponseRecords(payload);

  for (const record of records) {
    const id = getNestedString(record, ["id", "planner_item_id", "item_id"]);
    if (id) {
      return id;
    }
  }

  return undefined;
};

const omitKeys = (
  container: Record<string, any>,
  keys: string[],
): Record<string, any> => {
  const clone = { ...container };

  keys.forEach((key) => {
    delete clone[key];
  });

  return clone;
};

const getNestedRecord = (
  container: Record<string, any>,
  keys: string[],
): Record<string, any> | undefined => {
  for (const key of keys) {
    if (isRecord(container[key])) {
      return container[key];
    }
  }

  return undefined;
};

const getNestedArray = (
  container: Record<string, any>,
  keys: string[],
): any[] => {
  for (const key of keys) {
    if (Array.isArray(container[key])) {
      return container[key];
    }
  }

  return [];
};

const normalizeOfflinePlannerData = (
  payload: unknown,
): NormalizedApiResponse<OfflinePlannerData> => {
  if (isOfflinePlannerPayload(payload)) {
    return {
      success: true,
      message: "",
      data: payload,
    };
  }

  if (!isRecord(payload)) {
    return {
      success: false,
      message: "Phan hoi tu server khong hop le",
    };
  }

  const success =
    typeof payload.success === "boolean" ? payload.success : undefined;
  const message = typeof payload.message === "string" ? payload.message : "";

  const containers = [
    payload,
    isRecord(payload.data) ? payload.data : undefined,
    isRecord(payload.data) && isRecord(payload.data.data)
      ? payload.data.data
      : undefined,
  ].filter((value): value is Record<string, any> => isRecord(value));

  for (const container of containers) {
    const plannerSource = getNestedRecord(container, ["planner", "plan"]);
    if (!plannerSource) {
      continue;
    }

    const rawItems = [
      ...getNestedArray(container, [
        "items",
        "planner_items",
        "plan_items",
        "itinerary_items",
      ]),
      ...getNestedArray(plannerSource, [
        "items",
        "planner_items",
        "plan_items",
        "itinerary_items",
      ]),
    ];

    const rawSites = [
      ...getNestedArray(container, ["sites", "site_details", "siteDetails"]),
      ...getNestedArray(plannerSource, [
        "sites",
        "site_details",
        "siteDetails",
      ]),
    ];

    const derivedSites = rawItems
      .map((item) =>
        isRecord(item)
          ? getNestedRecord(item, ["site", "destination", "pilgrimage_site"])
          : undefined,
      )
      .filter((site): site is Record<string, any> => isRecord(site));

    const siteMap = new Map<string, OfflinePlannerData["sites"][number]>();
    [...rawSites, ...derivedSites].forEach((site) => {
      const siteId = String(site.id || site.site_id || "").trim();
      if (!siteId) {
        return;
      }

      siteMap.set(siteId, {
        id: siteId,
        name: String(site.name || site.site_name || "Pilgrimage Site"),
        name_en: typeof site.name_en === "string" ? site.name_en : undefined,
        description:
          typeof site.description === "string" ? site.description : undefined,
        description_en:
          typeof site.description_en === "string"
            ? site.description_en
            : undefined,
        address: typeof site.address === "string" ? site.address : undefined,
        province: typeof site.province === "string" ? site.province : undefined,
        region: typeof site.region === "string" ? site.region : undefined,
        latitude: site.latitude,
        longitude: site.longitude,
        site_type:
          typeof site.site_type === "string" ? site.site_type : undefined,
        opening_hours:
          typeof site.opening_hours === "string"
            ? site.opening_hours
            : undefined,
        cover_image:
          typeof site.cover_image === "string"
            ? site.cover_image
            : typeof site.image === "string"
              ? site.image
              : undefined,
      });
    });

    const plannerId = String(
      plannerSource.id || plannerSource.planner_id || "",
    ).trim();
    if (!plannerId) {
      continue;
    }

    const normalizedItems = rawItems
      .map((item, index) => {
        if (!isRecord(item)) {
          return null;
        }

        const nestedSite = getNestedRecord(item, [
          "site",
          "destination",
          "pilgrimage_site",
        ]);

        const itemId = String(
          item.id || item.uuid || item.planner_item_id || "",
        ).trim();
        const siteId = String(
          item.site_id || item.siteId || nestedSite?.id || "",
        ).trim();

        if (!itemId || !siteId) {
          return null;
        }

        return {
          id: itemId,
          planner_id: String(item.planner_id || item.plannerId || plannerId),
          site_id: siteId,
          day_number: Number(
            item.day_number ??
              item.leg_number ??
              item.dayNumber ??
              item.day ??
              1,
          ),
          order_in_day: Number(
            item.order_in_day ||
              item.order_index ||
              item.orderIndex ||
              index + 1,
          ),
          estimated_time:
            typeof item.estimated_time === "string"
              ? item.estimated_time
              : typeof item.estimatedTime === "string"
                ? item.estimatedTime
                : typeof item.arrival_time === "string"
                  ? item.arrival_time
                  : undefined,
          duration_minutes:
            typeof item.duration_minutes === "number"
              ? item.duration_minutes
              : typeof item.durationMinutes === "number"
                ? item.durationMinutes
                : undefined,
          travel_time_minutes:
            typeof item.travel_time_minutes === "number"
              ? item.travel_time_minutes
              : typeof item.travelTimeMinutes === "number"
                ? item.travelTimeMinutes
                : undefined,
          notes:
            typeof item.notes === "string"
              ? item.notes
              : typeof item.note === "string"
                ? item.note
                : undefined,
          note:
            typeof item.note === "string"
              ? item.note
              : typeof item.notes === "string"
                ? item.notes
                : undefined,
          rest_duration:
            typeof item.rest_duration === "string"
              ? item.rest_duration
              : typeof item.restDuration === "string"
                ? item.restDuration
                : undefined,
          event_id:
            typeof item.event_id === "string"
              ? item.event_id
              : typeof item.eventId === "string"
                ? item.eventId
                : undefined,
          nearby_amenity_ids: Array.isArray(item.nearby_amenity_ids)
            ? item.nearby_amenity_ids
            : Array.isArray(item.nearbyAmenityIds)
              ? item.nearbyAmenityIds
              : [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      success: success ?? true,
      message,
      data: {
        planner: {
          id: plannerId,
          name: String(
            plannerSource.name || plannerSource.plan_name || "Pilgrimage Plan",
          ),
          start_date: String(
            plannerSource.start_date || plannerSource.startDate || "",
          ),
          end_date: String(
            plannerSource.end_date || plannerSource.endDate || "",
          ),
          total_days:
            typeof plannerSource.total_days === "number"
              ? plannerSource.total_days
              : typeof plannerSource.number_of_days === "number"
                ? plannerSource.number_of_days
                : undefined,
          number_of_people:
            typeof plannerSource.number_of_people === "number"
              ? plannerSource.number_of_people
              : undefined,
          transportation:
            typeof plannerSource.transportation === "string"
              ? plannerSource.transportation
              : undefined,
          status:
            typeof plannerSource.status === "string"
              ? plannerSource.status
              : undefined,
          owner: isRecord(plannerSource.owner)
            ? (plannerSource.owner as OfflinePlannerData["planner"]["owner"])
            : undefined,
          share_token:
            typeof plannerSource.share_token === "string"
              ? plannerSource.share_token
              : undefined,
          qr_code_url:
            typeof plannerSource.qr_code_url === "string"
              ? plannerSource.qr_code_url
              : undefined,
          is_public:
            typeof plannerSource.is_public === "boolean"
              ? plannerSource.is_public
              : undefined,
          created_at:
            typeof plannerSource.created_at === "string"
              ? plannerSource.created_at
              : undefined,
          updated_at:
            typeof plannerSource.updated_at === "string"
              ? plannerSource.updated_at
              : undefined,
        },
        items: normalizedItems,
        sites: Array.from(siteMap.values()),
        site_media: getNestedArray(container, [
          "site_media",
          "siteMedia",
          "media",
        ]),
        mass_schedules: getNestedArray(container, [
          "mass_schedules",
          "massSchedules",
        ]),
        nearby_places: getNestedArray(container, [
          "nearby_places",
          "nearbyPlaces",
        ]),
        downloaded_at:
          typeof container.downloaded_at === "string"
            ? container.downloaded_at
            : new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    message:
      message && !message.toLowerCase().includes("thanh cong")
        ? message
        : "Du lieu offline tra ve khong dung dinh dang mong doi",
  };
};

const isActionSuccessful = (result: SyncActionResult) => {
  if (typeof result.success === "boolean") {
    return result.success;
  }

  return !["failed", "error", "rejected"].includes(
    (result.status || "").toLowerCase(),
  );
};

class OfflineSyncService {
  private readonly syncListeners: SyncResultListener[] = [];

  constructor() {
    networkService.setSyncHandler(async () => {
      const result = await this.syncOfflineActions({
        source: "auto",
        showToast: true,
      });
      return result.success && (result.failed || 0) === 0;
    });
  }

  subscribeToSyncResults(listener: SyncResultListener): () => void {
    this.syncListeners.push(listener);

    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index >= 0) {
        this.syncListeners.splice(index, 1);
      }
    };
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
        total: 4,
        downloaded: 1,
        currentStep: "Đang tải dữ liệu kế hoạch...",
      });

      const rawResponse = await pilgrimPlannerApi.getOfflineData(plannerId);
      const response = normalizeOfflinePlannerData(rawResponse);

      if (!response.success || !response.data) {
        console.warn("Unexpected offline data response:", rawResponse);
        return {
          success: false,
          message: response.message || "Không thể tải dữ liệu",
        };
      }

      const offlineData = response.data as OfflinePlannerData;
      const previousData =
        await offlinePlannerService.getPlannerData(plannerId);

      onProgress?.({
        total: 4,
        downloaded: 2,
        currentStep: "Đang tải hình ảnh...",
      });

      const cachedImages = await this.cacheImages(
        offlineData.site_media || [],
        (current, total) => {
          onProgress?.({
            total: 4,
            downloaded: 2,
            currentStep: `Đang tải hình ảnh ${current}/${total}...`,
          });
        },
      );

      onProgress?.({
        total: 4,
        downloaded: 3,
        currentStep: "Đang lưu dữ liệu...",
      });

      onProgress?.({
        total: 4,
        downloaded: 3,
        currentStep: "Đang tải bản đồ ngoại tuyến...",
      });

      const offlineMapPack = await offlineMapService.downloadPlannerMapPack(
        plannerId,
        offlineData.sites || [],
        (progress) => {
          onProgress?.({
            total: 4,
            downloaded: 3,
            currentStep: `Đang tải bản đồ ngoại tuyến ${progress.downloaded}/${progress.total}...`,
          });
        },
      );

      if (!offlineMapPack && previousData?.offline_map) {
        await offlineMapService.deletePlannerMapPack(
          plannerId,
          previousData.offline_map,
        );
      }

      onProgress?.({
        total: 4,
        downloaded: 4,
        currentStep: "Đang lưu dữ liệu...",
      });

      await offlinePlannerService.savePlannerData(plannerId, {
        ...offlineData,
        cached_images: cachedImages,
        offline_map: offlineMapPack || undefined,
      } as OfflinePlannerStoredData);

      await this.cleanupCachedImages(
        previousData?.cached_images,
        new Set(Object.values(cachedImages)),
      );

      onProgress?.({
        total: 4,
        downloaded: 4,
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

    // Check if siteMedia is valid array
    if (!siteMedia || !Array.isArray(siteMedia) || siteMedia.length === 0) {
      console.log("No site media to cache, skipping image caching");
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
  async syncOfflineActions(
    options: SyncOfflineActionsOptions = {},
  ): Promise<SyncResult> {
    const finalize = (result: SyncResult): SyncResult => {
      const finalResult: SyncResult = {
        ...result,
        source: options.source ?? "manual",
      };

      this.syncListeners.forEach((listener) => {
        try {
          listener(finalResult);
        } catch (error) {
          console.warn("Offline sync listener failed:", error);
        }
      });

      if (options.showToast && this.syncListeners.length === 0) {
        // Show Toast notification for auto-sync
        if (finalResult.source === "auto") {
          Toast.show({
            type: finalResult.success ? "success" : "error",
            text1: finalResult.success
              ? "Đồng bộ thành công"
              : "Đồng bộ thất bại",
            text2: finalResult.message,
            visibilityTime: 3000,
          });
        }
      }

      return finalResult;
    };

    try {
      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        return finalize({
          success: false,
          message: "Không có kết nối mạng",
        });
      }

      const queue = networkService.getOfflineQueue();

      if (queue.length === 0) {
        return finalize({
          success: true,
          message: "Không có hành động nào cần đồng bộ",
          synced: 0,
          failed: 0,
        });
      }

      if (queue.every((action) => this.canDirectSyncAction(action))) {
        const pendingQueue = [...queue];
        const tempItemIdMap = new Map<string, string>();
        const touchedPlannerIds = new Set<string>();
        let syncedCount = 0;
        let failureMessage = "";

        while (pendingQueue.length > 0) {
          const action = pendingQueue[0];
          const result = await this.executeQueueAction(action, tempItemIdMap);

          if (!result.success) {
            failureMessage =
              result.message || "Không thể đồng bộ dữ liệu ngoại tuyến";
            break;
          }

          pendingQueue.shift();
          syncedCount += 1;
          result.plannerIds?.forEach((plannerId) =>
            touchedPlannerIds.add(plannerId),
          );

          if (pendingQueue.length === 0) {
            await networkService.clearOfflineQueue();
          } else {
            await networkService.replaceOfflineQueue(pendingQueue);
          }
        }

        await this.refreshDownloadedPlanners(touchedPlannerIds);

        if (pendingQueue.length === 0) {
          return finalize({
            success: true,
            message: `Đã đồng bộ ${syncedCount} thay đổi ngoại tuyến`,
            synced: syncedCount,
            failed: 0,
          });
        }

        return finalize({
          success: false,
          message:
            syncedCount > 0
              ? `Đã đồng bộ ${syncedCount} thay đổi. ${failureMessage}`
              : failureMessage,
          synced: syncedCount,
          failed: pendingQueue.length,
        });
      }

      const actions = queue.map((action) => {
        let type = "UNKNOWN";
        if (action.endpoint.includes("/checkin")) {
          type = "CHECK_IN";
        } else if (action.endpoint.includes("/journals")) {
          type = "CREATE_JOURNAL";
        } else if (action.endpoint.includes("/items")) {
          if (action.method === "POST" && action.endpoint.includes("/reorder")) {
            type = "REORDER_ITEMS";
          } else if (action.method === "POST") {
            type = "ADD_ITEM";
          }
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

      const rawResponse = await pilgrimPlannerApi.syncOfflineActions({
        actions,
      });
      const response = normalizeApiResponse<Record<string, unknown>>(
        rawResponse,
        isRecord,
      );
      const syncData = (response.data || {}) as SyncResponseData;
      const queueResolution = this.resolveQueueAfterSync(queue, syncData);

      if (queueResolution.hasKnownResult) {
        await networkService.replaceOfflineQueue(queueResolution.failedActions);
      } else if (response.success && queue.length > 0) {
        // BE returned success but no detailed results
        // Keep queue intact to be safe - don't assume all succeeded
        console.warn(
          "Sync returned success but no action results. Keeping queue intact for safety.",
        );
      }

      const syncedCount = queueResolution.hasKnownResult
        ? queue.length - queueResolution.failedActions.length
        : response.success
          ? 0 // Don't claim success without confirmation
          : 0;
      const failedCount = queueResolution.hasKnownResult
        ? queueResolution.failedActions.length
        : response.success
          ? 0 // Unknown - keep queue
          : queue.length;

      return finalize({
        success: response.success && failedCount === 0,
        message: response.message || "Đồng bộ hoàn tất",
        synced: queueResolution.hasKnownResult
          ? syncedCount
          : response.success
            ? queue.length
            : 0,
        failed: failedCount,
      });
    } catch (error: any) {
      console.error("Sync offline actions error:", error);
      return finalize({
        success: false,
        message: error.message || "Đồng bộ thất bại",
        synced: 0,
        failed: networkService.getOfflineQueue().length,
      });
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
    await this.cleanupCachedImages(data?.cached_images);
    await offlineMapService.deletePlannerMapPack(plannerId, data?.offline_map);

    await offlinePlannerService.deletePlannerData(plannerId);
  }

  async clearAllOfflineData(): Promise<void> {
    const plannerIds = await offlinePlannerService.getOfflinePlannerList();

    for (const plannerId of plannerIds) {
      const data = await offlinePlannerService.getPlannerData(plannerId);
      await this.cleanupCachedImages(data?.cached_images);
      await offlineMapService.deletePlannerMapPack(
        plannerId,
        data?.offline_map,
      );
    }

    await offlinePlannerService.clearAllOfflineData();
  }

  async clearPendingActions(): Promise<void> {
    await networkService.clearOfflineQueue();
  }

  /**
   * Get offline storage stats
   */
  async getOfflineStats() {
    return offlinePlannerService.getOfflineStats();
  }

  private canDirectSyncAction(action: OfflineAction) {
    if (
      action.method === "POST" &&
      ADD_ITEM_ENDPOINT_PATTERN.test(action.endpoint)
    ) {
      return true;
    }

    if (
      action.method === "POST" &&
      REORDER_ENDPOINT_PATTERN.test(action.endpoint)
    ) {
      return true;
    }

    if (
      (action.method === "PUT" ||
        action.method === "PATCH" ||
        action.method === "DELETE") &&
      ITEM_ENDPOINT_PATTERN.test(action.endpoint)
    ) {
      return true;
    }

    if (
      action.method === "POST" &&
      CHECKIN_ENDPOINT_PATTERN.test(action.endpoint)
    ) {
      return true;
    }

    return false;
  }

  private async executeQueueAction(
    action: OfflineAction,
    tempItemIdMap: Map<string, string>,
  ): Promise<DirectSyncActionResult> {
    const reorderMatch =
      action.method === "POST"
        ? action.endpoint.match(REORDER_ENDPOINT_PATTERN)
        : null;

    if (reorderMatch) {
      return this.syncReorderPlannerItemsAction(action, reorderMatch[1]);
    }

    const addMatch =
      action.method === "POST"
        ? action.endpoint.match(ADD_ITEM_ENDPOINT_PATTERN)
        : null;

    if (addMatch) {
      return this.syncAddPlannerItemAction(action, addMatch[1], tempItemIdMap);
    }

    const itemMatch = action.endpoint.match(ITEM_ENDPOINT_PATTERN);
    if (
      itemMatch &&
      (action.method === "PUT" ||
        action.method === "PATCH" ||
        action.method === "DELETE")
    ) {
      return this.syncPlannerItemMutation(
        action,
        itemMatch[1],
        itemMatch[2],
        tempItemIdMap,
      );
    }

    const checkInMatch =
      action.method === "POST"
        ? action.endpoint.match(CHECKIN_ENDPOINT_PATTERN)
        : null;

    if (checkInMatch) {
      return this.syncCheckInAction(
        action,
        checkInMatch[1],
        checkInMatch[2],
        tempItemIdMap,
      );
    }

    return {
      success: false,
      message: `Không hỗ trợ đồng bộ cho hành động ${action.method} ${action.endpoint}`,
    };
  }

  private async syncAddPlannerItemAction(
    action: OfflineAction,
    plannerId: string,
    tempItemIdMap: Map<string, string>,
  ): Promise<DirectSyncActionResult> {
    const rawPayload = isRecord(action.data) ? action.data : {};
    const clientItemId =
      typeof rawPayload.client_item_id === "string"
        ? rawPayload.client_item_id.trim()
        : "";
    const requestPayload = omitKeys(rawPayload, [
      "client_item_id",
      "planner_item_id",
    ]);
    const response = await pilgrimPlannerApi.addPlanItem(
      plannerId,
      requestPayload as any,
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Không thể đồng bộ địa điểm mới",
        plannerIds: [plannerId],
      };
    }

    if (clientItemId) {
      const serverItemId = extractPlannerItemId(response);
      if (!serverItemId) {
        return {
          success: false,
          message: "Không nhận được ID item mới từ server để tiếp tục đồng bộ",
          plannerIds: [plannerId],
        };
      }

      tempItemIdMap.set(clientItemId, serverItemId);
    }

    return {
      success: true,
      plannerIds: [plannerId],
    };
  }

  private async syncReorderPlannerItemsAction(
    action: OfflineAction,
    plannerId: string,
  ): Promise<DirectSyncActionResult> {
    const raw = isRecord(action.data) ? action.data : {};
    const legRaw = raw.leg_number;
    const legNumber =
      typeof legRaw === "number"
        ? legRaw
        : typeof legRaw === "string"
          ? Number(legRaw)
          : NaN;
    const ids = Array.isArray(raw.item_ids) ? raw.item_ids : [];
    const itemIds = ids.filter((id): id is string => typeof id === "string");

    if (!Number.isFinite(legNumber) || legNumber < 1 || itemIds.length === 0) {
      return {
        success: false,
        message: "Dữ liệu reorder không hợp lệ",
        plannerIds: [plannerId],
      };
    }

    const response = await pilgrimPlannerApi.reorderPlannerItems(plannerId, {
      leg_number: legNumber,
      item_ids: itemIds,
    });

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Không thể đồng bộ thứ tự điểm",
        plannerIds: [plannerId],
      };
    }

    return {
      success: true,
      plannerIds: [plannerId],
    };
  }

  private async syncPlannerItemMutation(
    action: OfflineAction,
    plannerId: string,
    itemId: string,
    tempItemIdMap: Map<string, string>,
  ): Promise<DirectSyncActionResult> {
    const resolvedItemId = this.resolveQueuedItemId(itemId, tempItemIdMap);

    if (!resolvedItemId) {
      return {
        success: false,
        message:
          "Không thể đối chiếu item tạo offline với item trên server. Vui lòng tải lại kế hoạch và thử đồng bộ lại.",
        plannerIds: [plannerId],
      };
    }

    if (action.method === "DELETE") {
      const response = await pilgrimPlannerApi.deletePlanItem(
        plannerId,
        resolvedItemId,
      );

      return {
        success: response.success,
        message: response.message || "Không thể đồng bộ thao tác xóa",
        plannerIds: [plannerId],
      };
    }

    const rawPayload = isRecord(action.data) ? action.data : {};
    const requestPayload = omitKeys(rawPayload, [
      "planner_item_id",
      "client_item_id",
    ]);
    const response = await pilgrimPlannerApi.updatePlanItem(
      plannerId,
      resolvedItemId,
      requestPayload as any,
    );

    return {
      success: response.success,
      message: response.message || "Không thể đồng bộ thao tác cập nhật",
      plannerIds: [plannerId],
    };
  }

  private async syncCheckInAction(
    action: OfflineAction,
    plannerId: string,
    itemId: string,
    tempItemIdMap: Map<string, string>,
  ): Promise<DirectSyncActionResult> {
    const resolvedItemId = this.resolveQueuedItemId(itemId, tempItemIdMap);

    if (!resolvedItemId) {
      return {
        success: false,
        message:
          "Không thể đồng bộ check-in cho item tạo offline vì chưa đối chiếu được ID server",
      };
    }

    const rawPayload = isRecord(action.data) ? action.data : {};
    const requestPayload = omitKeys(rawPayload, [
      "planner_item_id",
      "client_item_id",
    ]);
    const response = await pilgrimPlannerApi.checkInPlanItem(
      plannerId,
      resolvedItemId,
      requestPayload as any,
    );

    return {
      success: response.success,
      message: response.message || "Không thể đồng bộ check-in",
    };
  }

  private resolveQueuedItemId(
    itemId: string,
    tempItemIdMap: Map<string, string>,
  ): string | undefined {
    if (!itemId.startsWith(OFFLINE_ITEM_PREFIX)) {
      return itemId;
    }

    return tempItemIdMap.get(itemId);
  }

  private async refreshDownloadedPlanners(plannerIds: Iterable<string>) {
    const uniquePlannerIds = [
      ...new Set(Array.from(plannerIds).filter(Boolean)),
    ];

    for (const plannerId of uniquePlannerIds) {
      try {
        const isDownloaded =
          await offlinePlannerService.isPlannerAvailableOffline(plannerId);
        if (!isDownloaded) {
          continue;
        }

        const result = await this.downloadPlannerData(plannerId);
        if (!result.success) {
          console.warn(
            `Failed to refresh downloaded planner ${plannerId}: ${result.message}`,
          );
        }
      } catch (error) {
        console.warn(
          `Failed to refresh downloaded planner ${plannerId}:`,
          error,
        );
      }
    }
  }

  private async cleanupCachedImages(
    cachedImages?: Record<string, string>,
    keepUris?: Set<string>,
  ) {
    if (!cachedImages) {
      return;
    }

    for (const imageUri of Object.values(cachedImages)) {
      if (!imageUri || keepUris?.has(imageUri)) {
        continue;
      }

      try {
        await FileSystem.deleteAsync(imageUri, { idempotent: true });
      } catch (error) {
        console.warn("Failed to delete cached image:", error);
      }
    }
  }

  private async syncOfflineActionsViaServer(
    queue: OfflineAction[],
  ): Promise<SyncResult> {
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

    const rawResponse = await pilgrimPlannerApi.syncOfflineActions({ actions });
    const response = normalizeApiResponse<Record<string, unknown>>(
      rawResponse,
      isRecord,
    );
    const syncData = (response.data || {}) as SyncResponseData;
    const queueResolution = this.resolveQueueAfterSync(queue, syncData);

    if (queueResolution.hasKnownResult) {
      await networkService.replaceOfflineQueue(queueResolution.failedActions);
    } else if (response.success && queue.length > 0) {
      console.warn(
        "Sync returned success but no action results. Keeping queue intact for safety.",
      );
    }

    const syncedCount = queueResolution.hasKnownResult
      ? queue.length - queueResolution.failedActions.length
      : response.success
        ? 0
        : 0;
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
  }

  private resolveQueueAfterSync(
    queue: OfflineAction[],
    syncData: SyncResponseData,
  ) {
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
