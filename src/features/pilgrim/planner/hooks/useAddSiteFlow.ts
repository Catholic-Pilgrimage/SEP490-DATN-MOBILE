/**
 * useAddSiteFlow Hook
 * Manages the complete flow of adding a site to a planner itinerary.
 *
 * Responsibilities:
 * - Fetch site detail (opening_hours) & mass schedules
 * - Calculate route via VietMap (including cross-day: Day N-1 last → Day N first)
 * - Determine smart arrival time suggestion
 * - Manage all "add site" modal state
 * - Provide real-time insight that recalculates on every time/duration change
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import vietmapService from "../../../../services/map/vietmapService";
import type { SiteEvent } from "../../../../types/pilgrim";
import type {
    PlanEntity,
    PlanItem,
} from "../../../../types/pilgrim/planner.types";
import {
    type DayEvent,
    type DaySchedule,
    type ScheduleInsight,
    type SuggestedArrival,
    formatDurationLocalized,
    generateInsight,
    getDateForLeg,
    getEventsForDate,
    getMassTimesForDate,
    parseOpeningHours,
    suggestArrivalTime,
} from "../utils/siteScheduleHelper";
import { formatTimeValue, parseDurationToMinutes } from "../utils/time";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteTravelData {
  previousSiteName?: string;
  previousSiteId?: string;
  previousItemId?: string;
  sourceDayNumber?: number;
  departureTimeFromPrev?: string;
  travelMinutes?: number;
  travelDistanceKm?: number;
  fastestArrival?: string;
  /** Extra days after selected day to reach this site at fastest pace */
  fastestArrivalDayOffset?: number;
  newSiteName?: string;
  newSiteAddress?: string;
  newSitePatronSaint?: string;
  newSiteCoverImage?: string;
  openTime?: string;
  closeTime?: string;
  massTimesForDay: string[];
  eventsForDay: DayEvent[];
  eventStartTime?: string;
  eventName?: string;
  /** true when travel data comes from previous day's last item (cross-day) */
  isCrossDayTravel?: boolean;
}

export interface AddSiteFlowState {
  selectedSiteId: string;
  selectedEventId: string | null;
  estimatedTime: string;
  restDuration: number;
  note: string;
  calculatingRoute: boolean;
  travelTimeMinutes: number | undefined;
  crossDayWarning: string | null;
  crossDaysAdded: number;
  showTimeInputModal: boolean;
  travelData: SiteTravelData | null;
  insight: ScheduleInsight | null;
  suggestedTime: SuggestedArrival | null;
}

export interface AddSiteFlowActions {
  startFlow: (
    siteId: string,
    eventId?: string,
    dayOverride?: number,
  ) => Promise<void>;
  setEstimatedTime: (time: string) => void;
  setRestDuration: (duration: number) => void;
  setNote: (note: string) => void;
  closeTimeModal: () => void;
  resetFlow: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: AddSiteFlowState = {
  selectedSiteId: "",
  selectedEventId: null,
  estimatedTime: "08:00",
  restDuration: 120,
  note: "",
  calculatingRoute: false,
  travelTimeMinutes: undefined,
  crossDayWarning: null,
  crossDaysAdded: 0,
  showTimeInputModal: false,
  travelData: null,
  insight: null,
  suggestedTime: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAddSiteFlow(params: {
  plan: PlanEntity | null;
  selectedDay: number;
  siteEvents: SiteEvent[];
}) {
  const { plan, selectedDay, siteEvents } = params;
  const { t } = useTranslation();

  const [state, setState] = useState<AddSiteFlowState>({ ...INITIAL_STATE });
  const flowIdRef = useRef(0); // Guard against stale async completions

  const sortDayItems = useCallback((items: PlanItem[]): PlanItem[] => {
    const toMinutes = (timeValue: string | undefined): number => {
      if (!timeValue) return Number.MAX_SAFE_INTEGER;
      const safe = formatTimeValue(timeValue);
      const parts = safe.split(":");
      if (parts.length < 2) return Number.MAX_SAFE_INTEGER;
      const hh = Number(parts[0]);
      const mm = Number(parts[1]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
        return Number.MAX_SAFE_INTEGER;
      }
      return hh * 60 + mm;
    };

    return [...items].sort((left, right) => {
      const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftTime = toMinutes(left.estimated_time || left.arrival_time);
      const rightTime = toMinutes(right.estimated_time || right.arrival_time);
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return String(left.id || "").localeCompare(String(right.id || ""));
    });
  }, []);

  // ── Derived: Recalculate insight whenever estimatedTime OR restDuration changes ──
  const insight = useMemo<ScheduleInsight | null>(() => {
    if (!state.travelData) return null;
    return generateInsight({
      estimatedTime: state.estimatedTime,
      hasTravelInfo: !!(
        state.travelData.travelMinutes && state.travelData.travelMinutes > 0
      ),
      fastestArrival: state.travelData.fastestArrival,
      travelMinutes: state.travelData.travelMinutes,
      eventStartTime: state.travelData.eventStartTime,
      eventName: state.travelData.eventName,
      openTime: state.travelData.openTime,
      closeTime: state.travelData.closeTime,
      massTimesForDay: state.travelData.massTimesForDay,
      restDuration: state.restDuration,
      t,
    });
  }, [state.estimatedTime, state.restDuration, state.travelData, t]);

  // ── Find the "previous item" to calculate travel from ──
  // For Day N first item: look up day N-1's last item (cross-day travel)
  const findPreviousItem = useCallback(
    (
      targetDay: number,
    ): { item: PlanItem; isCrossDay: boolean; dayNumber: number } | null => {
      if (!plan?.items_by_day) return null;

      // Same-day: last item in current day
      const itemsForDay = sortDayItems(
        plan.items_by_day[targetDay.toString()] || [],
      );
      if (itemsForDay.length > 0) {
        return {
          item: itemsForDay[itemsForDay.length - 1],
          isCrossDay: false,
          dayNumber: targetDay,
        };
      }

      // Cross-day: look backwards for the nearest day that has items
      if (targetDay > 1) {
        for (let d = targetDay - 1; d >= 1; d--) {
          const prevDayItems = sortDayItems(
            plan.items_by_day[d.toString()] || [],
          );
          if (prevDayItems.length > 0) {
            return {
              item: prevDayItems[prevDayItems.length - 1],
              isCrossDay: true,
              dayNumber: d,
            };
          }
        }
      }

      return null;
    },
    [plan, sortDayItems],
  );

  // ── Start the add-site flow ──
  const startFlow = useCallback(
    async (siteId: string, eventId?: string, dayOverride?: number) => {
      const flowId = ++flowIdRef.current;
      const targetDay = dayOverride ?? selectedDay;

      setState((prev) => ({
        ...prev,
        selectedSiteId: siteId,
        selectedEventId: eventId || null,
        calculatingRoute: true,
        crossDayWarning: null,
        crossDaysAdded: 0,
        travelTimeMinutes: undefined,
        travelData: null,
        insight: null,
        suggestedTime: null,
        note: "",
      }));

      try {
        // 1. Fetch site detail for opening_hours
        const siteDetailRes = await pilgrimSiteApi.getSiteDetail(siteId);
        const newSite = siteDetailRes?.data;

        if (flowId !== flowIdRef.current) return; // stale

        // 2. Parse opening hours for the specific day
        const legDate = getDateForLeg(plan?.start_date, targetDay);
        const schedule: DaySchedule | null = parseOpeningHours(
          (newSite as any)?.opening_hours,
          legDate,
        );
        const openTime = schedule?.open;
        const closeTime = schedule?.close;

        // 3. Fetch mass schedules for this site
        let massTimesForDay: string[] = [];
        try {
          const massRes = await pilgrimSiteApi.getSiteMassSchedules(siteId);
          if (flowId !== flowIdRef.current) return;
          const schedules =
            (massRes as any)?.data?.data || (massRes as any)?.data || [];
          massTimesForDay = getMassTimesForDate(schedules, legDate);
        } catch {
          // Mass schedule fetch failure is non-critical
        }

        // 4. Fetch site events for this site on legDate
        let eventsForDay: DayEvent[] = [];
        try {
          const eventParams: any = { limit: 50 };
          if (legDate) {
            const dateStr = `${legDate.getFullYear()}-${String(legDate.getMonth() + 1).padStart(2, "0")}-${String(legDate.getDate()).padStart(2, "0")}`;
            eventParams.start_date = dateStr;
            eventParams.end_date = dateStr;
          }
          const evRes = await pilgrimSiteApi.getSiteEvents(siteId, eventParams);
          if (flowId !== flowIdRef.current) return;
          const evList =
            (evRes as any)?.data?.data || (evRes as any)?.data || [];
          eventsForDay = getEventsForDate(evList, legDate);
        } catch {
          // Event fetch failure is non-critical
        }

        // 5. Get event info only when user explicitly selected an event
        let resolvedEventId: string | null = eventId || null;
        let evtName: string | undefined;
        let evtStart: string | undefined;
        if (eventId) {
          const ev = siteEvents.find((e) => String(e.id) === String(eventId));
          if (ev) {
            evtName = ev.name;
            evtStart = ev.start_time || undefined;
          }
        }

        // 6. Calculate route from previous item (same-day or cross-day)
        let travelData: SiteTravelData = {
          newSiteName: (newSite as any)?.name || t("planner.typeLocation"),
          newSiteAddress:
            (newSite as any)?.address ||
            (newSite as any)?.full_address ||
            undefined,
          newSitePatronSaint:
            (newSite as any)?.patron_saint ||
            (newSite as any)?.patronSaint ||
            undefined,
          newSiteCoverImage:
            (newSite as any)?.cover_image ||
            (newSite as any)?.coverImage ||
            (newSite as any)?.image ||
            undefined,
          openTime,
          closeTime,
          massTimesForDay,
          eventsForDay,
          eventStartTime: evtStart,
          eventName: evtName,
        };

        let estimatedTime = "08:00";
        let travelTimeMinutes: number | undefined;
        let crossDayWarning: string | null = null;
        let crossDaysAdded = 0;

        const previousResult = findPreviousItem(targetDay);

        if (previousResult) {
          const {
            item: lastItem,
            isCrossDay,
            dayNumber: lastDayNumber,
          } = previousResult;
          const lastSiteId = lastItem.site_id || lastItem.site?.id;

          if (lastSiteId) {
            const lastSiteRes = await pilgrimSiteApi.getSiteDetail(lastSiteId);
            const lastSite = lastSiteRes?.data;

            if (flowId !== flowIdRef.current) return;

            if (
              lastSite?.latitude &&
              lastSite?.longitude &&
              (newSite as any)?.latitude &&
              (newSite as any)?.longitude
            ) {
              const routeResult = await vietmapService.calculateRoute(
                { latitude: lastSite.latitude, longitude: lastSite.longitude },
                {
                  latitude: (newSite as any).latitude,
                  longitude: (newSite as any).longitude,
                },
                plan?.transportation,
              );

              if (flowId !== flowIdRef.current) return;

              const lastSiteTime =
                formatTimeValue(
                  lastItem.estimated_time || lastItem.arrival_time,
                ) || "10:00";
              const previousRestMinutes = parseDurationToMinutes(
                lastItem.rest_duration,
              );

              const departureResult = vietmapService.calculateArrivalTime(
                lastSiteTime,
                previousRestMinutes,
              );

              const arrivalResult = vietmapService.calculateArrivalTime(
                lastSiteTime,
                previousRestMinutes + routeResult.durationMinutes,
              );

              travelTimeMinutes = routeResult.durationMinutes;

              const prevSiteName =
                (lastSite as any)?.name || lastItem.site?.name;
              const dayDifference = targetDay - lastDayNumber;
              let effectiveFastestArrival = arrivalResult.time;
              let effectiveFastestArrivalDayOffset = 0;

              if (isCrossDay) {
                if (arrivalResult.daysAdded < dayDifference) {
                  // Arrive before target day starts -> can start at midnight of selected day.
                  effectiveFastestArrival = "00:00";
                  effectiveFastestArrivalDayOffset = 0;
                } else if (arrivalResult.daysAdded === dayDifference) {
                  effectiveFastestArrivalDayOffset = 0;
                } else if (arrivalResult.daysAdded > dayDifference) {
                  // Travel spills over selected day -> keep computed time and surface warning.
                  crossDaysAdded = arrivalResult.daysAdded - dayDifference;
                  effectiveFastestArrivalDayOffset = crossDaysAdded;
                  crossDayWarning = t("planner.crossDayWarning", {
                    defaultValue:
                      "Thời gian di chuyển vượt quá ngày đã chọn. Cân nhắc chuyển địa điểm sang ngày sau.",
                  });
                }
              } else if (arrivalResult.daysAdded > 0) {
                crossDaysAdded = arrivalResult.daysAdded;
                effectiveFastestArrivalDayOffset = arrivalResult.daysAdded;
                crossDayWarning = t("planner.crossDayWarning", {
                  defaultValue:
                    "Thời gian di chuyển vượt qua ngày hiện tại. Vui lòng chọn ngày khác cho địa điểm này.",
                });
              }

              travelData = {
                ...travelData,
                previousSiteName: prevSiteName,
                previousSiteId: lastSiteId,
                previousItemId: lastItem.id,
                sourceDayNumber: lastDayNumber,
                departureTimeFromPrev: departureResult.time,
                travelMinutes: routeResult.durationMinutes,
                travelDistanceKm: routeResult.distanceKm,
                fastestArrival: effectiveFastestArrival,
                fastestArrivalDayOffset: effectiveFastestArrivalDayOffset,
                isCrossDayTravel: isCrossDay,
              };

              const distanceDisplay =
                routeResult.distance < 1000
                  ? `${Math.round(routeResult.distance)} m`
                  : `${routeResult.distanceKm.toFixed(1)} km`;

              const durLocalized = formatDurationLocalized(
                routeResult.durationMinutes,
                t,
              );

            }
          }
        }

        // 6. Smart suggest time
        const suggested = suggestArrivalTime({
          eventStartTime: evtStart,
          eventName: evtName,
          massTimesForDay,
          openTime,
          closeTime,
          fastestArrival: travelData.fastestArrival,
          t,
        });

        // Default to the earliest feasible arrival from route constraints.
        estimatedTime = travelData.fastestArrival || suggested.time;

        if (flowId !== flowIdRef.current) return;

        setState((prev) => ({
          ...prev,
          selectedEventId: resolvedEventId,
          estimatedTime,
          travelTimeMinutes,
          crossDayWarning,
          crossDaysAdded,
          travelData,
          suggestedTime: suggested,
          calculatingRoute: false,
          showTimeInputModal: true,
        }));
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: t("planner.loadSiteError", {
            defaultValue: "Không thể tải thông tin địa điểm",
          }),
          text2:
            error?.message ||
            t("common.tryAgain", { defaultValue: "Vui lòng thử lại" }),
        });
        if (flowId !== flowIdRef.current) return;
        setState((prev) => ({
          ...prev,
          estimatedTime: "08:00",
          calculatingRoute: false,
          showTimeInputModal: true,
          travelData: {
            newSiteName: t("planner.typeLocation"),
            massTimesForDay: [],
            eventsForDay: [],
          },
        }));
      }
    },
    [plan, selectedDay, siteEvents, findPreviousItem, t],
  );

  // ── Setters ──
  const setEstimatedTime = useCallback(
    (time: string) => setState((prev) => ({ ...prev, estimatedTime: time })),
    [],
  );

  const setRestDuration = useCallback(
    (duration: number) =>
      setState((prev) => ({ ...prev, restDuration: duration })),
    [],
  );

  const setNote = useCallback(
    (note: string) => setState((prev) => ({ ...prev, note })),
    [],
  );

  const closeTimeModal = useCallback(
    () => setState((prev) => ({ ...prev, showTimeInputModal: false })),
    [],
  );

  const resetFlow = useCallback(() => setState({ ...INITIAL_STATE }), []);

  return {
    // State (with live-computed insight)
    ...state,
    insight,

    // Actions
    startFlow,
    setEstimatedTime,
    setRestDuration,
    setNote,
    closeTimeModal,
    resetFlow,
  };
}
