/**
 * Hook for syncing planner to device calendar
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform } from "react-native";

import pilgrimPlannerApi from "../services/api/pilgrim/plannerApi";
import calendarService, {
    PlannerCalendarSyncResult,
} from "../services/calendar/calendarService";

export const useCalendarSync = () => {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);

  const syncPlanToCalendar = async (
    plannerId: string,
  ): Promise<PlannerCalendarSyncResult | null> => {
    if (Platform.OS === "web") {
      Alert.alert(
        t("planner.syncNotSupported"),
        t("planner.syncNotSupportedMessage"),
      );
      return null;
    }

    try {
      setSyncing(true);

      // Step 1: Fetch calendar sync data from API
      const response = await pilgrimPlannerApi.getPlanCalendarSync(plannerId);

      if (!response.success || !response.data) {
        throw new Error(
          response.message || t("planner.syncError"),
        );
      }

      // Step 2: Sync to device calendar
      const result = await calendarService.syncPlannerCalendar(response.data);

      // Step 3: Show success message
      const deletedText = result.deleted > 0 
        ? t("planner.syncDeletedEvents", { count: result.deleted })
        : "";

      const message = t("planner.syncSuccessMessage", {
        total: result.total,
        calendarName: result.calendarName,
        created: result.created,
        updated: result.updated,
        deleted: deletedText,
      });

      Alert.alert(t("planner.syncSuccess"), message);

      return result;
    } catch (error: any) {
      console.error("Calendar sync error:", error);

      let errorMessage = t("planner.syncError");

      if (error.message?.includes("permission")) {
        errorMessage = t("planner.syncPermissionDenied");
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t("planner.syncError"), errorMessage);
      return null;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncPlanToCalendar,
  };
};
