import { useCallback } from "react";
import Toast from "react-native-toast-message";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import vietmapService from "../../../../services/map/vietmapService";
import networkService from "../../../../services/network/networkService";
import type {
    PlanEntity,
    PlanItem,
} from "../../../../types/pilgrim/planner.types";
import { extractApiErrorMessage } from "../utils/planDetailHelpers";
import { sortPlanDayItems } from "../utils/planDetailLocalPlan.utils";
import { parseDurationToMinutes } from "../utils/time";
import type { PlannerItemPatch } from "./usePlannerDayPatching";

type TranslationFn = (key: string, options?: any) => string;

type ConfirmFn = (options: any) => Promise<boolean>;

interface UsePlannerSwapActionsParams {
  plan: PlanEntity | null;
  planId: string;
  isReadOnlyPlannerView: boolean;
  swapPick: { dayKey: string; itemId: string } | null;
  setSwapPick: React.Dispatch<
    React.SetStateAction<{ dayKey: string; itemId: string } | null>
  >;
  t: TranslationFn;
  confirm: ConfirmFn;
  loadPlan: (options?: { silent?: boolean }) => Promise<void>;
  applyPlanMutation: (
    localUpdater: (currentPlan: PlanEntity) => PlanEntity,
    cacheUpdater?: () => Promise<PlanEntity | null>,
  ) => Promise<PlanEntity | null>;
  buildDayPatches: (
    orderedItems: PlanItem[],
    dayNumber: number,
    anchorTime: string,
    siteCache: Record<
      string,
      { latitude: number; longitude: number; name?: string }
    >,
    earliestStartTime?: string,
  ) => Promise<PlannerItemPatch[]>;
  applyLocalItemPatches: (
    currentPlan: PlanEntity,
    patches: PlannerItemPatch[],
  ) => PlanEntity;
}

const toHHmm = (value?: string): string => {
  if (!value) return "08:00";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : "08:00";
};

const shouldFallbackLegacySwap = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  return status === 404 || status === 405 || status === 501;
};

const toDisplayHHmm = (value?: string): string => {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  return text;
};

const extractCreatedItemId = (response: any): string | undefined => {
  const rawId =
    response?.data?.item?.id ??
    response?.data?.id ??
    response?.item?.id ??
    response?.id;
  if (!rawId) return undefined;
  const id = String(rawId).trim();
  return id || undefined;
};

export function usePlannerSwapActions({
  plan,
  planId,
  isReadOnlyPlannerView,
  swapPick,
  setSwapPick,
  t,
  confirm,
  loadPlan,
  applyPlanMutation,
  buildDayPatches,
  applyLocalItemPatches,
}: UsePlannerSwapActionsParams) {
  const normalizeSwapBackendMessage = useCallback(
    (message: string): string => {
      const raw = String(message || "").trim();
      if (!raw) {
        return t("planner.swapInvalidTimeData", {
          defaultValue:
            "Không thể đổi thứ tự do dữ liệu thời gian chưa hợp lệ.",
        });
      }

      const invalidArrival = raw.match(
        /Invalid arrival time suggested:\s*([0-9:]+),\s*departure\s*([0-9:]+),\s*travel\s*(\d+)m,\s*suggested\s*([0-9:]+)/i,
      );

      if (invalidArrival) {
        const arrival = toDisplayHHmm(invalidArrival[1]);
        const departure = toDisplayHHmm(invalidArrival[2]);
        const travel = invalidArrival[3];
        const suggested = toDisplayHHmm(invalidArrival[4]);

        return t("planner.swapInvalidArrivalTemplate", {
          arrival,
          departure,
          travel,
          suggested,
          defaultValue:
            "Lộ trình sau khi đổi chưa hợp lệ: giờ đến {{arrival}} không khớp với điểm trước (rời {{departure}}, di chuyển {{travel}} phút). Hệ thống gợi ý tối thiểu {{suggested}}.",
        });
      }

      if (/Item A ID|Item B ID/i.test(raw)) {
        return t("planner.swapMissingPair", {
          defaultValue:
            "Không xác định được 2 điểm cần đổi chỗ. Vui lòng chọn lại rồi thử lại.",
        });
      }

      if (/Dữ liệu không hợp lệ/i.test(raw)) {
        return t("planner.swapInvalidRouteData", {
          defaultValue:
            "Không thể đổi thứ tự vì dữ liệu lộ trình chưa hợp lệ. Vui lòng thử lại.",
        });
      }

      return raw;
    },
    [t],
  );

  const getSwapValidationMessage = useCallback(
    (error: any, fallback: string): string => {
      const details = error?.response?.data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        const messages = details
          .map((detail: any) => {
            if (typeof detail === "string") return detail;
            return detail?.message || detail?.msg || "";
          })
          .filter(Boolean);

        if (messages.length > 0) {
          return messages.map(normalizeSwapBackendMessage).join(". ");
        }
      }

      const extracted = extractApiErrorMessage(error, fallback);
      return normalizeSwapBackendMessage(extracted);
    },
    [normalizeSwapBackendMessage],
  );

  const executeCrossDaySwap = useCallback(
    async (
      dayKeyA: string,
      itemIdA: string,
      dayKeyB: string,
      itemIdB: string,
    ) => {
      if (!plan) return;

      const confirmed = await confirm({
        type: "info",
        iconName: "swap-horizontal-outline",
        title: t("planner.swapCrossDayTitle", {
          defaultValue: "Đổi chỗ khác ngày",
        }),
        message: t("planner.swapCrossDayMessage", {
          defaultValue:
            "Bạn đang đổi 2 điểm ở 2 ngày khác nhau. Hệ thống sẽ tính lại giờ theo lộ trình mới.",
        }),
        confirmText: t("planner.swapConfirm", {
          defaultValue: "Đổi chỗ",
        }),
        cancelText: t("common.cancel", { defaultValue: "Hủy" }),
      });

      if (!confirmed) return;

      try {
        const dayAItems = sortPlanDayItems(plan.items_by_day?.[dayKeyA] || []);
        const dayBItems = sortPlanDayItems(plan.items_by_day?.[dayKeyB] || []);
        const indexA = dayAItems.findIndex((i) => i.id === itemIdA);
        const indexB = dayBItems.findIndex((i) => i.id === itemIdB);

        if (indexA < 0 || indexB < 0) {
          throw new Error(
            t("planner.swapItemNotFound", {
              defaultValue: "Không tìm thấy điểm cần đổi",
            }),
          );
        }

        const nextDayA = [...dayAItems];
        const nextDayB = [...dayBItems];
        const pickedA = nextDayA[indexA];
        const pickedB = nextDayB[indexB];

        nextDayA[indexA] = {
          ...pickedB,
          day_number: Number(dayKeyA),
          leg_number: Number(dayKeyA),
        };
        nextDayB[indexB] = {
          ...pickedA,
          day_number: Number(dayKeyB),
          leg_number: Number(dayKeyB),
        };

        const siteCache: Record<
          string,
          { latitude: number; longitude: number; name?: string }
        > = {};

        const dayItemsByNumber: Record<number, PlanItem[]> = {
          [Number(dayKeyA)]: nextDayA,
          [Number(dayKeyB)]: nextDayB,
        };
        const dayAnchorByNumber: Record<number, string> = {
          [Number(dayKeyA)]: toHHmm(dayAItems[0]?.estimated_time),
          [Number(dayKeyB)]: toHHmm(dayBItems[0]?.estimated_time),
        };

        const affectedDayNumbers = Array.from(
          new Set([Number(dayKeyA), Number(dayKeyB)]),
        ).sort((a, b) => a - b);

        const patchesByDayNumber: Record<number, PlannerItemPatch[]> = {};

        for (const dayNumber of affectedDayNumbers) {
          let earliestStartTime: string | undefined;
          const previousDayNumber = dayNumber - 1;

          const previousDayPatches = patchesByDayNumber[previousDayNumber];
          if (previousDayPatches?.length) {
            const previousLastPatch =
              previousDayPatches[previousDayPatches.length - 1];
            const previousDayItems = dayItemsByNumber[previousDayNumber] || [];
            const previousLastItem = previousDayItems.find(
              (item) => item.id === previousLastPatch.id,
            );
            const previousRest = parseDurationToMinutes(
              previousLastItem?.rest_duration,
            );
            const safePreviousRest = previousRest > 0 ? previousRest : 120;
            earliestStartTime = vietmapService.calculateArrivalTime(
              previousLastPatch.estimated_time,
              safePreviousRest,
            ).time;
          } else {
            const previousPlanDayItems = sortPlanDayItems(
              plan.items_by_day?.[String(previousDayNumber)] || [],
            );
            const previousLastItem =
              previousPlanDayItems[previousPlanDayItems.length - 1];
            if (previousLastItem?.estimated_time) {
              const previousRest = parseDurationToMinutes(
                previousLastItem.rest_duration,
              );
              const safePreviousRest = previousRest > 0 ? previousRest : 120;
              earliestStartTime = vietmapService.calculateArrivalTime(
                toHHmm(previousLastItem.estimated_time),
                safePreviousRest,
              ).time;
            }
          }

          patchesByDayNumber[dayNumber] = await buildDayPatches(
            dayItemsByNumber[dayNumber],
            dayNumber,
            dayAnchorByNumber[dayNumber],
            siteCache,
            earliestStartTime,
          );
        }

        const patchesDayA = patchesByDayNumber[Number(dayKeyA)] || [];
        const patchesDayB = patchesByDayNumber[Number(dayKeyB)] || [];

        const allPatches = [...patchesDayA, ...patchesDayB];
        const affectedDays = [
          {
            leg_number: Number(dayKeyA),
            items: patchesDayA.map((patch) => ({
              id: patch.id,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            })),
          },
          {
            leg_number: Number(dayKeyB),
            items: patchesDayB.map((patch) => ({
              id: patch.id,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            })),
          },
        ];

        const isOnline = await networkService.checkConnection();

        if (!isOnline) {
          for (const patch of allPatches) {
            await networkService.addToOfflineQueue({
              endpoint: `/api/planners/${planId}/items/${patch.id}`,
              method: "PATCH",
              data: {
                day_number: patch.day_number,
                leg_number: patch.day_number,
                order_index: patch.order_index,
                estimated_time: patch.estimated_time,
                travel_time_minutes: patch.travel_time_minutes,
                planner_item_id: patch.id,
              },
            });
          }

          await applyPlanMutation((currentPlan) =>
            applyLocalItemPatches(currentPlan, allPatches),
          );

          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("offline.changesSavedOffline"),
          });
          return;
        }

        try {
          const swapPayload = {
            item_id_a: itemIdA,
            item_id_b: itemIdB,
            affected_days: affectedDays,
          };

          if (__DEV__) {
            console.log(
              "[Swap][CrossDay] payload:",
              JSON.stringify(swapPayload),
            );
          }

          const swapResponse = await pilgrimPlannerApi.swapPlannerItems(
            planId,
            swapPayload,
          );

          if (!swapResponse.success) {
            throw new Error(
              swapResponse.message ||
                t("planner.swapApiFailed", {
                  defaultValue: "Không thể đổi thứ tự bằng API swap",
                }),
            );
          }
        } catch (swapError: any) {
          if (!shouldFallbackLegacySwap(swapError)) {
            throw swapError;
          }

          const originalDayByItemId = new Map<string, number>();
          Object.entries(plan.items_by_day || {}).forEach(
            ([dayKey, dayItems]) => {
              const normalizedDay = Number(dayKey);
              if (!Number.isFinite(normalizedDay) || normalizedDay < 1) return;
              (dayItems || []).forEach((item) => {
                if (!item?.id) return;
                originalDayByItemId.set(item.id, normalizedDay);
              });
            },
          );

          for (const patch of allPatches) {
            const originalItem = Object.values(plan.items_by_day || {})
              .flat()
              .find((item) => item.id === patch.id);
            const originalDayNumber = Number(
              originalDayByItemId.get(patch.id) ??
                originalItem?.leg_number ??
                originalItem?.day_number ??
                0,
            );
            const shouldMoveAcrossDay =
              !!originalItem &&
              originalDayNumber > 0 &&
              patch.day_number > 0 &&
              patch.day_number !== originalDayNumber;

            if (shouldMoveAcrossDay) {
              const moveSiteId = originalItem?.site_id || originalItem?.site?.id;
              if (!moveSiteId) {
                throw new Error(
                  t("planner.reloadEtaMoveFallbackMissingSite", {
                    defaultValue:
                      "Không thể đồng bộ vì thiếu thông tin địa điểm để chuyển ngày.",
                  }),
                );
              }

              const moveCreateResponse = await pilgrimPlannerApi.addPlanItem(
                planId,
                {
                  site_id: String(moveSiteId),
                  leg_number: patch.day_number,
                  event_id: originalItem?.event_id || undefined,
                  note: originalItem?.note || undefined,
                  estimated_time: patch.estimated_time,
                  rest_duration: originalItem?.rest_duration || undefined,
                  travel_time_minutes: patch.travel_time_minutes,
                },
              );

              const movedItemId = extractCreatedItemId(moveCreateResponse);

              if (
                !moveCreateResponse?.success ||
                !movedItemId
              ) {
                throw new Error(
                  moveCreateResponse?.message ||
                    t("planner.reloadEtaMoveFallbackCreateFailed", {
                      defaultValue:
                        "Không thể tạo điểm mới khi đồng bộ chuyển ngày.",
                    }),
                );
              }

              const movePatchResponse = await pilgrimPlannerApi.updatePlanItem(
                planId,
                movedItemId,
                {
                  day_number: patch.day_number,
                  leg_number: patch.day_number,
                  order_index: patch.order_index,
                  estimated_time: patch.estimated_time,
                  travel_time_minutes: patch.travel_time_minutes,
                  note: originalItem?.note || undefined,
                  rest_duration: originalItem?.rest_duration || undefined,
                },
              );

              if (!movePatchResponse?.success) {
                throw new Error(
                  movePatchResponse?.message ||
                    t("planner.reloadEtaMoveFallbackPatchFailed", {
                      defaultValue:
                        "Không thể cập nhật giờ dự kiến cho điểm vừa chuyển ngày.",
                    }),
                );
              }

              const deleteMovedOldResponse = await pilgrimPlannerApi.deletePlanItem(
                planId,
                patch.id,
              );

              if (!deleteMovedOldResponse?.success) {
                throw new Error(
                  deleteMovedOldResponse?.message ||
                    t("planner.reloadEtaMoveFallbackDeleteFailed", {
                      defaultValue:
                        "Không thể xóa điểm cũ sau khi chuyển ngày. Vui lòng thử lại.",
                    }),
                );
              }

              continue;
            }

            const updateResponse = await pilgrimPlannerApi.updatePlanItem(
              planId,
              patch.id,
              {
                day_number: patch.day_number,
                leg_number: patch.day_number,
                order_index: patch.order_index,
                estimated_time: patch.estimated_time,
                travel_time_minutes: patch.travel_time_minutes,
              },
            );

            if (!updateResponse?.success) {
              throw new Error(
                updateResponse?.message ||
                  t("planner.reloadEtaUpdateFailed", {
                    defaultValue: "Không thể cập nhật ETA cho điểm hành hương.",
                  }),
              );
            }
          }
        }

        await applyPlanMutation((currentPlan) =>
          applyLocalItemPatches(currentPlan, allPatches),
        );

        Toast.show({
          type: "success",
          text1: t("planner.swapSuccessTitle", {
            defaultValue: "Đã đổi thứ tự",
          }),
          text2: t("planner.swapSuccessCrossDayBody", {
            defaultValue: "Đã cập nhật lịch trình cho cả 2 ngày.",
          }),
        });
        void loadPlan({ silent: true });
      } catch (error: any) {
        console.log("Cross-day swap error:", error);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: getSwapValidationMessage(
            error,
            t("planner.swapCrossDayFailed", {
              defaultValue: "Không thể đổi thứ tự khác ngày",
            }),
          ),
        });
      }
    },
    [
      applyLocalItemPatches,
      applyPlanMutation,
      buildDayPatches,
      confirm,
      getSwapValidationMessage,
      loadPlan,
      plan,
      planId,
      t,
    ],
  );

  const executeSameDaySwap = useCallback(
    async (dayKey: string, itemIdA: string, itemIdB: string) => {
      if (!plan) return;

      const confirmed = await confirm({
        type: "info",
        iconName: "swap-horizontal-outline",
        title: t("planner.swapSameDayTitle", {
          defaultValue: "Đổi thứ tự trong ngày",
        }),
        message: t("planner.swapSameDayMessage", {
          defaultValue:
            "Bạn đang đổi 2 điểm trong cùng ngày. Hệ thống sẽ tính lại giờ theo lộ trình mới.",
        }),
        confirmText: t("planner.swapConfirm", {
          defaultValue: "Đổi chỗ",
        }),
        cancelText: t("common.cancel", { defaultValue: "Hủy" }),
      });

      if (!confirmed) return;

      try {
        const dayItems = sortPlanDayItems(plan.items_by_day?.[dayKey] || []);
        const indexA = dayItems.findIndex((i) => i.id === itemIdA);
        const indexB = dayItems.findIndex((i) => i.id === itemIdB);

        if (indexA < 0 || indexB < 0) {
          throw new Error(
            t("planner.swapItemNotFound", {
              defaultValue: "Không tìm thấy điểm cần đổi",
            }),
          );
        }

        const swapped = [...dayItems];
        [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];

        const dayNumber = Number(dayKey);
        const anchorTime = toHHmm(dayItems[0]?.estimated_time);
        const siteCache: Record<
          string,
          { latitude: number; longitude: number; name?: string }
        > = {};

        let earliestStartTime: string | undefined;
        const previousDayItems = sortPlanDayItems(
          plan.items_by_day?.[String(dayNumber - 1)] || [],
        );
        const previousLastItem = previousDayItems[previousDayItems.length - 1];
        if (previousLastItem?.estimated_time) {
          const previousRest = parseDurationToMinutes(
            previousLastItem.rest_duration,
          );
          const safePreviousRest = previousRest > 0 ? previousRest : 120;
          earliestStartTime = vietmapService.calculateArrivalTime(
            toHHmm(previousLastItem.estimated_time),
            safePreviousRest,
          ).time;
        }

        const patches = await buildDayPatches(
          swapped,
          dayNumber,
          anchorTime,
          siteCache,
          earliestStartTime,
        );

        const affectedDays = [
          {
            leg_number: dayNumber,
            items: patches.map((patch) => ({
              id: patch.id,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            })),
          },
        ];

        const isOnline = await networkService.checkConnection();

        if (!isOnline) {
          for (const patch of patches) {
            await networkService.addToOfflineQueue({
              endpoint: `/api/planners/${planId}/items/${patch.id}`,
              method: "PATCH",
              data: {
                day_number: patch.day_number,
                order_index: patch.order_index,
                estimated_time: patch.estimated_time,
                travel_time_minutes: patch.travel_time_minutes,
              },
            });
          }

          await applyPlanMutation((currentPlan) =>
            applyLocalItemPatches(currentPlan, patches),
          );

          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("offline.changesSavedOffline"),
          });
          return;
        }

        try {
          const swapPayload = {
            item_id_a: itemIdA,
            item_id_b: itemIdB,
            affected_days: affectedDays,
          };

          if (__DEV__) {
            console.log(
              "[Swap][SameDay][Confirm] payload:",
              JSON.stringify(swapPayload),
            );
          }

          const swapResponse = await pilgrimPlannerApi.swapPlannerItems(
            planId,
            swapPayload,
          );

          if (!swapResponse.success) {
            throw new Error(
              swapResponse.message ||
                t("planner.swapApiFailed", {
                  defaultValue: "Không thể đổi thứ tự bằng API swap",
                }),
            );
          }
        } catch (swapError: any) {
          if (!shouldFallbackLegacySwap(swapError)) {
            throw swapError;
          }

          for (const patch of patches) {
            await pilgrimPlannerApi.updatePlanItem(planId, patch.id, {
              day_number: patch.day_number,
              order_index: patch.order_index,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            });
          }
        }

        await applyPlanMutation((currentPlan) =>
          applyLocalItemPatches(currentPlan, patches),
        );

        Toast.show({
          type: "success",
          text1: t("planner.swapSuccessTitle", {
            defaultValue: "Đã đổi thứ tự",
          }),
          text2: t("planner.swapSuccessSameDayBody", {
            defaultValue: "Thời gian đã được tính lại theo lộ trình mới.",
          }),
        });
        void loadPlan({ silent: true });
      } catch (error: any) {
        console.log("Same-day swap error:", error);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: getSwapValidationMessage(
            error,
            t("planner.swapSameDayFailed", {
              defaultValue: "Không thể đổi thứ tự",
            }),
          ),
        });
      }
    },
    [
      applyLocalItemPatches,
      applyPlanMutation,
      buildDayPatches,
      confirm,
      getSwapValidationMessage,
      loadPlan,
      plan,
      planId,
      t,
    ],
  );

  const handleReorderIconPress = useCallback(
    (dayKey: string, item: PlanItem) => {
      if (!plan || isReadOnlyPlannerView) return;
      
      // Check if plan is completed
      if (plan.status === 'completed') {
        void confirm({
          iconName: "checkmark-circle",
          title: t("planner.completedPlanTitle"),
          message: t("planner.completedPlanCannotSwap"),
          confirmText: t("planner.understood"),
          showCancel: false,
        });
        return;
      }
      
      const id = item.id;
      if (!id) return;

      if (!swapPick) {
        setSwapPick({ dayKey, itemId: id });
        return;
      }
      if (swapPick.itemId === id) {
        setSwapPick(null);
        return;
      }

      if (swapPick.dayKey !== dayKey) {
        const firstPick = swapPick;
        setSwapPick(null);
        void executeCrossDaySwap(
          firstPick.dayKey,
          firstPick.itemId,
          dayKey,
          id,
        );
        return;
      }

      const firstPick = swapPick;
      void executeSameDaySwap(firstPick.dayKey, firstPick.itemId, id);
      setSwapPick(null);
    },
    [
      executeCrossDaySwap,
      executeSameDaySwap,
      isReadOnlyPlannerView,
      plan,
      setSwapPick,
      swapPick,
    ],
  );

  return {
    handleReorderIconPress,
  };
}
