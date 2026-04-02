import { useCallback } from "react";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import {
  AddPlanItemRequest,
  UpdatePlanItemRequest,
} from "../../../../types/pilgrim/planner.types";

export const useItineraryActions = (planId: string, onDone?: () => Promise<void> | void) => {
  const addItem = useCallback(
    async (payload: AddPlanItemRequest) => {
      const response = await pilgrimPlannerApi.addPlanItem(planId, payload);
      if (!response.success) {
        throw new Error(response.message || "Không thể thêm điểm đến");
      }
      await onDone?.();
      return response.data;
    },
    [planId, onDone],
  );

  const updateItem = useCallback(
    async (itemId: string, payload: UpdatePlanItemRequest) => {
      const response = await pilgrimPlannerApi.updatePlanItem(planId, itemId, payload);
      if (!response.success) {
        throw new Error(response.message || "Không thể cập nhật điểm đến");
      }
      await onDone?.();
      return response.data;
    },
    [planId, onDone],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const response = await pilgrimPlannerApi.deletePlanItem(planId, itemId);
      if (!response.success) {
        throw new Error(response.message || "Không thể xóa điểm đến");
      }
      await onDone?.();
    },
    [planId, onDone],
  );

  return { addItem, updateItem, deleteItem };
};
