import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin } from "../../../../components/map/VietmapView";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { PlanEntity } from "../../../../types/pilgrim/planner.types";

export const usePlanData = (planId: string) => {
  const [plan, setPlan] = useState<PlanEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      setError(null);
      const response = await pilgrimPlannerApi.getPlanDetail(planId);
      if (response.success && response.data) {
        setPlan(response.data);
      } else {
        setError(response.message || "Không thể tải kế hoạch");
      }
    } catch (e: any) {
      setError(e?.message || "Không thể tải kế hoạch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useEffect(() => {
    setLoading(true);
    void loadPlan();
  }, [loadPlan]);

  const refreshPlan = useCallback(async () => {
    setRefreshing(true);
    await loadPlan();
  }, [loadPlan]);

  const sortedDays = useMemo(() => {
    const totalDays =
      plan?.number_of_days ||
      (plan?.items_by_day ? Object.keys(plan.items_by_day).length : 1);
    return Array.from({ length: totalDays }, (_, i) => String(i + 1));
  }, [plan]);

  const firstItem = useMemo(
    () =>
      sortedDays
        .flatMap((day) => plan?.items_by_day?.[day] || [])
        .find((item) => {
          if (!item?.id) return false;
          const status = String(item.status || "").toLowerCase();
          return status !== "visited" && status !== "skipped";
        }) || null,
    [plan, sortedDays],
  );

  const mapPins: MapPin[] = useMemo(() => {
    if (!plan?.items_by_day) return [];
    const pins: MapPin[] = [];
    const seen = new Set<string>();
    Object.entries(plan.items_by_day).forEach(([dayKey, items]) => {
      items.forEach((item, index) => {
        const siteId = item.site_id || item.site?.id || `${dayKey}_${index}`;
        if (!item.site?.latitude || !item.site?.longitude || seen.has(siteId)) {
          return;
        }
        seen.add(siteId);
        pins.push({
          id: item.id || siteId,
          latitude: Number(item.site.latitude),
          longitude: Number(item.site.longitude),
          title: item.site.name,
          subtitle: `Ngày ${dayKey}`,
          color: "#cfaa3a",
          icon: "📍",
        });
      });
    });
    return pins;
  }, [plan]);

  const mapCenter = useMemo(() => {
    if (!mapPins.length) return { latitude: 10.762622, longitude: 106.660172, zoom: 6 };
    if (mapPins.length === 1) {
      return {
        latitude: mapPins[0].latitude,
        longitude: mapPins[0].longitude,
        zoom: 13,
      };
    }
    const lats = mapPins.map((p) => p.latitude);
    const lngs = mapPins.map((p) => p.longitude);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      zoom: 8,
    };
  }, [mapPins]);

  return {
    plan,
    setPlan,
    loading,
    refreshing,
    error,
    sortedDays,
    firstItem,
    mapPins,
    mapCenter,
    refreshPlan,
  };
};
