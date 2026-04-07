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

import { useCallback, useMemo, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import pilgrimSiteApi from '../../../../services/api/pilgrim/siteApi';
import vietmapService from '../../../../services/map/vietmapService';
import type { SiteEvent } from '../../../../types/pilgrim';
import type { PlanEntity, PlanItem } from '../../../../types/pilgrim/planner.types';
import {
  type DayEvent,
  type DaySchedule,
  type ScheduleInsight,
  type SuggestedArrival,
  generateInsight,
  getDateForLeg,
  getEventsForDate,
  getMassTimesForDate,
  parseOpeningHours,
  suggestArrivalTime,
  timeToMinutes,
} from '../utils/siteScheduleHelper';
import { parseDurationToMinutes, formatTimeValue } from '../utils/time';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteTravelData {
  previousSiteName?: string;
  departureTimeFromPrev?: string;
  travelMinutes?: number;
  travelDistanceKm?: number;
  fastestArrival?: string;
  newSiteName?: string;
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
  routeInfo: string;
  travelTimeMinutes: number | undefined;
  crossDayWarning: string | null;
  crossDaysAdded: number;
  showTimeInputModal: boolean;
  travelData: SiteTravelData | null;
  insight: ScheduleInsight | null;
  suggestedTime: SuggestedArrival | null;
}

export interface AddSiteFlowActions {
  startFlow: (siteId: string, eventId?: string) => Promise<void>;
  setEstimatedTime: (time: string) => void;
  setRestDuration: (duration: number) => void;
  setNote: (note: string) => void;
  closeTimeModal: () => void;
  resetFlow: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: AddSiteFlowState = {
  selectedSiteId: '',
  selectedEventId: null,
  estimatedTime: '08:00',
  restDuration: 120,
  note: '',
  calculatingRoute: false,
  routeInfo: '',
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

  const [state, setState] = useState<AddSiteFlowState>({ ...INITIAL_STATE });
  const flowIdRef = useRef(0); // Guard against stale async completions

  // ── Derived: Recalculate insight whenever estimatedTime OR restDuration changes ──
  const insight = useMemo<ScheduleInsight | null>(() => {
    if (!state.travelData) return null;
    return generateInsight({
      estimatedTime: state.estimatedTime,
      hasTravelInfo: !!(state.travelData.travelMinutes && state.travelData.travelMinutes > 0),
      fastestArrival: state.travelData.fastestArrival,
      travelMinutes: state.travelData.travelMinutes,
      eventStartTime: state.travelData.eventStartTime,
      eventName: state.travelData.eventName,
      openTime: state.travelData.openTime,
      closeTime: state.travelData.closeTime,
      massTimesForDay: state.travelData.massTimesForDay,
      restDuration: state.restDuration,
    });
  }, [state.estimatedTime, state.restDuration, state.travelData]);

  // ── Find the "previous item" to calculate travel from ──
  // For Day N first item: look up day N-1's last item (cross-day travel)
  const findPreviousItem = useCallback((): { item: PlanItem; isCrossDay: boolean } | null => {
    if (!plan?.items_by_day) return null;

    // Same-day: last item in current day
    const itemsForDay = plan.items_by_day[selectedDay.toString()] || [];
    if (itemsForDay.length > 0) {
      return { item: itemsForDay[itemsForDay.length - 1], isCrossDay: false };
    }

    // Cross-day: look backwards for the nearest day that has items
    if (selectedDay > 1) {
      for (let d = selectedDay - 1; d >= 1; d--) {
        const prevDayItems = plan.items_by_day[d.toString()] || [];
        if (prevDayItems.length > 0) {
          return { item: prevDayItems[prevDayItems.length - 1], isCrossDay: true };
        }
      }
    }

    return null;
  }, [plan, selectedDay]);

  // ── Start the add-site flow ──
  const startFlow = useCallback(
    async (siteId: string, eventId?: string) => {
      const flowId = ++flowIdRef.current;

      setState(prev => ({
        ...prev,
        selectedSiteId: siteId,
        selectedEventId: eventId || null,
        calculatingRoute: true,
        routeInfo: '',
        crossDayWarning: null,
        crossDaysAdded: 0,
        travelTimeMinutes: undefined,
        travelData: null,
        insight: null,
        suggestedTime: null,
        note: '',
      }));

      try {
        // 1. Fetch site detail for opening_hours
        const siteDetailRes = await pilgrimSiteApi.getSiteDetail(siteId);
        const newSite = siteDetailRes?.data;

        if (flowId !== flowIdRef.current) return; // stale

        // 2. Parse opening hours for the specific day
        const legDate = getDateForLeg(plan?.start_date, selectedDay);
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
          const schedules = (massRes as any)?.data?.data || (massRes as any)?.data || [];
          massTimesForDay = getMassTimesForDate(schedules, legDate);
        } catch {
          // Mass schedule fetch failure is non-critical
        }

        // 4. Fetch site events for this site on legDate
        let eventsForDay: DayEvent[] = [];
        try {
          const eventParams: any = { limit: 50 };
          if (legDate) {
            const dateStr = `${legDate.getFullYear()}-${String(legDate.getMonth() + 1).padStart(2, '0')}-${String(legDate.getDate()).padStart(2, '0')}`;
            eventParams.start_date = dateStr;
            eventParams.end_date = dateStr;
          }
          const evRes = await pilgrimSiteApi.getSiteEvents(siteId, eventParams);
          if (flowId !== flowIdRef.current) return;
          const evList = (evRes as any)?.data?.data || (evRes as any)?.data || [];
          eventsForDay = getEventsForDate(evList, legDate);
        } catch {
          // Event fetch failure is non-critical
        }

        // 5. Get event info — prefer explicitly selected event, else pick first from fetched events
        let resolvedEventId: string | null = eventId || null;
        let evtName: string | undefined;
        let evtStart: string | undefined;
        if (eventId) {
          const ev = siteEvents.find(e => String(e.id) === String(eventId));
          if (ev) {
            evtName = ev.name;
            evtStart = ev.start_time || undefined;
          }
        } else if (eventsForDay.length > 0) {
          // Auto-detect: use the first event with a start time
          const autoEvt = eventsForDay.find(e => e.startTime) || eventsForDay[0];
          resolvedEventId = autoEvt.id;
          evtName = autoEvt.name;
          evtStart = autoEvt.startTime;
        }

        // 6. Calculate route from previous item (same-day or cross-day)
        let travelData: SiteTravelData = {
          newSiteName: (newSite as any)?.name || 'Địa điểm mới',
          openTime,
          closeTime,
          massTimesForDay,
          eventsForDay,
          eventStartTime: evtStart,
          eventName: evtName,
        };

        let estimatedTime = '08:00';
        let routeInfo = 'Địa điểm đầu tiên trong ngày';
        let travelTimeMinutes: number | undefined;
        let crossDayWarning: string | null = null;
        let crossDaysAdded = 0;

        const previousResult = findPreviousItem();

        if (previousResult) {
          const { item: lastItem, isCrossDay } = previousResult;
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
                { latitude: (newSite as any).latitude, longitude: (newSite as any).longitude },
              );

              if (flowId !== flowIdRef.current) return;

              const lastSiteTime = lastItem.estimated_time || '10:00';
              const previousRestMinutes = parseDurationToMinutes(lastItem.rest_duration);

              const departureResult = vietmapService.calculateArrivalTime(
                lastSiteTime,
                previousRestMinutes,
              );

              const arrivalResult = vietmapService.calculateArrivalTime(
                lastSiteTime,
                previousRestMinutes + routeResult.durationMinutes,
              );

              travelTimeMinutes = routeResult.durationMinutes;

              const prevSiteName = (lastSite as any)?.name || lastItem.site?.name;

              travelData = {
                ...travelData,
                previousSiteName: prevSiteName,
                departureTimeFromPrev: departureResult.time,
                travelMinutes: routeResult.durationMinutes,
                travelDistanceKm: routeResult.distanceKm,
                fastestArrival: arrivalResult.time,
                isCrossDayTravel: isCrossDay,
              };

              const distanceDisplay =
                routeResult.distance < 1000
                  ? `${Math.round(routeResult.distance)} m`
                  : `${routeResult.distanceKm.toFixed(1)} km`;

              routeInfo = isCrossDay
                ? `📍 Từ "${prevSiteName}" (ngày trước) • ${distanceDisplay} • ${routeResult.durationText}`
                : `Khoảng cách: ${distanceDisplay} • Thời gian di chuyển: ${routeResult.durationText}`;

              if (arrivalResult.daysAdded > 0 && !isCrossDay) {
                crossDaysAdded = arrivalResult.daysAdded;
                crossDayWarning =
                  'Thời gian di chuyển vượt qua ngày hiện tại. Vui lòng chọn ngày khác cho địa điểm này.';
              }
            } else {
              routeInfo = 'Không có tọa độ để tính toán lộ trình';
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
        });

        // Use suggested time
        estimatedTime = suggested.time;

        if (flowId !== flowIdRef.current) return;

        setState(prev => ({
          ...prev,
          selectedEventId: resolvedEventId,
          estimatedTime,
          routeInfo,
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
          type: 'error',
          text1: 'Không thể tải thông tin địa điểm',
          text2: error?.message || 'Vui lòng thử lại',
        });
        if (flowId !== flowIdRef.current) return;
        setState(prev => ({
          ...prev,
          estimatedTime: '08:00',
          routeInfo: 'Lỗi tải thông tin địa điểm',
          calculatingRoute: false,
          showTimeInputModal: true,
          travelData: {
            newSiteName: 'Địa điểm',
            massTimesForDay: [],
            eventsForDay: [],
          },
        }));
      }
    },
    [plan, selectedDay, siteEvents, findPreviousItem],
  );

  // ── Setters ──
  const setEstimatedTime = useCallback(
    (time: string) => setState(prev => ({ ...prev, estimatedTime: time })),
    [],
  );

  const setRestDuration = useCallback(
    (duration: number) => setState(prev => ({ ...prev, restDuration: duration })),
    [],
  );

  const setNote = useCallback(
    (note: string) => setState(prev => ({ ...prev, note })),
    [],
  );

  const closeTimeModal = useCallback(
    () => setState(prev => ({ ...prev, showTimeInputModal: false })),
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
