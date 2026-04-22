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
    suggestRestDurationForPlannedStop,
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
  /** Giờ kết thúc sự kiện (HH:MM) khi API có cung cấp */
  eventEndTime?: string;
  eventName?: string;
  /** true when travel data comes from previous day's last item (cross-day) */
  isCrossDayTravel?: boolean;
}

export interface AddSiteFlowState {
  selectedSiteId: string;
  selectedEventId: string | null;
  /** true when item is bound to a specific event → estimated_time is locked */
  isEventLocked: boolean;
  /** Buffer minutes before event start (default 30, user can pick 15/30/45/60) */
  bufferMinutes: number;
  /** Duration of the selected event in minutes (used as rest_duration floor) */
  eventDurationMinutes: number | null;
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

/** Tham số tùy chọn khi mở luồng thêm địa điểm (vd. tab "Sự kiện" cần gắn sự kiện trong ngày ngay). */
export type StartFlowOptions = {
  /** Khi bật: không có `eventId` thì tự gắn sự kiện đầu tiên có giờ trong ngày. Tắt/bỏ: mặc định site thường; gắn sự kiện qua CTA "Áp dụng" trong màn thời gian. */
  autoBindFirstDayEvent?: boolean;
};

export interface AddSiteFlowActions {
  startFlow: (
    siteId: string,
    eventId?: string,
    dayOverride?: number,
    options?: StartFlowOptions,
  ) => Promise<void>;
  setEstimatedTime: (time: string) => void;
  applySuggestedTime: (
    time: string,
    source?: {
      priority: "event" | "mass" | "opening" | "default";
      eventId?: string;
    },
  ) => void;
  setRestDuration: (duration: number) => void;
  setBufferMinutes: (minutes: number) => void;
  /** Remove event binding and switch to normal site mode */
  unlockEvent: () => void;
  setNote: (note: string) => void;
  closeTimeModal: () => void;
  resetFlow: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const DEFAULT_BUFFER_MINUTES = 30;

const INITIAL_STATE: AddSiteFlowState = {
  selectedSiteId: "",
  selectedEventId: null,
  isEventLocked: false,
  bufferMinutes: DEFAULT_BUFFER_MINUTES,
  eventDurationMinutes: null,
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

  const parseClockToMinutes = useCallback((value?: string): number | null => {
    if (!value) return null;
    const [h, m] = value.slice(0, 5).split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }, []);

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

    const selectedEvent = state.selectedEventId
      ? state.travelData.eventsForDay.find(
          (eventItem) => String(eventItem.id) === String(state.selectedEventId),
        )
      : undefined;

    const selectedMin = parseClockToMinutes(state.estimatedTime);
    const eventEndMin = parseClockToMinutes(selectedEvent?.endTime);

    const shouldUseEventInsight =
      !!selectedEvent?.startTime &&
      (eventEndMin === null ||
        selectedMin === null ||
        selectedMin <= eventEndMin);

    return generateInsight({
      estimatedTime: state.estimatedTime,
      hasTravelInfo: !!(
        state.travelData.travelMinutes && state.travelData.travelMinutes > 0
      ),
      fastestArrival: state.travelData.fastestArrival,
      travelMinutes: state.travelData.travelMinutes,
      eventStartTime: shouldUseEventInsight
        ? selectedEvent?.startTime || state.travelData.eventStartTime
        : undefined,
      eventEndTime: shouldUseEventInsight ? selectedEvent?.endTime : undefined,
      eventName: shouldUseEventInsight
        ? selectedEvent?.name || state.travelData.eventName
        : undefined,
      openTime: state.travelData.openTime,
      closeTime: state.travelData.closeTime,
      massTimesForDay: state.travelData.massTimesForDay,
      restDuration: state.restDuration,
      t,
    });
  }, [
    parseClockToMinutes,
    state.estimatedTime,
    state.restDuration,
    state.selectedEventId,
    state.travelData,
    t,
  ]);

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
    async (
      siteId: string,
      eventId?: string,
      dayOverride?: number,
      options?: StartFlowOptions,
    ) => {
      const flowId = ++flowIdRef.current;
      const targetDay = dayOverride ?? selectedDay;

      setState((prev) => ({
        ...prev,
        selectedSiteId: siteId,
        selectedEventId: eventId || null,
        isEventLocked: false,
        bufferMinutes: prev.bufferMinutes || DEFAULT_BUFFER_MINUTES,
        eventDurationMinutes: null,
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
        } else if (options?.autoBindFirstDayEvent && eventsForDay.length > 0) {
          const firstEventWithTime = eventsForDay.find(
            (eventItem) => !!eventItem.startTime,
          );
          if (firstEventWithTime) {
            resolvedEventId = String(firstEventWithTime.id);
            evtName = firstEventWithTime.name;
            evtStart = firstEventWithTime.startTime;
          }
        }

        let evtEnd: string | undefined;
        if (resolvedEventId) {
          const fromDay = eventsForDay.find(
            (e) => String(e.id) === String(resolvedEventId),
          );
          const endFromDay = fromDay?.endTime as string | undefined;
          if (endFromDay) {
            evtEnd = endFromDay;
          } else {
            const fromSite = siteEvents.find(
              (e) => String(e.id) === String(resolvedEventId),
            ) as { end_time?: string } | undefined;
            if (fromSite?.end_time) {
              const raw = fromSite.end_time;
              evtEnd = typeof raw === "string" ? raw.slice(0, 5) : undefined;
            }
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
          eventEndTime: evtEnd,
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

        // If fastest arrival collapses to 00:00 (arrivable from previous day),
        // prefer schedule-based suggestion (event/mass/opening) for current day.
        const fastestArrival = travelData.fastestArrival;
        const fastestOffset = Number(travelData.fastestArrivalDayOffset || 0);
        const shouldPreferSuggestedTime =
          fastestArrival === "00:00" && fastestOffset <= 0;

        estimatedTime = shouldPreferSuggestedTime
          ? suggested.time
          : fastestArrival || suggested.time;

        // ── 7. Event-locking logic ──
        // When user explicitly chose an event, lock estimated_time to event.start - buffer.
        // Also compute event duration for rest_duration floor.
        let isEventLocked = false;
        let eventDurationMinutes: number | null = null;
        let eventLockedRestDuration = 120;
        let eventLockedNote = "";

        if (resolvedEventId && evtStart) {
          const evtStartMin = parseClockToMinutes(evtStart) ?? 0;

          // Find the resolved event's endTime from eventsForDay or siteEvents
          const resolvedEvt =
            eventsForDay.find(
              (e) => String(e.id) === String(resolvedEventId),
            ) ||
            siteEvents.find((e) => String(e.id) === String(resolvedEventId));
          const evtEndStr = resolvedEvt
            ? (resolvedEvt as DayEvent).endTime || (resolvedEvt as any).end_time
            : undefined;
          const evtEndMin = parseClockToMinutes(
            typeof evtEndStr === "string" ? evtEndStr.slice(0, 5) : undefined,
          );

          if (evtEndMin !== null && evtEndMin > evtStartMin) {
            eventDurationMinutes = evtEndMin - evtStartMin;
          }

          // Compute locked arrival = event.start - buffer
          const bufferMin = DEFAULT_BUFFER_MINUTES;
          const lockedArrivalMin = Math.max(0, evtStartMin - bufferMin);
          const lockedArrival = `${String(Math.floor(lockedArrivalMin / 60)).padStart(2, "0")}:${String(lockedArrivalMin % 60).padStart(2, "0")}`;

          // Check if physically reachable
          const fastestMin = parseClockToMinutes(travelData.fastestArrival);
          const canReachInTime =
            fastestMin === null || lockedArrivalMin >= fastestMin;

          if (canReachInTime) {
            isEventLocked = true;
            estimatedTime = lockedArrival;
            const evtEndStrForRest =
              typeof evtEndStr === "string" ? evtEndStr.slice(0, 5) : undefined;
            eventLockedRestDuration = suggestRestDurationForPlannedStop({
              estimatedTime: lockedArrival,
              eventEndTime: evtEndStrForRest,
              siteCloseTime: closeTime,
            }).defaultMinutes;
            eventLockedNote = evtName
              ? t("planner.autoNoteEvent", {
                  defaultValue: "Tham dự {{name}}",
                  name: evtName,
                })
              : "";
          } else {
            // Đến trễ so với (bắt đầu − buffer) nhưng vẫn trong khung sự kiện
            // (vd. 16:22 trong 06:07–17:07) → vẫn gắn sự kiện + khóa giờ theo sự kiện (UI như “ảnh 3”).
            const estMin = parseClockToMinutes(estimatedTime);
            const inEventWindow =
              estMin !== null &&
              estMin >= evtStartMin &&
              (evtEndMin === null || estMin < evtEndMin);
            if (inEventWindow) {
              isEventLocked = true;
              const evtEndStrForRest =
                typeof evtEndStr === "string"
                  ? evtEndStr.slice(0, 5)
                  : undefined;
              eventLockedRestDuration = suggestRestDurationForPlannedStop({
                estimatedTime,
                eventEndTime: evtEndStrForRest,
                siteCloseTime: closeTime,
              }).defaultMinutes;
              eventLockedNote = evtName
                ? t("planner.autoNoteEvent", {
                    defaultValue: "Tham dự {{name}}",
                    name: evtName,
                  })
                : "";
            }
            // Ngoài khung sự kiện / chưa tới: isEventLocked false → insight/ gợi ý
          }
        }

        if (flowId !== flowIdRef.current) return;

        setState((prev) => ({
          ...prev,
          selectedEventId: resolvedEventId,
          isEventLocked,
          eventDurationMinutes,
          estimatedTime,
          restDuration: isEventLocked
            ? eventLockedRestDuration
            : prev.restDuration,
          note: isEventLocked && eventLockedNote ? eventLockedNote : prev.note,
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
    (time: string) =>
      setState((prev) => {
        // When event-locked, time changes are blocked — user must use buffer picker or unlock
        if (prev.isEventLocked) return prev;

        if (!prev.travelData || !prev.selectedEventId) {
          return { ...prev, estimatedTime: time };
        }

        const selectedEvent = prev.travelData.eventsForDay.find(
          (eventItem) => String(eventItem.id) === String(prev.selectedEventId),
        );

        const selectedMin = parseClockToMinutes(time);
        const eventEndMin = parseClockToMinutes(selectedEvent?.endTime);

        const shouldClearSelectedEvent =
          eventEndMin !== null &&
          selectedMin !== null &&
          selectedMin > eventEndMin;

        return {
          ...prev,
          estimatedTime: time,
          selectedEventId: shouldClearSelectedEvent
            ? null
            : prev.selectedEventId,
        };
      }),
    [parseClockToMinutes],
  );

  const applySuggestedTime = useCallback(
    (
      time: string,
      source?: {
        priority: "event" | "mass" | "opening" | "default";
        eventId?: string;
      },
    ) =>
      setState((prev) => {
        if (prev.isEventLocked && source?.priority !== "event") return prev;

        if (source?.priority !== "event") {
          return {
            ...prev,
            estimatedTime: time,
            selectedEventId: null,
            isEventLocked: false,
            eventDurationMinutes: null,
          };
        }

        const eventId = source?.eventId || prev.selectedEventId;
        if (!eventId) {
          return { ...prev, estimatedTime: time, isEventLocked: false };
        }
        if (!prev.travelData) {
          return {
            ...prev,
            estimatedTime: time,
            selectedEventId: String(eventId),
            isEventLocked: true,
          };
        }

        const list = prev.travelData.eventsForDay || [];
        const fromList = list.find((e) => String(e.id) === String(eventId)) as
          | (DayEvent & { name?: string; startTime?: string; endTime?: string })
          | undefined;
        const fromSite = siteEvents.find(
          (e) => String(e.id) === String(eventId),
        ) as
          | ((typeof siteEvents)[number] & {
              start_time?: string;
              end_time?: string;
            })
          | undefined;
        const row = fromList || fromSite;
        if (!row) {
          return {
            ...prev,
            estimatedTime: time,
            selectedEventId: String(eventId),
            isEventLocked: true,
          };
        }

        const evtName =
          fromList?.name ?? (fromSite as { name?: string } | undefined)?.name;
        const evtStart = fromList?.startTime || fromSite?.start_time;
        const evtEndRaw =
          fromList?.endTime ||
          (fromSite as { end_time?: string } | undefined)?.end_time;
        const evtEndStr =
          typeof evtEndRaw === "string" ? evtEndRaw.slice(0, 5) : undefined;

        if (!evtStart) {
          return {
            ...prev,
            estimatedTime: time,
            selectedEventId: String(eventId),
            isEventLocked: true,
            travelData: {
              ...prev.travelData,
              eventName: evtName,
              eventStartTime: evtStart,
              eventEndTime: evtEndStr,
            },
          };
        }

        const evtStartMin = parseClockToMinutes(evtStart) ?? 0;
        const evtEndMin = parseClockToMinutes(evtEndStr);
        let eventDurationMinutes: number | null = null;
        if (evtEndMin != null && evtEndMin > evtStartMin) {
          eventDurationMinutes = evtEndMin - evtStartMin;
        }

        const arrivalMin = parseClockToMinutes(time) ?? 0;
        const nextTravel: SiteTravelData = {
          ...prev.travelData,
          eventStartTime: evtStart,
          eventEndTime: evtEndStr,
          eventName: evtName,
        };

        const autoNote = evtName
          ? t("planner.autoNoteEvent", {
              defaultValue: "Tham dự {{name}}",
              name: evtName,
            })
          : "";
        const nextNote = prev.note?.trim() ? prev.note : autoNote;

        const toHHmm = (m: number) =>
          `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

        const restFor = (est: string) =>
          suggestRestDurationForPlannedStop({
            estimatedTime: est,
            eventEndTime: evtEndStr,
            siteCloseTime: prev.travelData?.closeTime,
          }).defaultMinutes;

        const fastestMin = parseClockToMinutes(prev.travelData?.fastestArrival);

        if (arrivalMin < evtStartMin) {
          const rawBuffer = evtStartMin - arrivalMin;
          const chipOptions: number[] = [15, 30, 45, 60];
          const bufferMinutes = chipOptions.reduce((a, b) =>
            Math.abs(b - rawBuffer) < Math.abs(a - rawBuffer) ? b : a,
          );
          const lockedArrivalMin = Math.max(0, evtStartMin - bufferMinutes);
          const canReach = fastestMin == null || lockedArrivalMin >= fastestMin;
          if (canReach) {
            const estLocked = toHHmm(lockedArrivalMin);
            return {
              ...prev,
              selectedEventId: String(eventId),
              isEventLocked: true,
              bufferMinutes,
              eventDurationMinutes,
              estimatedTime: estLocked,
              restDuration: restFor(estLocked),
              travelData: nextTravel,
              note: nextNote,
            };
          }
          // Trước giờ bắt đầu nhưng vẫn gắn sự kiện + buffer hiển thị đúng với {{time}} đang chọn
          return {
            ...prev,
            selectedEventId: String(eventId),
            isEventLocked: true,
            bufferMinutes,
            eventDurationMinutes,
            estimatedTime: time,
            restDuration: restFor(time),
            travelData: nextTravel,
            note: nextNote,
          };
        }

        // Đã đến/đến trễ sau giờ bắt đầu: gắn sự kiện + giờ theo lựa chọn, không dùng buffer "Đến trước" (xử lý ở UI)
        return {
          ...prev,
          selectedEventId: String(eventId),
          isEventLocked: true,
          eventDurationMinutes,
          estimatedTime: time,
          restDuration: restFor(time),
          travelData: nextTravel,
          note: nextNote,
        };
      }),
    [parseClockToMinutes, siteEvents, t],
  );

  const setRestDuration = useCallback(
    (duration: number) =>
      setState((prev) => ({ ...prev, restDuration: duration })),
    [],
  );

  /** Change pre-event buffer (15/30/45/60) and recalculate locked arrival time */
  const setBufferMinutes = useCallback(
    (minutes: number) =>
      setState((prev) => {
        if (!prev.isEventLocked || !prev.travelData?.eventStartTime) {
          return { ...prev, bufferMinutes: minutes };
        }

        const evtStartMin =
          parseClockToMinutes(prev.travelData.eventStartTime) ?? 0;
        const estMin = parseClockToMinutes(prev.estimatedTime) ?? 0;
        // Khi giờ đến nằm từ lúc bắt đầu sự kiện trở đi (ví dụ từ gợi ý/điều chỉnh trễ), không đổi giờ qua buffer
        if (estMin >= evtStartMin) {
          return prev;
        }

        const lockedArrivalMin = Math.max(0, evtStartMin - minutes);
        const lockedArrival = `${String(Math.floor(lockedArrivalMin / 60)).padStart(2, "0")}:${String(lockedArrivalMin % 60).padStart(2, "0")}`;

        return {
          ...prev,
          bufferMinutes: minutes,
          estimatedTime: lockedArrival,
        };
      }),
    [parseClockToMinutes],
  );

  /** Remove event binding — switch to normal site mode with current estimated_time */
  const unlockEvent = useCallback(
    () =>
      setState((prev) => ({
        ...prev,
        isEventLocked: false,
        selectedEventId: null,
        eventDurationMinutes: null,
      })),
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
    applySuggestedTime,
    setRestDuration,
    setBufferMinutes,
    unlockEvent,
    setNote,
    closeTimeModal,
    resetFlow,
  };
}
