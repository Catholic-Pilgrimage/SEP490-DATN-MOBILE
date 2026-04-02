import { useCallback, useState } from "react";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import locationService from "../../../../services/location/locationService";
import networkService from "../../../../services/network/networkService";
import {
    MarkVisitedConfirmationResponse,
    PlanItem,
} from "../../../../types/pilgrim/planner.types";

export const useJourneyExecution = (
  planId: string,
  refreshPlan: () => Promise<void>,
) => {
  const [checkingInItemId, setCheckingInItemId] = useState<string | null>(null);
  const [skippingItemId, setSkippingItemId] = useState<string | null>(null);
  const [markingVisitedItemId, setMarkingVisitedItemId] = useState<
    string | null
  >(null);

  const checkIn = useCallback(
    async (item: PlanItem) => {
      if (!item.id) return;
      try {
        setCheckingInItemId(item.id);
        const location = await locationService.getCurrentLocation();
        const isOnline = await networkService.checkConnection();
        if (!isOnline) {
          await networkService.addToOfflineQueue({
            endpoint: `/api/planners/${planId}/items/${item.id}/checkin`,
            method: "POST",
            data: {
              planner_item_id: item.id,
              latitude: location.latitude,
              longitude: location.longitude,
            },
          });
          Toast.show({
            type: "success",
            text1: "Đã lưu check-in offline",
            text2: item.site.name,
          });
          return;
        }
        const response = await pilgrimPlannerApi.checkInPlanItem(
          planId,
          item.id,
          {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        );
        if (!response.success) {
          throw new Error(response.message || "Không thể check-in");
        }
        Toast.show({
          type: "success",
          text1: "Check-in thành công",
          text2: item.site.name,
        });
        await refreshPlan();
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: "Check-in thất bại",
          text2: e?.message || "Vui lòng thử lại",
        });
      } finally {
        setCheckingInItemId(null);
      }
    },
    [planId, refreshPlan],
  );

  const skipItem = useCallback(
    async (item: PlanItem) => {
      if (!item.id) return;
      try {
        setSkippingItemId(item.id);
        const response = await pilgrimPlannerApi.updatePlannerItemStatus(
          planId,
          item.id,
          {
            status: "skipped",
            skip_reason: "Người dùng bỏ qua trong hành trình",
          },
        );
        if (!response.success) {
          throw new Error(response.message || "Không thể bỏ qua điểm đến");
        }
        Toast.show({
          type: "success",
          text1: "Đã bỏ qua điểm đến",
          text2: item.site.name,
        });
        await refreshPlan();
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: "Không thể bỏ qua điểm đến",
          text2: e?.message || "Vui lòng thử lại",
        });
      } finally {
        setSkippingItemId(null);
      }
    },
    [planId, refreshPlan],
  );

  const markVisited = useCallback(
    async (item: PlanItem) => {
      if (!item.id) return;
      try {
        setMarkingVisitedItemId(item.id);
        const response = await pilgrimPlannerApi.updatePlannerItemStatus(
          planId,
          item.id,
          {
            status: "visited",
          },
        );
        if (!response.success) {
          throw new Error(
            response.message || "Không thể chuyển trạng thái đã viếng",
          );
        }
        const payload = response.data;
        if (
          payload &&
          typeof payload === "object" &&
          "requires_confirmation" in payload &&
          (payload as MarkVisitedConfirmationResponse).requires_confirmation ===
            true
        ) {
          const missed =
            (payload as MarkVisitedConfirmationResponse).stats?.missed ?? 0;
          await new Promise<void>((resolve) => {
            Alert.alert(
              "Xác nhận chốt điểm",
              `Còn ${missed} thành viên chưa check-in. Xác nhận ghi nhận vắng và chốt điểm?`,
              [
                { text: "Hủy", style: "cancel", onPress: () => resolve() },
                {
                  text: "Xác nhận",
                  onPress: () => {
                    void (async () => {
                      try {
                        const r2 =
                          await pilgrimPlannerApi.updatePlannerItemStatus(
                            planId,
                            item.id,
                            {
                              status: "visited",
                              confirm_missed: true,
                              skip_reason:
                                "Trưởng đoàn xác nhận chốt điểm (ghi nhận vắng mặt)",
                            },
                          );
                        if (!r2.success) {
                          throw new Error(
                            r2.message || "Không thể hoàn tất sau khi xác nhận",
                          );
                        }
                        Toast.show({
                          type: "success",
                          text1: "Đã hoàn tất điểm viếng",
                          text2: item.site.name,
                        });
                        await refreshPlan();
                      } catch (e: any) {
                        Toast.show({
                          type: "error",
                          text1: "Không thể cập nhật trạng thái",
                          text2: e?.message || "Vui lòng thử lại",
                        });
                      } finally {
                        resolve();
                      }
                    })();
                  },
                },
              ],
            );
          });
          return;
        }
        Toast.show({
          type: "success",
          text1: "Đã hoàn tất điểm viếng",
          text2: item.site.name,
        });
        await refreshPlan();
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: "Không thể cập nhật trạng thái",
          text2: e?.message || "Vui lòng thử lại",
        });
      } finally {
        setMarkingVisitedItemId(null);
      }
    },
    [planId, refreshPlan],
  );

  return {
    checkingInItemId,
    skippingItemId,
    markingVisitedItemId,
    checkIn,
    skipItem,
    markVisited,
  };
};
