import { createOfflinePlannerItemId } from "../../../../services/offline/offlinePlannerService";
import {
    NearbyPlaceCategory,
    SiteNearbyPlace,
} from "../../../../types/pilgrim";
import { PlanEntity, PlanItem } from "../../../../types/pilgrim/planner.types";

export interface LocalSiteSnapshot {
  id: string;
  name: string;
  address?: string;
  coverImage?: string;
  latitude?: number;
  longitude?: number;
}

export const mapOfflineNearbyPlace = (place: {
  id: string;
  name: string;
  place_type: string;
  address: string;
  latitude?: string | number;
  longitude?: string | number;
  phone?: string;
  description?: string;
}): SiteNearbyPlace => ({
  id: place.id,
  code: place.id,
  name: place.name,
  category: place.place_type as NearbyPlaceCategory,
  address: place.address,
  latitude: Number(place.latitude || 0),
  longitude: Number(place.longitude || 0),
  distance_meters: 0,
  phone: place.phone,
  description: place.description,
});

/** Same ordering as timeline UI and `buildPlanFromItemsByDay`. */
export const sortPlanDayItems = (items: PlanItem[]): PlanItem[] =>
  [...items].sort((left, right) => {
    const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return (left.estimated_time || "").localeCompare(
      right.estimated_time || "",
    );
  });

const cloneItemsByDay = (itemsByDay?: Record<string, PlanItem[]>) => {
  const cloned: Record<string, PlanItem[]> = {};

  Object.entries(itemsByDay || {}).forEach(([dayKey, items]) => {
    cloned[dayKey] = items.map((item) => ({
      ...item,
      site: { ...item.site },
      nearby_amenity_ids: item.nearby_amenity_ids
        ? [...item.nearby_amenity_ids]
        : undefined,
    }));
  });

  return cloned;
};

const buildPlanFromItemsByDay = (
  currentPlan: PlanEntity,
  itemsByDay: Record<string, PlanItem[]>,
) => {
  const normalized: Record<string, PlanItem[]> = {};
  const dayKeys = Object.keys(itemsByDay).sort(
    (left, right) => Number(left) - Number(right),
  );

  dayKeys.forEach((dayKey) => {
    const sortedItems = sortPlanDayItems(itemsByDay[dayKey] || []).map(
      (item, index) => ({
        ...item,
        day_number: Number(dayKey),
        order_index: index + 1,
      }));

    normalized[dayKey] = sortedItems;
  });

  const flatItems = dayKeys.flatMap((dayKey) => normalized[dayKey]);
  const highestDay =
    dayKeys.reduce((maxDay, dayKey) => Math.max(maxDay, Number(dayKey)), 1) ||
    1;

  return {
    ...currentPlan,
    items: flatItems,
    items_by_day: normalized,
    number_of_days: Math.max(currentPlan.number_of_days || 1, highestDay),
  };
};

const createLocalPlanItem = (
  planId: string,
  dayNumber: number,
  dayItems: PlanItem[],
  draft: {
    site_id: string;
    event_id?: string;
    note?: string;
    estimated_time?: string;
    rest_duration?: string;
    nearby_amenity_ids?: string[];
  },
  itemId?: string,
  siteSnapshot?: LocalSiteSnapshot,
): PlanItem => ({
  id: itemId || createOfflinePlannerItemId(),
  planner_id: planId,
  site_id: draft.site_id,
  event_id: draft.event_id,
  day_number: dayNumber,
  order_index: dayItems.length + 1,
  note: draft.note,
  estimated_time: draft.estimated_time,
  rest_duration: draft.rest_duration,
  nearby_amenity_ids: draft.nearby_amenity_ids,
  site: {
    id: siteSnapshot?.id || draft.site_id,
    name: siteSnapshot?.name || "Pilgrimage Site",
    address: siteSnapshot?.address,
    image: siteSnapshot?.coverImage,
    cover_image: siteSnapshot?.coverImage,
    latitude: siteSnapshot?.latitude,
    longitude: siteSnapshot?.longitude,
  },
});

export const applyLocalAddItem = (
  currentPlan: PlanEntity,
  planId: string,
  draft: {
    site_id: string;
    day_number: number;
    event_id?: string;
    note?: string;
    estimated_time?: string;
    rest_duration?: string;
    nearby_amenity_ids?: string[];
  },
  itemId?: string,
  siteSnapshot?: LocalSiteSnapshot,
) => {
  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);
  const dayKey = String(draft.day_number);
  const dayItems = [...(itemsByDay[dayKey] || [])];

  dayItems.push(
    createLocalPlanItem(
      planId,
      draft.day_number,
      dayItems,
      draft,
      itemId,
      siteSnapshot,
    ),
  );
  itemsByDay[dayKey] = dayItems;

  return buildPlanFromItemsByDay(
    {
      ...currentPlan,
      number_of_days: Math.max(
        currentPlan.number_of_days || 1,
        draft.day_number,
      ),
    },
    itemsByDay,
  );
};

export const applyLocalItemUpdate = (
  currentPlan: PlanEntity,
  itemId: string,
  changes: Partial<{
    estimated_time: string;
    rest_duration: string;
    note: string;
    event_id?: string;
    nearby_amenity_ids: string[];
  }>,
) => {
  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);

  Object.entries(itemsByDay).forEach(([dayKey, dayItems]) => {
    itemsByDay[dayKey] = dayItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        estimated_time:
          changes.estimated_time !== undefined
            ? changes.estimated_time
            : item.estimated_time,
        rest_duration:
          changes.rest_duration !== undefined
            ? changes.rest_duration
            : item.rest_duration,
        note: changes.note !== undefined ? changes.note : item.note,
        event_id:
          changes.event_id !== undefined ? changes.event_id : item.event_id,
        nearby_amenity_ids:
          changes.nearby_amenity_ids !== undefined
            ? changes.nearby_amenity_ids
            : item.nearby_amenity_ids,
      };
    });
  });

  return buildPlanFromItemsByDay(currentPlan, itemsByDay);
};

/**
 * Bỏ item khỏi ngày cũ, thêm vào `targetDay` ở đầu (first) hoặc cuối (last), renumber.
 */
export const applyLocalMoveItemToDay = (
  currentPlan: PlanEntity,
  itemId: string,
  targetDay: number,
  position: "first" | "last" = "first",
): PlanEntity => {
  if (!itemId || targetDay < 1) return currentPlan;
  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);
  let moved: PlanItem | null = null;

  Object.keys(itemsByDay).forEach((dayKey) => {
    const dayItems = itemsByDay[dayKey] || [];
    const idx = dayItems.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    moved = { ...dayItems[idx] };
    const next = dayItems.filter((i) => i.id !== itemId);
    if (next.length === 0) {
      delete itemsByDay[dayKey];
    } else {
      itemsByDay[dayKey] = next;
    }
  });

  if (!moved) return currentPlan;

  const key = String(targetDay);
  const existing = sortPlanDayItems(itemsByDay[key] || []);
  const withNew =
    position === "first" ? [moved, ...existing] : [...existing, moved];
  withNew.forEach((item, idx) => {
    item.order_index = idx + 1;
    item.day_number = targetDay;
    item.leg_number = targetDay;
  });
  itemsByDay[key] = withNew;

  return buildPlanFromItemsByDay(currentPlan, itemsByDay);
};

/**
 * Cập nhật giờ / travel (sau khi chuyển ngày hoặc sync).
 */
export const applyLocalItemTimeAndTravel = (
  currentPlan: PlanEntity,
  itemId: string,
  changes: { estimated_time: string; travel_time_minutes?: number },
): PlanEntity => {
  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);
  let found = false;
  Object.keys(itemsByDay).forEach((dayKey) => {
    itemsByDay[dayKey] = (itemsByDay[dayKey] || []).map((item) => {
      if (item.id !== itemId) return item;
      found = true;
      return {
        ...item,
        estimated_time: changes.estimated_time,
        travel_time_minutes:
          changes.travel_time_minutes !== undefined
            ? changes.travel_time_minutes
            : item.travel_time_minutes,
      };
    });
  });
  if (!found) return currentPlan;
  return buildPlanFromItemsByDay(currentPlan, itemsByDay);
};

export const applyLocalSwapDayItems = (
  currentPlan: PlanEntity,
  dayKey: string,
  indexA: number,
  indexB: number,
): PlanEntity => {
  if (indexA === indexB) {
    return currentPlan;
  }

  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);
  const dayItems = sortPlanDayItems(itemsByDay[dayKey] || []);

  if (
    indexA < 0 ||
    indexB < 0 ||
    indexA >= dayItems.length ||
    indexB >= dayItems.length
  ) {
    return currentPlan;
  }

  const next = [...dayItems];
  [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
  next.forEach((item, idx) => {
    item.order_index = idx + 1;
  });
  itemsByDay[dayKey] = next;

  return buildPlanFromItemsByDay(currentPlan, itemsByDay);
};

export const applyLocalDeleteItem = (
  currentPlan: PlanEntity,
  itemId: string,
) => {
  const itemsByDay = cloneItemsByDay(currentPlan.items_by_day);

  Object.entries(itemsByDay).forEach(([dayKey, dayItems]) => {
    const nextItems = dayItems.filter((item) => item.id !== itemId);
    if (nextItems.length === 0) {
      delete itemsByDay[dayKey];
      return;
    }
    itemsByDay[dayKey] = nextItems;
  });

  return buildPlanFromItemsByDay(currentPlan, itemsByDay);
};

export const applyLocalClearAllItems = (currentPlan: PlanEntity): PlanEntity => {
  return {
    ...currentPlan,
    items: [],
    items_by_day: {},
  };
};

