import { useState } from "react";
import Toast from "react-native-toast-message";
import type { PlanEntity, PlanItem } from "../../../../types/pilgrim/planner.types";
import type { SiteNearbyPlace } from "../../../../types/pilgrim/site.types";
import type { NearbyPlaceCategory } from "../../../../types/common.types";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import networkService from "../../../../services/network/networkService";
import offlinePlannerService from "../../../../services/offline/offlinePlannerService";
import { applyLocalItemUpdate } from "../utils/planDetailLocalPlan.utils";
import { mapOfflineNearbyPlace } from "../utils/planDetailLocalPlan.utils";

interface UseNearbyPlacesProps {
  planId: string;
  t: (key: string, opts?: any) => string;
  applyPlanMutation: (
    optimisticUpdate: (plan: PlanEntity) => PlanEntity,
    offlineAction?: () => Promise<PlanEntity | null>,
  ) => Promise<PlanEntity | null>;
  loadPlan: () => Promise<void>;
  setSelectedItem: React.Dispatch<React.SetStateAction<PlanItem | null>>;
}

export const useNearbyPlaces = ({
  planId,
  t,
  applyPlanMutation,
  loadPlan,
  setSelectedItem,
}: UseNearbyPlacesProps) => {
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<SiteNearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyCategory, setNearbyCategory] = useState<NearbyPlaceCategory | "all">("all");
  const [nearbySiteName, setNearbySiteName] = useState("");
  const [nearbyContextItem, setNearbyContextItem] = useState<PlanItem | null>(null);
  const [savingNearbyPlaceId, setSavingNearbyPlaceId] = useState<string | null>(null);
  const [savedNearbyPlaceIds, setSavedNearbyPlaceIds] = useState<Set<string>>(new Set());

  const handleLoadNearbyPlaces = async (item: PlanItem) => {
    if (!item.site_id && !item.site?.id) return;
    setNearbyContextItem(item);
    setNearbySiteName(item.site?.name || "");
    setNearbyCategory("all");
    setNearbyPlaces([]);
    setSavedNearbyPlaceIds(new Set(item.nearby_amenity_ids || [])); // pre-mark already saved places
    setShowNearbyModal(true);
    
    try {
      setLoadingNearby(true);
      const siteId = item.site_id || item.site?.id || "";
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        const offlineData = await offlinePlannerService.getPlannerData(planId);
        const offlinePlaces = (offlineData?.nearby_places || [])
          .filter((place) => place.site_id === siteId)
          .map(mapOfflineNearbyPlace);
        setNearbyPlaces(offlinePlaces);
        return;
      }

      const response = await pilgrimSiteApi.getSiteNearbyPlaces(siteId);
      if (response.success && response.data?.data) {
        setNearbyPlaces(response.data.data);
      }
    } catch (error) {
      console.log("Load nearby places error:", error);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSaveNearbyPlace = async (place: SiteNearbyPlace) => {
    if (!nearbyContextItem) return;
    // Lấy danh sách UUID hiện tại, thêm UUID mới vào (tránh trùng)
    const existingIds: string[] = nearbyContextItem.nearby_amenity_ids || [];
    if (existingIds.includes(place.id)) {
      // Đã lưu rồi, chỉ mark UI
      setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
      return;
    }
    try {
      setSavingNearbyPlaceId(place.id);
      const newIds = [...existingIds, place.id];
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items/${nearbyContextItem.id}`,
          method: "PUT",
          data: {
            planner_item_id: nearbyContextItem.id,
            nearby_amenity_ids: newIds,
          },
        });

        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, nearbyContextItem.id, {
              nearby_amenity_ids: newIds,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(
              planId,
              nearbyContextItem.id,
              {
                nearby_amenity_ids: newIds,
              },
            ),
        );

        setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
        setNearbyContextItem((prev) =>
          prev ? { ...prev, nearby_amenity_ids: newIds } : prev,
        );
        setSelectedItem((prev) =>
          prev && prev.id === nearbyContextItem.id
            ? { ...prev, nearby_amenity_ids: newIds }
            : prev,
        );
        return;
      }

      const response = await pilgrimPlannerApi.updatePlanItem(
        planId,
        nearbyContextItem.id,
        {
          nearby_amenity_ids: newIds,
        },
      );
      if (response.success) {
        // Mark as saved — keep modal open so user can save more places
        setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
        // Update contextItem so next save chains correctly
        setNearbyContextItem((prev) =>
          prev ? { ...prev, nearby_amenity_ids: newIds } : prev,
        );
        // Also update selectedItem so reopening the nearby modal shows correct saved state
        setSelectedItem((prev) =>
          prev && prev.id === nearbyContextItem.id
            ? { ...prev, nearby_amenity_ids: newIds }
            : prev,
        );
        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, nearbyContextItem.id, {
              nearby_amenity_ids: newIds,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(
              planId,
              nearbyContextItem.id,
              {
                nearby_amenity_ids: newIds,
              },
            ),
        );
        void loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || t("planner.cannotSavePlace"),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("planner.cannotSavePlace"),
      });
    } finally {
      setSavingNearbyPlaceId(null);
    }
  };

  return {
    showNearbyModal,
    setShowNearbyModal,
    nearbyPlaces,
    loadingNearby,
    nearbyCategory,
    setNearbyCategory,
    nearbySiteName,
    savingNearbyPlaceId,
    savedNearbyPlaceIds,
    handleLoadNearbyPlaces,
    handleSaveNearbyPlace,
  };
};
