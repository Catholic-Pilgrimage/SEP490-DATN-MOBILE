/**
 * useSwapPreview Hook
 * Calculates the time impact of swapping two items in a day's itinerary.
 * Uses VietMap for accurate travel times and validates opening hours.
 *
 * Flow: startPreview() → [loading/VietMap] → result with before/after + warnings
 */

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import vietmapService from "../../../../services/map/vietmapService";
import type { PlanEntity } from "../../../../types/pilgrim/planner.types";
import { sortPlanDayItems } from "../utils/planDetailLocalPlan.utils";
import {
    formatDurationLocalized,
    getDateForLeg,
    parseOpeningHours,
    timeToMinutes,
} from "../utils/siteScheduleHelper";
import { parseDurationToMinutes } from "../utils/time";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SwapItemPreview {
  id: string;
  siteName: string;
  siteImage?: string;
  oldTime: string;
  newTime: string;
  restDurationMin: number;
  openTime?: string;
  closeTime?: string;
  warning?: string;
  isError?: boolean;
}

export interface SwapRouteSegment {
  fromName: string;
  toName: string;
  durationMin: number;
  distanceKm: number;
}

export interface SwapPreviewResult {
  beforeItems: SwapItemPreview[];
  afterItems: SwapItemPreview[];
  routes: SwapRouteSegment[];
  warnings: string[];
  isBlocked: boolean;
  /**
   * Ordered array of { id, time } — MUST be applied sequentially
   * from first to last when updating the backend.
   */
  orderedNewTimes: { id: string; time: string }[];
}

interface SwapPreviewState {
  visible: boolean;
  loading: boolean;
  dayKey: string;
  itemIdA: string;
  itemIdB: string;
  result: SwapPreviewResult | null;
  error: string | null;
}

const INITIAL_STATE: SwapPreviewState = {
  visible: false,
  loading: false,
  dayKey: "",
  itemIdA: "",
  itemIdB: "",
  result: null,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract rest duration in minutes from any backend format */
const safeRestMinutes = (restDuration: unknown): number => {
  const parsed = parseDurationToMinutes(restDuration);
  // Backend default is 2 hours if not specified
  return parsed > 0 ? parsed : 120;
};

/** Normalise time to HH:MM */
const normaliseTime = (t: unknown): string => {
  if (!t || typeof t !== "string") return "08:00";
  // Strip seconds: "05:15:00" → "05:15"
  return t.length >= 5 ? t.substring(0, 5) : t;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSwapPreview(plan: PlanEntity | null) {
  const { t } = useTranslation();
  const [state, setState] = useState<SwapPreviewState>({ ...INITIAL_STATE });
  const flowRef = useRef(0);

  const startPreview = useCallback(
    async (dayKey: string, itemIdA: string, itemIdB: string) => {
      if (!plan) return;
      const flowId = ++flowRef.current;

      setState({
        visible: true,
        loading: true,
        dayKey,
        itemIdA,
        itemIdB,
        result: null,
        error: null,
      });

      try {
        const raw = plan.items_by_day?.[dayKey] || [];
        const sorted = sortPlanDayItems(raw);
        const idxA = sorted.findIndex((i) => i.id === itemIdA);
        const idxB = sorted.findIndex((i) => i.id === itemIdB);
        if (idxA < 0 || idxB < 0)
          throw new Error(
            t("planner.swapItemNotFound", {
              defaultValue: "Không tìm thấy địa điểm",
            }),
          );

        const anchorTime = normaliseTime(
          sorted[0]?.estimated_time || sorted[0]?.arrival_time,
        );
        const legDate = getDateForLeg(plan.start_date, Number(dayKey));

        // Site detail cache
        const siteCache: Record<string, any> = {};
        const fetchSite = async (id: string) => {
          if (siteCache[id]) return siteCache[id];
          try {
            const res = await pilgrimSiteApi.getSiteDetail(id);
            siteCache[id] = res?.data;
            return res?.data;
          } catch {
            return null;
          }
        };

        // ── Build "before" list ──
        const beforeItems: SwapItemPreview[] = sorted.map((item) => ({
          id: item.id!,
          siteName: item.site?.name || "Địa điểm",
          siteImage: item.site?.cover_image || item.site?.image,
          oldTime: normaliseTime(item.estimated_time || item.arrival_time),
          newTime: normaliseTime(item.estimated_time || item.arrival_time),
          restDurationMin: safeRestMinutes(item.rest_duration),
        }));

        // ── Create swapped order ──
        const swapped = [...sorted];
        [swapped[idxA], swapped[idxB]] = [swapped[idxB], swapped[idxA]];

        if (flowId !== flowRef.current) return;

        // ── Recalculate times for new order ──
        const afterItems: SwapItemPreview[] = [];
        const routes: SwapRouteSegment[] = [];
        const warnings: string[] = [];
        const orderedNewTimes: { id: string; time: string }[] = [];
        let isBlocked = false;

        // Track computed times by position (not by id) so we chain correctly
        const computedTimes: string[] = [];

        for (let i = 0; i < swapped.length; i++) {
          const item = swapped[i];
          const siteId = item.site_id || item.site?.id;
          const site = siteId ? await fetchSite(siteId) : null;
          if (flowId !== flowRef.current) return;

          const schedule = site
            ? parseOpeningHours(site.opening_hours, legDate)
            : null;
          const openTime = schedule?.open;
          const closeTime = schedule?.close;

          let newTime: string;

          if (i === 0) {
            // First item keeps the anchor time
            newTime = anchorTime;
          } else {
            // ── Calculate from previous item's departure ──
            const prev = swapped[i - 1];
            const prevSiteId = prev.site_id || prev.site?.id;
            const prevSite = prevSiteId ? await fetchSite(prevSiteId) : null;
            if (flowId !== flowRef.current) return;

            // Use our computed time for previous, not its original time
            const prevTime = computedTimes[i - 1];
            const prevRestMin = safeRestMinutes(prev.rest_duration);

            // ── VietMap route ──
            let travelMin = 0;
            const prevLat = Number(
              prevSite?.latitude || prev.site?.latitude || 0,
            );
            const prevLng = Number(
              prevSite?.longitude || prev.site?.longitude || 0,
            );
            const curLat = Number(site?.latitude || item.site?.latitude || 0);
            const curLng = Number(site?.longitude || item.site?.longitude || 0);

            if (prevLat && prevLng && curLat && curLng) {
              try {
                const routeResult = await vietmapService.calculateRoute(
                  { latitude: prevLat, longitude: prevLng },
                  { latitude: curLat, longitude: curLng },
                  plan?.transportation,
                );
                travelMin = routeResult.durationMinutes;
                routes.push({
                  fromName: prevSite?.name || prev.site?.name || "",
                  toName: site?.name || item.site?.name || "",
                  durationMin: routeResult.durationMinutes,
                  distanceKm: routeResult.distanceKm,
                });
              } catch {
                travelMin = 30; // fallback
                routes.push({
                  fromName: prev.site?.name || "",
                  toName: item.site?.name || "",
                  durationMin: 30,
                  distanceKm: 0,
                });
              }
              if (flowId !== flowRef.current) return;
            } else {
              // No coordinates at all — use a safe fallback
              travelMin = 30;
              routes.push({
                fromName: prev.site?.name || "",
                toName: item.site?.name || "",
                durationMin: 30,
                distanceKm: 0,
              });
            }

            const totalOffset = prevRestMin + travelMin;
            console.log(
              `[SwapPreview] Item ${i}: prevTime=${prevTime}, prevRest=${prevRestMin}min, travel=${travelMin}min, total=${totalOffset}min`,
            );

            const arrivalResult = vietmapService.calculateArrivalTime(
              prevTime,
              totalOffset,
            );
            newTime = arrivalResult.time;

            if (arrivalResult.daysAdded > 0) {
              warnings.push(
                t("planner.swapCrossDayWarning", {
                  name: site?.name || item.site?.name,
                }),
              );
              isBlocked = true;
            }
          }

          computedTimes.push(newTime);

          // ── Validate opening hours ──
          let warning: string | undefined;
          let isError = false;

          if (closeTime && timeToMinutes(newTime) > timeToMinutes(closeTime)) {
            warning = t("planner.swapArriveAfterClosing", {
              time: newTime,
              close: closeTime,
            });
            warnings.push(`"${site?.name || item.site?.name}": ${warning}`);
            isBlocked = true;
            isError = true;
          } else if (
            openTime &&
            timeToMinutes(newTime) < timeToMinutes(openTime)
          ) {
            const waitMin = timeToMinutes(openTime) - timeToMinutes(newTime);
            warning = t("planner.swapArriveEarly", {
              wait: formatDurationLocalized(waitMin, t),
              open: openTime,
            });
          }

          orderedNewTimes.push({ id: item.id!, time: newTime });

          afterItems.push({
            id: item.id!,
            siteName: site?.name || item.site?.name || "Địa điểm",
            siteImage: item.site?.cover_image || item.site?.image,
            oldTime: normaliseTime(item.estimated_time || item.arrival_time),
            newTime,
            restDurationMin: safeRestMinutes(item.rest_duration),
            openTime,
            closeTime,
            warning,
            isError,
          });
        }

        if (flowId !== flowRef.current) return;

        setState((prev) => ({
          ...prev,
          loading: false,
          result: {
            beforeItems,
            afterItems,
            routes,
            warnings,
            isBlocked,
            orderedNewTimes,
          },
        }));
      } catch (error: any) {
        if (flowId !== flowRef.current) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error.message ||
            t("planner.loadSiteError", {
              defaultValue: "Lỗi tính toán lộ trình",
            }),
        }));
      }
    },
    [plan, t],
  );

  const close = useCallback(() => {
    flowRef.current++;
    setState({ ...INITIAL_STATE });
  }, []);

  return { ...state, startPreview, close };
}
