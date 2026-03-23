/**
 * Offline Planner Service - planner cache storage and local mutations
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { PlanEntity, PlanItem, PlanOwner } from "../../types/pilgrim/planner.types";
import type { OfflineMapPack } from "./offlineMapService";

const STORAGE_KEYS = {
  PLANNER: (id: string) => `@offline_planner_${id}`,
  PLANNER_LIST: "@offline_planner_list",
  LAST_SYNC: (id: string) => `@offline_last_sync_${id}`,
};

export const createOfflinePlannerItemId = () =>
  `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export interface OfflinePlannerData {
  planner: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    total_days?: number;
    number_of_people?: number;
    transportation?: string;
    status?: string;
    owner?: PlanOwner;
    share_token?: string;
    qr_code_url?: string;
    is_public?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  items: OfflinePlannerItem[];
  sites: OfflinePlannerSite[];
  site_media: OfflinePlannerSiteMedia[];
  mass_schedules: OfflinePlannerMassSchedule[];
  nearby_places: OfflinePlannerNearbyPlace[];
  downloaded_at: string;
}

export interface OfflinePlannerItem {
  id: string;
  planner_id: string;
  site_id: string;
  day_number: number;
  order_in_day: number;
  estimated_time?: string;
  duration_minutes?: number;
  travel_time_minutes?: number;
  notes?: string;
  note?: string;
  rest_duration?: string;
  event_id?: string;
  nearby_amenity_ids?: string[];
}

export interface OfflinePlannerSite {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  address?: string;
  province?: string;
  region?: string;
  latitude?: string | number;
  longitude?: string | number;
  site_type?: string;
  opening_hours?: string;
  cover_image?: string;
}

export interface OfflinePlannerSiteMedia {
  id: string;
  site_id: string;
  media_type: "image" | "video" | "model_3d";
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
}

export interface OfflinePlannerMassSchedule {
  id: string;
  site_id: string;
  time: string;
  days_of_week: number[];
  language?: string;
  notes?: string;
}

export interface OfflinePlannerNearbyPlace {
  id: string;
  site_id: string;
  name: string;
  place_type: string;
  address: string;
  latitude?: string | number;
  longitude?: string | number;
  phone?: string;
  description?: string;
}

export interface OfflinePlannerStoredData extends OfflinePlannerData {
  cached_images?: Record<string, string>;
  offline_map?: OfflineMapPack;
}

export interface OfflinePlannerSummary {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  totalDays: number;
  itemCount: number;
  siteCount: number;
  sizeBytes: number;
  downloadedAt: string;
  coverImage?: string;
}

export interface OfflinePlannerItemDraft {
  id?: string;
  site_id: string;
  day_number: number;
  estimated_time?: string;
  rest_duration?: string;
  note?: string;
  event_id?: string | null;
  nearby_amenity_ids?: string[];
  travel_time_minutes?: number;
  site?: {
    id?: string;
    name?: string;
    address?: string;
    cover_image?: string;
    latitude?: number | string;
    longitude?: number | string;
    region?: string;
    province?: string;
    site_type?: string;
  };
}

const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getStringSizeInBytes = (value: string) => {
  try {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(value).length;
    }
  } catch (error) {
    console.warn("Failed to calculate UTF-8 size with TextEncoder:", error);
  }

  try {
    return unescape(encodeURIComponent(value)).length;
  } catch (error) {
    console.warn("Failed to calculate UTF-8 size with encodeURIComponent:", error);
  }

  return value.length;
};

const toNumber = (value?: number | string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseDurationToMinutes = (value?: string | number) => {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const normalized = value.toLowerCase();
  let minutes = 0;

  const hourMatches = normalized.match(/(\d+)\s*(hour|hours|gio|giờ)/g);
  const minuteMatches = normalized.match(/(\d+)\s*(minute|minutes|phut|phút)/g);

  hourMatches?.forEach((match) => {
    minutes += parseInt(match, 10) * 60;
  });

  minuteMatches?.forEach((match) => {
    minutes += parseInt(match, 10);
  });

  if (minutes === 0) {
    const rawValue = parseInt(normalized, 10);
    return Number.isNaN(rawValue) ? 0 : rawValue;
  }

  return minutes;
};

const formatDurationString = (value?: string | number) => {
  const totalMinutes = parseDurationToMinutes(value);
  if (!totalMinutes) {
    return undefined;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }

  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};

const buildItemCollections = (
  items: PlanItem[],
): { items: PlanItem[]; items_by_day: Record<string, PlanItem[]> } => {
  const grouped: Record<string, PlanItem[]> = {};

  items.forEach((item) => {
    const dayKey = String(item.day_number || 1);
    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }
    grouped[dayKey].push(item);
  });

  Object.values(grouped).forEach((dayItems) => {
    dayItems.sort((left, right) => {
      const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return (left.estimated_time || "").localeCompare(right.estimated_time || "");
    });
  });

  const orderedDays = Object.keys(grouped)
    .sort((left, right) => Number(left) - Number(right))
    .flatMap((dayKey) => grouped[dayKey]);

  return {
    items: orderedDays,
    items_by_day: grouped,
  };
};

const mapOfflineDataToPlanEntity = (
  data: OfflinePlannerStoredData,
): PlanEntity => {
  const siteById = new Map(data.sites.map((site) => [site.id, site]));
  const imageBySiteId = new Map<string, string>();

  data.site_media.forEach((media) => {
    const imageUri =
      data.cached_images?.[media.id] || media.thumbnail_url || media.media_url;
    if (imageUri && !imageBySiteId.has(media.site_id)) {
      imageBySiteId.set(media.site_id, imageUri);
    }
  });

  const planItems = data.items.map((item) => {
    const site = siteById.get(item.site_id);
    const coverImage = imageBySiteId.get(item.site_id) || site?.cover_image;

    return {
      id: item.id,
      planner_id: item.planner_id,
      site_id: item.site_id,
      event_id: item.event_id,
      day_number: item.day_number,
      order_index: item.order_in_day,
      note: item.note ?? item.notes,
      nearby_amenity_ids: item.nearby_amenity_ids,
      estimated_time: item.estimated_time,
      rest_duration: item.rest_duration || formatDurationString(item.duration_minutes),
      site: {
        id: site?.id || item.site_id,
        name: site?.name || "Pilgrimage Site",
        image: coverImage,
        cover_image: coverImage,
        address: site?.address,
        latitude: toNumber(site?.latitude),
        longitude: toNumber(site?.longitude),
      },
    } satisfies PlanItem;
  });

  const collections = buildItemCollections(planItems);
  const highestDay =
    planItems.reduce((currentMax, item) => {
      return Math.max(currentMax, item.day_number || 1);
    }, 1) || 1;

  return {
    id: data.planner.id,
    user_id: data.planner.owner?.id || "",
    name: data.planner.name,
    start_date: data.planner.start_date,
    end_date: data.planner.end_date,
    number_of_people: data.planner.number_of_people || 1,
    transportation: data.planner.transportation || "other",
    status: data.planner.status || "planned",
    share_token: data.planner.share_token || "",
    qr_code_url: data.planner.qr_code_url || "",
    owner: data.planner.owner,
    created_at: data.planner.created_at || data.downloaded_at,
    updated_at: data.planner.updated_at || data.downloaded_at,
    number_of_days: Math.max(data.planner.total_days || 1, highestDay),
    is_public: data.planner.is_public || false,
    ...collections,
  };
};

class OfflinePlannerService {
  private async getCachedImagesSize(
    cachedImages?: Record<string, string>,
    countedUris?: Set<string>,
  ): Promise<number> {
    if (!cachedImages) {
      return 0;
    }

    let totalSize = 0;

    for (const fileUri of Object.values(cachedImages)) {
      if (!fileUri || countedUris?.has(fileUri)) {
        continue;
      }

      try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists && typeof fileInfo.size === "number") {
          totalSize += fileInfo.size;
          countedUris?.add(fileUri);
        }
      } catch (error) {
        console.warn(`Failed to get cached image size for ${fileUri}:`, error);
      }
    }

    return totalSize;
  }

  /**
   * Save planner data for offline use
   */
  async savePlannerData(
    plannerId: string,
    data: OfflinePlannerStoredData,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PLANNER(plannerId),
        JSON.stringify(data),
      );

      const list = await this.getOfflinePlannerList();
      if (!list.includes(plannerId)) {
        list.push(plannerId);
        await AsyncStorage.setItem(
          STORAGE_KEYS.PLANNER_LIST,
          JSON.stringify(list),
        );
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC(plannerId),
        new Date().toISOString(),
      );
    } catch (error) {
      console.error("Failed to save planner data:", error);
      throw error;
    }
  }

  /**
   * Get planner data from offline storage
   */
  async getPlannerData(
    plannerId: string,
  ): Promise<OfflinePlannerStoredData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLANNER(plannerId));
      if (!data) {
        return null;
      }

      return JSON.parse(data) as OfflinePlannerStoredData;
    } catch (error) {
      console.error("Failed to get planner data:", error);
      return null;
    }
  }

  async getPlannerEntity(plannerId: string): Promise<PlanEntity | null> {
    const data = await this.getPlannerData(plannerId);
    return data ? mapOfflineDataToPlanEntity(data) : null;
  }

  async getOfflineMapPack(plannerId: string): Promise<OfflineMapPack | null> {
    const data = await this.getPlannerData(plannerId);
    return data?.offline_map || null;
  }

  async getOfflineMapTileTemplate(plannerId: string): Promise<string | null> {
    const pack = await this.getOfflineMapPack(plannerId);
    return pack?.tile_url_template || null;
  }

  async updatePlannerMetadata(
    plannerId: string,
    changes: Partial<OfflinePlannerData["planner"]>,
  ): Promise<PlanEntity | null> {
    const updated = await this.mutatePlannerData(plannerId, (draft) => {
      draft.planner = {
        ...draft.planner,
        ...changes,
      };
    });

    return updated ? mapOfflineDataToPlanEntity(updated) : null;
  }

  async addPlannerItem(
    plannerId: string,
    draftItem: OfflinePlannerItemDraft,
  ): Promise<PlanEntity | null> {
    const updated = await this.mutatePlannerData(plannerId, (draft) => {
      const orderInDay =
        draft.items
          .filter((item) => item.day_number === draftItem.day_number)
          .reduce((maxOrder, item) => Math.max(maxOrder, item.order_in_day || 0), 0) + 1;

      draft.items.push({
        id: draftItem.id || createOfflinePlannerItemId(),
        planner_id: plannerId,
        site_id: draftItem.site_id,
        day_number: draftItem.day_number,
        order_in_day: orderInDay,
        estimated_time: draftItem.estimated_time,
        duration_minutes: parseDurationToMinutes(draftItem.rest_duration),
        travel_time_minutes: draftItem.travel_time_minutes,
        notes: draftItem.note,
        note: draftItem.note,
        rest_duration: draftItem.rest_duration,
        event_id: draftItem.event_id || undefined,
        nearby_amenity_ids: draftItem.nearby_amenity_ids || [],
      });

      if (draftItem.site && !draft.sites.some((site) => site.id === draftItem.site_id)) {
        draft.sites.push({
          id: draftItem.site_id,
          name: draftItem.site.name || "Pilgrimage Site",
          address: draftItem.site.address,
          cover_image: draftItem.site.cover_image,
          latitude: draftItem.site.latitude,
          longitude: draftItem.site.longitude,
          region: draftItem.site.region,
          province: draftItem.site.province,
          site_type: draftItem.site.site_type,
        });
      }

      draft.planner.total_days = Math.max(
        draft.planner.total_days || 1,
        draftItem.day_number,
      );
      draft.downloaded_at = new Date().toISOString();
    });

    return updated ? mapOfflineDataToPlanEntity(updated) : null;
  }

  async updatePlannerItem(
    plannerId: string,
    itemId: string,
    changes: Partial<OfflinePlannerItemDraft>,
  ): Promise<PlanEntity | null> {
    const updated = await this.mutatePlannerData(plannerId, (draft) => {
      const item = draft.items.find((currentItem) => currentItem.id === itemId);
      if (!item) {
        return;
      }

      if (changes.estimated_time !== undefined) {
        item.estimated_time = changes.estimated_time;
      }

      if (changes.rest_duration !== undefined) {
        item.rest_duration = changes.rest_duration;
        item.duration_minutes = parseDurationToMinutes(changes.rest_duration);
      }

      if (changes.note !== undefined) {
        item.note = changes.note;
        item.notes = changes.note;
      }

      if (changes.event_id !== undefined) {
        item.event_id = changes.event_id || undefined;
      }

      if (changes.nearby_amenity_ids !== undefined) {
        item.nearby_amenity_ids = changes.nearby_amenity_ids;
      }

      if (changes.travel_time_minutes !== undefined) {
        item.travel_time_minutes = changes.travel_time_minutes;
      }

      if (changes.day_number && changes.day_number !== item.day_number) {
        const oldDay = item.day_number;
        item.day_number = changes.day_number;
        item.order_in_day =
          draft.items
            .filter(
              (currentItem) =>
                currentItem.id !== item.id &&
                currentItem.day_number === changes.day_number,
            )
            .reduce(
              (maxOrder, currentItem) =>
                Math.max(maxOrder, currentItem.order_in_day || 0),
              0,
            ) + 1;
        this.reindexDay(draft.items, oldDay);
        this.reindexDay(draft.items, changes.day_number);
      }

      draft.downloaded_at = new Date().toISOString();
    });

    return updated ? mapOfflineDataToPlanEntity(updated) : null;
  }

  async deletePlannerItem(
    plannerId: string,
    itemId: string,
  ): Promise<PlanEntity | null> {
    const updated = await this.mutatePlannerData(plannerId, (draft) => {
      const item = draft.items.find((currentItem) => currentItem.id === itemId);
      if (!item) {
        return;
      }

      draft.items = draft.items.filter((currentItem) => currentItem.id !== itemId);
      this.reindexDay(draft.items, item.day_number);
      draft.downloaded_at = new Date().toISOString();
    });

    return updated ? mapOfflineDataToPlanEntity(updated) : null;
  }

  /**
   * Check if planner is available offline
   */
  async isPlannerAvailableOffline(plannerId: string): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLANNER(plannerId));
      return data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get list of offline planners
   */
  async getOfflinePlannerList(): Promise<string[]> {
    try {
      const list = await AsyncStorage.getItem(STORAGE_KEYS.PLANNER_LIST);
      return list ? (JSON.parse(list) as string[]) : [];
    } catch (error) {
      console.error("Failed to get planner list:", error);
      return [];
    }
  }

  /**
   * Get all offline planners with summary information for management screens
   */
  async getAllOfflinePlanners(): Promise<OfflinePlannerSummary[]> {
    try {
      const list = await this.getOfflinePlannerList();

      const planners: (OfflinePlannerSummary | null)[] = await Promise.all(
        list.map(async (plannerId) => {
          const [rawData, lastSync] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.PLANNER(plannerId)),
            AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC(plannerId)),
          ]);

          if (!rawData) {
            return null;
          }

          const data = JSON.parse(rawData) as OfflinePlannerStoredData;
          const highestDay = data.items.reduce(
            (maxDay, item) => Math.max(maxDay, item.day_number || 0),
            0,
          );
          const siteCount = new Set(
            data.items
              .map((item) => item.site_id)
              .filter((siteId): siteId is string => Boolean(siteId)),
          ).size || data.sites.length;
          const cachedImagesSize = await this.getCachedImagesSize(
            data.cached_images,
          );

          const summary: OfflinePlannerSummary = {
            id: data.planner.id,
            name: data.planner.name,
            startDate: data.planner.start_date,
            endDate: data.planner.end_date,
            totalDays: Math.max(data.planner.total_days || 1, highestDay || 1),
            itemCount: data.items.length,
            siteCount,
            sizeBytes:
              getStringSizeInBytes(rawData) +
              cachedImagesSize +
              (data.offline_map?.size_bytes || 0),
            downloadedAt: lastSync || data.downloaded_at,
            coverImage: data.sites.find((site) => site.cover_image)?.cover_image,
          };

          return summary;
        }),
      );

      const validPlanners = planners.filter(
        (planner): planner is OfflinePlannerSummary => planner !== null,
      );

      return validPlanners
        .sort(
          (left, right) =>
            new Date(right.downloadedAt).getTime() -
            new Date(left.downloadedAt).getTime(),
        );
    } catch (error) {
      console.error("Failed to get offline planner summaries:", error);
      return [];
    }
  }

  /**
   * Get last sync time for planner
   */
  async getLastSyncTime(plannerId: string): Promise<Date | null> {
    try {
      const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC(plannerId));
      return time ? new Date(time) : null;
    } catch {
      return null;
    }
  }

  /**
   * Delete planner offline data
   */
  async deletePlannerData(plannerId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PLANNER(plannerId));
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC(plannerId));

      const list = await this.getOfflinePlannerList();
      const newList = list.filter((id) => id !== plannerId);
      if (newList.length === 0) {
        await AsyncStorage.removeItem(STORAGE_KEYS.PLANNER_LIST);
      } else {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PLANNER_LIST,
          JSON.stringify(newList),
        );
      }
    } catch (error) {
      console.error("Failed to delete planner data:", error);
      throw error;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    try {
      const list = await this.getOfflinePlannerList();

      await Promise.all([
        ...list.map((id) => AsyncStorage.removeItem(STORAGE_KEYS.PLANNER(id))),
        ...list.map((id) =>
          AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC(id)),
        ),
        AsyncStorage.removeItem(STORAGE_KEYS.PLANNER_LIST),
      ]);
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      throw error;
    }
  }

  /**
   * Get total offline storage size (approximate)
   */
  async getOfflineStorageSize(): Promise<number> {
    try {
      const list = await this.getOfflinePlannerList();
      if (list.length === 0) {
        return 0;
      }

      let totalSize = 0;
      const countedUris = new Set<string>();

      const plannerListData = await AsyncStorage.getItem(STORAGE_KEYS.PLANNER_LIST);
      if (plannerListData) {
        totalSize += getStringSizeInBytes(plannerListData);
      }

      for (const id of list) {
        const [data, lastSync] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PLANNER(id)),
          AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC(id)),
        ]);

        if (data) {
          totalSize += getStringSizeInBytes(data);

          try {
            const parsed = JSON.parse(data) as OfflinePlannerStoredData;
            totalSize += await this.getCachedImagesSize(
              parsed.cached_images,
              countedUris,
            );
            totalSize += parsed.offline_map?.size_bytes || 0;
          } catch (error) {
            console.warn(`Failed to parse offline planner ${id} for size:`, error);
          }
        }

        if (lastSync) {
          totalSize += getStringSizeInBytes(lastSync);
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Failed to calculate storage size:", error);
      return 0;
    }
  }

  /**
   * Get offline statistics
   */
  async getOfflineStats(): Promise<{
    totalPlanners: number;
    totalSize: number;
    oldestSync: Date | null;
    newestSync: Date | null;
  }> {
    try {
      const list = await this.getOfflinePlannerList();
      const totalSize = await this.getOfflineStorageSize();

      let oldestSync: Date | null = null;
      let newestSync: Date | null = null;

      for (const id of list) {
        const syncTime = await this.getLastSyncTime(id);
        if (!syncTime) {
          continue;
        }

        if (!oldestSync || syncTime < oldestSync) {
          oldestSync = syncTime;
        }

        if (!newestSync || syncTime > newestSync) {
          newestSync = syncTime;
        }
      }

      return {
        totalPlanners: list.length,
        totalSize,
        oldestSync,
        newestSync,
      };
    } catch (error) {
      console.error("Failed to get offline stats:", error);
      return {
        totalPlanners: 0,
        totalSize: 0,
        oldestSync: null,
        newestSync: null,
      };
    }
  }

  private async mutatePlannerData(
    plannerId: string,
    updater: (draft: OfflinePlannerStoredData) => void,
  ): Promise<OfflinePlannerStoredData | null> {
    const currentData = await this.getPlannerData(plannerId);
    if (!currentData) {
      return null;
    }

    const draft = cloneData(currentData);
    updater(draft);
    await this.savePlannerData(plannerId, draft);
    return draft;
  }

  private reindexDay(items: OfflinePlannerItem[], dayNumber: number) {
    const dayItems = items
      .filter((item) => item.day_number === dayNumber)
      .sort((left, right) => (left.order_in_day || 0) - (right.order_in_day || 0));

    dayItems.forEach((item, index) => {
      item.order_in_day = index + 1;
    });
  }
}

export const offlinePlannerService = new OfflinePlannerService();
export default offlinePlannerService;
