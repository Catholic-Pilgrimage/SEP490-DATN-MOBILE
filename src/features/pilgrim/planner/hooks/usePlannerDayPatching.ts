import { useCallback } from "react";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import vietmapService from "../../../../services/map/vietmapService";
import type {
    PlanEntity,
    PlanItem,
} from "../../../../types/pilgrim/planner.types";
import { sortPlanDayItems } from "../utils/planDetailLocalPlan.utils";
import { parseDurationToMinutes } from "../utils/time";

export type PlannerItemPatch = {
  id: string;
  day_number: number;
  order_index: number;
  estimated_time: string;
  travel_time_minutes: number;
};

const toHHmm = (value?: string): string => {
  if (!value) return "08:00";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : "08:00";
};

const hhmmToMinutes = (value?: string): number => {
  const normalized = toHHmm(value);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const pickLaterTime = (left?: string, right?: string): string => {
  const l = toHHmm(left);
  const r = toHHmm(right);
  return hhmmToMinutes(r) > hhmmToMinutes(l) ? r : l;
};

export function usePlannerDayPatching(transportation?: string) {
  const applyLocalItemPatches = useCallback(
    (currentPlan: PlanEntity, patches: PlannerItemPatch[]): PlanEntity => {
      const patchById = patches.reduce<Record<string, PlannerItemPatch>>(
        (acc, patch) => {
          acc[patch.id] = patch;
          return acc;
        },
        {},
      );

      const originalItems = Object.values(
        currentPlan.items_by_day || {},
      ).flat();
      const patchedItems = originalItems.map((item) => {
        if (!item.id || !patchById[item.id]) return item;
        const patch = patchById[item.id];
        return {
          ...item,
          day_number: patch.day_number,
          leg_number: patch.day_number,
          order_index: patch.order_index,
          estimated_time: patch.estimated_time,
          travel_time_minutes: patch.travel_time_minutes,
        };
      });

      const regrouped: Record<string, PlanItem[]> = {};
      patchedItems.forEach((item) => {
        const resolvedDay =
          Number(item.day_number ?? item.leg_number ?? 1) > 0
            ? Number(item.day_number ?? item.leg_number ?? 1)
            : 1;
        const dayKey = String(resolvedDay);
        if (!regrouped[dayKey]) regrouped[dayKey] = [];
        regrouped[dayKey].push({
          ...item,
          day_number: resolvedDay,
          leg_number: resolvedDay,
        });
      });

      Object.keys(regrouped).forEach((dayKey) => {
        regrouped[dayKey] = sortPlanDayItems(regrouped[dayKey]).map(
          (item, index) => ({
            ...item,
            day_number: Number(dayKey),
            leg_number: Number(dayKey),
            order_index: index + 1,
          }),
        );
      });

      const sortedDayKeys = Object.keys(regrouped).sort(
        (a, b) => Number(a) - Number(b),
      );
      const flattened = sortedDayKeys.flatMap((dayKey) => regrouped[dayKey]);

      return {
        ...currentPlan,
        items_by_day: regrouped,
        items: flattened,
        number_of_days: Math.max(
          Number(currentPlan.number_of_days || 1),
          sortedDayKeys.length > 0
            ? Math.max(...sortedDayKeys.map((key) => Number(key)))
            : 1,
        ),
      };
    },
    [],
  );

  const buildDayPatches = useCallback(
    async (
      orderedItems: PlanItem[],
      dayNumber: number,
      anchorTime: string,
      siteCache: Record<
        string,
        { latitude: number; longitude: number; name?: string }
      >,
      earliestStartTime?: string,
    ): Promise<PlannerItemPatch[]> => {
      const resolveSiteData = async (item: PlanItem) => {
        const siteId = item.site_id || item.site?.id || "";
        if (siteId && siteCache[siteId]) return siteCache[siteId];

        const lat = Number(item.site?.latitude || 0);
        const lng = Number(item.site?.longitude || 0);
        if (siteId && lat && lng) {
          siteCache[siteId] = {
            latitude: lat,
            longitude: lng,
            name: item.site?.name,
          };
          return siteCache[siteId];
        }

        if (siteId) {
          try {
            const response = await pilgrimSiteApi.getSiteDetail(siteId);
            const site = response?.data as any;
            siteCache[siteId] = {
              latitude: Number(site?.latitude || lat || 0),
              longitude: Number(site?.longitude || lng || 0),
              name: site?.name || item.site?.name,
            };
            return siteCache[siteId];
          } catch {
            // noop
          }
        }

        return {
          latitude: lat,
          longitude: lng,
          name: item.site?.name,
        };
      };

      const patches: PlannerItemPatch[] = [];

      for (let index = 0; index < orderedItems.length; index++) {
        const item = orderedItems[index];
        if (!item.id) continue;

        let travelTimeMinutes =
          index === 0 ? 0 : Math.max(0, Number(item.travel_time_minutes) || 0);

        if (index > 0) {
          const prevItem = orderedItems[index - 1];
          const [from, to] = await Promise.all([
            resolveSiteData(prevItem),
            resolveSiteData(item),
          ]);

          if (from.latitude && from.longitude && to.latitude && to.longitude) {
            try {
              const routeResult = await vietmapService.calculateRoute(
                { latitude: from.latitude, longitude: from.longitude },
                { latitude: to.latitude, longitude: to.longitude },
                transportation,
              );
              travelTimeMinutes = Math.max(
                0,
                Math.round(routeResult.durationMinutes || 0),
              );
            } catch {
              travelTimeMinutes = 30;
            }
          } else {
            travelTimeMinutes = 30;
          }
        }

        const time =
          index === 0
            ? pickLaterTime(anchorTime, earliestStartTime)
            : (() => {
                const prev = patches[index - 1];
                const prevItem = orderedItems[index - 1];
                const prevRest = parseDurationToMinutes(prevItem.rest_duration);
                const safePrevRest = prevRest > 0 ? prevRest : 120;
                return vietmapService.calculateArrivalTime(
                  prev.estimated_time,
                  safePrevRest + travelTimeMinutes,
                ).time;
              })();

        patches.push({
          id: item.id,
          day_number: dayNumber,
          order_index: index + 1,
          estimated_time: toHHmm(time),
          travel_time_minutes: travelTimeMinutes,
        });
      }

      return patches;
    },
    [transportation],
  );

  return {
    applyLocalItemPatches,
    buildDayPatches,
  };
}
