/**
 * Hook for syncing planner to device calendar
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import pilgrimPlannerApi from "../services/api/pilgrim/plannerApi";
import calendarService, {
    PlannerCalendarSyncResult,
} from "../services/calendar/calendarService";

export interface CalendarSyncError {
  type: "not_supported" | "permission_denied" | "sync_failed";
  message: string;
}

export const useCalendarSync = () => {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);

  const syncPlanToCalendar = async (
    plannerId: string,
  ): Promise<{ success: boolean; result?: PlannerCalendarSyncResult; error?: CalendarSyncError }> => {
    if (Platform.OS === "web") {
      return {
        success: false,
        error: {
          type: "not_supported",
          message: t("planner.syncNotSupportedMessage"),
        },
      };
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

      return { success: true, result };
    } catch (error: any) {
      console.error("Calendar sync error:", error);

      let errorType: CalendarSyncError["type"] = "sync_failed";
      let errorMessage = t("planner.syncError");

      if (error.message?.includes("permission")) {
        errorType = "permission_denied";
        errorMessage = t("planner.syncPermissionDenied");
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage,
        },
      };
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncPlanToCalendar,
  };
};
