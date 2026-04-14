import { useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import type { PlanEntity, PlanItem, UpdatePlanItemRequest } from "../../../../types/pilgrim/planner.types";
import networkService from "../../../../services/network/networkService";
import offlinePlannerService from "../../../../services/offline/offlinePlannerService";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import vietmapService from "../../../../services/map/vietmapService";
import {
  formatDurationLocalized,
} from "../utils/siteScheduleHelper";
import { applyLocalItemUpdate } from "../utils/planDetailLocalPlan.utils";
import { buildDurationString } from "../utils/planDetailTime.utils";

interface UseEditItemFormProps {
  planId: string;
  plan: PlanEntity | null;
  t: (key: string, opts?: any) => string;
  applyPlanMutation: (
    optimisticUpdate: (plan: PlanEntity) => PlanEntity,
    offlineAction?: () => Promise<PlanEntity | null>,
  ) => Promise<PlanEntity | null>;
  loadPlan: () => Promise<void>;
  formatTimeValue: (value: any) => string;
}

export const useEditItemForm = ({
  planId,
  plan,
  t,
  applyPlanMutation,
  loadPlan,
  formatTimeValue,
}: UseEditItemFormProps) => {
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [editEstimatedTime, setEditEstimatedTime] = useState("10:00");
  const [editRestDuration, setEditRestDuration] = useState(120);
  const [editNote, setEditNote] = useState("");
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editTempTime, setEditTempTime] = useState(new Date());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editRouteInfo, setEditRouteInfo] = useState<string>("");
  const [calculatingEditRoute, setCalculatingEditRoute] = useState(false);

  const handleOpenEditItem = async (item: PlanItem) => {
    setEditingItem(item);
    // Parse existing estimated_time
    const timeVal =
      typeof item.estimated_time === "string" ? item.estimated_time : "10:00";
    setEditEstimatedTime(
      timeVal.length >= 5 ? timeVal.substring(0, 5) : timeVal,
    );
    // Parse rest_duration to minutes
    const durStr = formatTimeValue(item.rest_duration);
    let minutes = 120;
    const hourMatch = durStr.match(/(\d+)\s*gi[oờ]/);
    const minMatch = durStr.match(/(\d+)\s*ph[uút]/);
    if (hourMatch) minutes = parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);
    if (!hourMatch && !minMatch) {
      const rawMatch = durStr.match(/(\d+)/);
      if (rawMatch) minutes = parseInt(rawMatch[1]);
    }
    setEditRestDuration(Math.max(60, Math.min(240, minutes)));
    setEditNote(item.note || "");
    setEditRouteInfo("");
    setShowEditItemModal(true);

    // Calculate route from previous item to this item using VietMap
    const dayKey = String(item.day_number ?? item.leg_number ?? 1);
    const dayItems: PlanItem[] = plan?.items_by_day?.[dayKey] || [];
    const currentIndex = dayItems.findIndex((i) => i.id === item.id);
    if (currentIndex > 0) {
      const prevItem = dayItems[currentIndex - 1];
      const prevSiteId = prevItem.site_id || prevItem.site?.id;
      const currSiteId = item.site_id || item.site?.id;
      if (prevSiteId && currSiteId) {
        try {
          setCalculatingEditRoute(true);
          const [prevDetail, currDetail] = await Promise.all([
            pilgrimSiteApi.getSiteDetail(prevSiteId),
            pilgrimSiteApi.getSiteDetail(currSiteId),
          ]);
          const prevSite = prevDetail?.data;
          const currSite = currDetail?.data;
          if (
            prevSite?.latitude &&
            prevSite?.longitude &&
            currSite?.latitude &&
            currSite?.longitude
          ) {
            const route = await vietmapService.calculateRoute(
              { latitude: prevSite.latitude, longitude: prevSite.longitude },
              { latitude: currSite.latitude, longitude: currSite.longitude },
            );
            const distanceDisplay =
              route.distance < 1000
                ? `${Math.round(route.distance)} m`
                : `${route.distanceKm.toFixed(1)} km`;
            setEditRouteInfo(
              t("planner.sameDayRouteInfo", {
                distance: distanceDisplay,
                duration: formatDurationLocalized(route.durationMinutes, t),
              }),
            );
          } else {
            setEditRouteInfo(t("planner.noCoordinatesError"));
          }
        } catch {
          setEditRouteInfo(t("planner.loadSiteErrorShort"));
        } finally {
          setCalculatingEditRoute(false);
        }
      }
    } else if (currentIndex === 0) {
      setEditRouteInfo(t("planner.firstLocationOfDay"));
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
      const isValidationError = error?.response?.status === 400 || error?.response?.status === 409;

      if (isValidationError) {
        console.log("[API] Validation error saving edit:", JSON.stringify(respData));
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
    editRouteInfo,
    calculatingEditRoute,
    handleOpenEditItem,
    handleEditTimeChange,
    openEditTimePicker,
    handleSaveEditItem,
  };
};
