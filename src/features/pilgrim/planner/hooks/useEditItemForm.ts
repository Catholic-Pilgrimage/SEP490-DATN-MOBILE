import { useMemo, useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import vietmapService from "../../../../services/map/vietmapService";
import networkService from "../../../../services/network/networkService";
import offlinePlannerService from "../../../../services/offline/offlinePlannerService";
import type {
    PlanEntity,
    PlanItem,
    UpdatePlanItemRequest,
} from "../../../../types/pilgrim/planner.types";
import {
  applyLocalItemUpdate,
  sortPlanDayItems,
} from "../utils/planDetailLocalPlan.utils";
import { buildDurationString } from "../utils/planDetailTime.utils";
import {
  type DayEvent,
  generateInsight,
  getDateForLeg,
  getEventsForDate,
  getMassTimesForDate,
  parseOpeningHours,
  suggestArrivalTime,
} from "../utils/siteScheduleHelper";
import { parseDurationToMinutes } from "../utils/time";

interface UseEditItemFormProps {
  planId: string;
  plan: PlanEntity | null;
  t: (key: string, opts?: any) => string;
  applyPlanMutation: (
    optimisticUpdate: (plan: PlanEntity) => PlanEntity,
    offlineAction?: () => Promise<PlanEntity | null>,
  ) => Promise<PlanEntity | null>;
  loadPlan: () => Promise<void>;
}

type EditScheduleContext = {
  previousSiteName?: string;
  previousSiteId?: string;
  departureTimeFromPrev?: string;
  travelMinutes?: number;
  travelDistanceKm?: number;
  fastestArrival?: string;
  fastestArrivalDayOffset?: number;
  sourceDayNumber?: number;
  isCrossDayTravel?: boolean;
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
  crossDayWarning: string | null;
  crossDaysAdded: number;
};

const EMPTY_SCHEDULE_CONTEXT: EditScheduleContext = {
  massTimesForDay: [],
  eventsForDay: [],
  crossDayWarning: null,
  crossDaysAdded: 0,
  isCrossDayTravel: false,
};

export const useEditItemForm = ({
  planId,
  plan,
  t,
  applyPlanMutation,
  loadPlan,
}: UseEditItemFormProps) => {
  const MIN_REST_MINUTES = 60;
  const MAX_REST_MINUTES = 1435;

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [editEstimatedTime, setEditEstimatedTime] = useState("10:00");
  const [editRestDuration, setEditRestDuration] = useState(120);
  const [editNote, setEditNote] = useState("");
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editTempTime, setEditTempTime] = useState(new Date());
  const [savingEdit, setSavingEdit] = useState(false);
  const [calculatingEditRoute, setCalculatingEditRoute] = useState(false);
  const [editScheduleContext, setEditScheduleContext] =
    useState<EditScheduleContext>(EMPTY_SCHEDULE_CONTEXT);

  const parseClockToMinutes = (value?: string | null): number | null => {
    if (!value) return null;
    const normalized = String(value).trim().slice(0, 5);
    const [h, m] = normalized.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const toHHmm = (value?: string | null): string => {
    if (!value) return "00:00";
    const text = String(value).trim();
    return text.length >= 5 ? text.slice(0, 5) : "00:00";
  };

  const handleOpenEditItem = async (item: PlanItem) => {
    setEditingItem(item);
    // Parse existing estimated_time
    const timeVal =
      typeof item.estimated_time === "string" ? item.estimated_time : "10:00";
    setEditEstimatedTime(
      timeVal.length >= 5 ? timeVal.substring(0, 5) : timeVal,
    );
    // Parse rest_duration to minutes
    const parsedMinutes = parseDurationToMinutes(item.rest_duration);
    const minutes = parsedMinutes > 0 ? parsedMinutes : 120;
    setEditRestDuration(
      Math.max(MIN_REST_MINUTES, Math.min(MAX_REST_MINUTES, minutes)),
    );
    setEditNote(item.note || "");
    setEditScheduleContext(EMPTY_SCHEDULE_CONTEXT);
    setShowEditItemModal(true);

    try {
      setCalculatingEditRoute(true);

      const dayNumber = Number(item.day_number ?? item.leg_number ?? 1) || 1;
      const dayKey = String(dayNumber);
      const dayItems: PlanItem[] = sortPlanDayItems(plan?.items_by_day?.[dayKey] || []);
      const currentIndex = dayItems.findIndex((i) => i.id === item.id);
      let previousItem: PlanItem | null =
        currentIndex > 0 ? dayItems[currentIndex - 1] : null;
      let previousDayNumber = dayNumber;
      let isCrossDayTravel = false;

      if (!previousItem && dayNumber > 1) {
        for (let d = dayNumber - 1; d >= 1; d--) {
          const prevDayItems = sortPlanDayItems(
            plan?.items_by_day?.[String(d)] || [],
          );
          if (prevDayItems.length > 0) {
            previousItem = prevDayItems[prevDayItems.length - 1];
            previousDayNumber = d;
            isCrossDayTravel = true;
            break;
          }
        }
      }

      const currSiteId = item.site_id || item.site?.id;
      if (!currSiteId) {
        setEditScheduleContext({
          ...EMPTY_SCHEDULE_CONTEXT,
          newSiteName: item.site?.name,
          newSiteAddress: item.site?.address,
          newSiteCoverImage: item.site?.cover_image || item.site?.image,
        });
        return;
      }

      const currDetail = await pilgrimSiteApi.getSiteDetail(currSiteId);
      const currentSite = currDetail?.data as any;

      const legDate = getDateForLeg(plan?.start_date, dayNumber);
      const schedule = parseOpeningHours(currentSite?.opening_hours, legDate);
      const openTime = schedule?.open;
      const closeTime = schedule?.close;

      let massTimesForDay: string[] = [];
      try {
        const massRes = await pilgrimSiteApi.getSiteMassSchedules(currSiteId);
        const schedules =
          (massRes as any)?.data?.data || (massRes as any)?.data || [];
        massTimesForDay = getMassTimesForDate(schedules, legDate);
      } catch {
        massTimesForDay = [];
      }

      let eventsForDay: DayEvent[] = [];
      try {
        const eventParams: any = { limit: 50 };
        if (legDate) {
          const dateStr = `${legDate.getFullYear()}-${String(
            legDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(legDate.getDate()).padStart(2, "0")}`;
          eventParams.start_date = dateStr;
          eventParams.end_date = dateStr;
        }
        const eventsRes = await pilgrimSiteApi.getSiteEvents(currSiteId, eventParams);
        const eventList =
          (eventsRes as any)?.data?.data || (eventsRes as any)?.data || [];
        eventsForDay = getEventsForDate(eventList, legDate);
      } catch {
        eventsForDay = [];
      }

      const selectedEvent = item.event_id
        ? eventsForDay.find((ev) => String(ev.id) === String(item.event_id))
        : undefined;

      const nextContext: EditScheduleContext = {
        ...EMPTY_SCHEDULE_CONTEXT,
        sourceDayNumber: previousDayNumber,
        isCrossDayTravel,
        newSiteName: currentSite?.name || item.site?.name,
        newSiteAddress:
          currentSite?.address || currentSite?.full_address || item.site?.address,
        newSitePatronSaint:
          currentSite?.patron_saint || currentSite?.patronSaint || item.site?.patron_saint,
        newSiteCoverImage:
          currentSite?.cover_image || currentSite?.coverImage || currentSite?.image || item.site?.cover_image || item.site?.image,
        openTime,
        closeTime,
        massTimesForDay,
        eventsForDay,
        eventStartTime: selectedEvent?.startTime,
        eventName: selectedEvent?.name,
      };

      if (previousItem) {
        const prevSiteId = previousItem.site_id || previousItem.site?.id;
        if (prevSiteId) {
          try {
            const prevDetail = await pilgrimSiteApi.getSiteDetail(prevSiteId);
            const previousSite = prevDetail?.data as any;

            const prevLat = Number(
              previousSite?.latitude || previousItem.site?.latitude || 0,
            );
            const prevLng = Number(
              previousSite?.longitude || previousItem.site?.longitude || 0,
            );
            const currLat = Number(currentSite?.latitude || item.site?.latitude || 0);
            const currLng = Number(currentSite?.longitude || item.site?.longitude || 0);

            if (prevLat && prevLng && currLat && currLng) {
              const route = await vietmapService.calculateRoute(
                { latitude: prevLat, longitude: prevLng },
                { latitude: currLat, longitude: currLng },
                plan?.transportation,
              );

              const prevTime = toHHmm(
                previousItem.estimated_time || previousItem.arrival_time,
              );
              const prevRest = parseDurationToMinutes(previousItem.rest_duration);
              const safePrevRest = prevRest > 0 ? prevRest : 120;

              const departure = vietmapService.calculateArrivalTime(
                prevTime,
                safePrevRest,
              );
              const arrival = vietmapService.calculateArrivalTime(
                prevTime,
                safePrevRest + route.durationMinutes,
              );

              const dayDifference = dayNumber - previousDayNumber;
              let effectiveFastestArrival = arrival.time;
              let effectiveFastestArrivalDayOffset = Math.max(0, arrival.daysAdded);
              let crossDaysAdded = 0;
              let crossDayWarning: string | null = null;

              if (isCrossDayTravel) {
                if (arrival.daysAdded < dayDifference) {
                  effectiveFastestArrival = "00:00";
                  effectiveFastestArrivalDayOffset = 0;
                } else if (arrival.daysAdded === dayDifference) {
                  effectiveFastestArrivalDayOffset = 0;
                } else if (arrival.daysAdded > dayDifference) {
                  crossDaysAdded = arrival.daysAdded - dayDifference;
                  effectiveFastestArrivalDayOffset = crossDaysAdded;
                  crossDayWarning = t("planner.crossDayWarning", {
                    defaultValue:
                      "Thời gian di chuyển vượt qua ngày hiện tại. Vui lòng chọn ngày khác cho địa điểm này.",
                  });
                }
              } else if (arrival.daysAdded > 0) {
                crossDaysAdded = arrival.daysAdded;
                effectiveFastestArrivalDayOffset = arrival.daysAdded;
                crossDayWarning = t("planner.crossDayWarning", {
                  defaultValue:
                    "Thời gian di chuyển vượt qua ngày hiện tại. Vui lòng chọn ngày khác cho địa điểm này.",
                });
              }

              nextContext.previousSiteId = prevSiteId;
              nextContext.previousSiteName =
                previousSite?.name || previousItem.site?.name;
              nextContext.departureTimeFromPrev = departure.time;
              nextContext.travelMinutes = route.durationMinutes;
              nextContext.travelDistanceKm = route.distanceKm;
              nextContext.fastestArrival = effectiveFastestArrival;
              nextContext.fastestArrivalDayOffset =
                effectiveFastestArrivalDayOffset;
              nextContext.crossDaysAdded = crossDaysAdded;
              nextContext.crossDayWarning = crossDayWarning;
            }
          } catch {
            // Keep basic schedule context even when previous-route enrichment fails.
          }
        }
      }

      setEditScheduleContext(nextContext);
    } finally {
      setCalculatingEditRoute(false);
    }
  };

  const handleEditTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEditTimePicker(false);
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, "0");
      const m = selectedDate.getMinutes().toString().padStart(2, "0");
      setEditEstimatedTime(`${h}:${m}`);
      if (Platform.OS === "ios") setShowEditTimePicker(false);
    }
  };

  const openEditTimePicker = () => {
    const [h, m] = editEstimatedTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 10);
    d.setMinutes(m || 0);
    setEditTempTime(d);
    setShowEditTimePicker(true);
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;

    const estimatedMinutes = parseClockToMinutes(editEstimatedTime) ?? 0;
    const remainingInDayMinutes = Math.max(0, 1440 - estimatedMinutes);
    const isRestOverflowDay = editRestDuration > remainingInDayMinutes;
    const isSameAsPreviousSite =
      !!editingItem.site_id &&
      !!editScheduleContext.previousSiteId &&
      String(editScheduleContext.previousSiteId) === String(editingItem.site_id);

    if (
      editInsight?.isBlocking === true ||
      editScheduleContext.crossDaysAdded > 0 ||
      isRestOverflowDay ||
      isSameAsPreviousSite
    ) {
      Toast.show({
        type: "error",
        text1: t("planner.cannotUpdateItem", {
          defaultValue: "Không thể cập nhật địa điểm",
        }),
        text2:
          editInsight?.message ||
          t("planner.adjustRestOrTime", {
            defaultValue: "Cần chỉnh giờ nghỉ/đến",
          }),
      });
      return;
    }

    try {
      setSavingEdit(true);
      const payload: UpdatePlanItemRequest = {
        estimated_time: editEstimatedTime,
        rest_duration: buildDurationString(editRestDuration),
        note: editNote.trim() || undefined,
      };

      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items/${editingItem.id}`,
          method: "PUT",
          data: {
            planner_item_id: editingItem.id,
            ...payload,
          },
        });

        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(planId, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
        );

        setShowEditItemModal(false);
        setEditingItem(null);
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        return;
      }

      if (String(editingItem.id).startsWith("offline_")) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: t("planner.offlineItemNeedsReload", {
            defaultValue:
              "Địa điểm này đang là dữ liệu tạm. Hãy tải lại kế hoạch rồi thử chỉnh sửa lại.",
          }),
        });
        await loadPlan();
        return;
      }

      const response = await pilgrimPlannerApi.updatePlanItem(
        planId,
        editingItem.id,
        payload,
      );
      if (response.success) {
        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(planId, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
        );
        setShowEditItemModal(false);
        setEditingItem(null);
        void loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || t("planner.cannotUpdateItem"),
        });
      }
    } catch (error: any) {
      const respData = error?.response?.data;
      const isValidationError =
        error?.response?.status === 400 || error?.response?.status === 409;

      if (isValidationError) {
        console.log(
          "[API] Validation error saving edit:",
          JSON.stringify(respData),
        );
      } else {
        console.log("Save edit serious error:", error?.message || error);
      }

      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          respData?.error?.message ||
          respData?.message ||
          error.message ||
          t("planner.cannotUpdateItem"),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const editSuggestedTime = useMemo(() => {
    if (!editingItem) return null;
    return suggestArrivalTime({
      eventStartTime: editScheduleContext.eventStartTime,
      eventName: editScheduleContext.eventName,
      massTimesForDay: editScheduleContext.massTimesForDay,
      openTime: editScheduleContext.openTime,
      closeTime: editScheduleContext.closeTime,
      fastestArrival: editScheduleContext.fastestArrival,
      t,
    });
  }, [editingItem, editScheduleContext, t]);

  const editInsight = useMemo(() => {
    if (!editingItem) return null;
    return generateInsight({
      estimatedTime: editEstimatedTime,
      hasTravelInfo: !!(
        editScheduleContext.travelMinutes && editScheduleContext.travelMinutes > 0
      ),
      fastestArrival: editScheduleContext.fastestArrival,
      travelMinutes: editScheduleContext.travelMinutes,
      eventStartTime: editScheduleContext.eventStartTime,
      eventName: editScheduleContext.eventName,
      openTime: editScheduleContext.openTime,
      closeTime: editScheduleContext.closeTime,
      massTimesForDay: editScheduleContext.massTimesForDay,
      restDuration: editRestDuration,
      t,
    });
  }, [editingItem, editEstimatedTime, editRestDuration, editScheduleContext, t]);

  return {
    showEditItemModal,
    setShowEditItemModal,
    editingItem,
    editEstimatedTime,
    setEditEstimatedTime,
    editRestDuration,
    setEditRestDuration,
    editNote,
    setEditNote,
    showEditTimePicker,
    setShowEditTimePicker,
    editTempTime,
    savingEdit,
    calculatingEditRoute,
    editScheduleContext,
    editInsight,
    editSuggestedTime,
    handleOpenEditItem,
    handleEditTimeChange,
    openEditTimePicker,
    handleSaveEditItem,
  };
};
