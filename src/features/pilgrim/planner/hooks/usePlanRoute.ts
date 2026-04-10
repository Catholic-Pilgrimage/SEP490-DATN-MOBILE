import { useEffect, useState } from "react";
import type { LngLat, RoutePoint } from "../../../../services/map/vietmapService";
import vietmapService from "../../../../services/map/vietmapService";
import type { PlanEntity } from "../../../../types/pilgrim/planner.types";

interface PlanRouteResult {
  routeCoordinates: LngLat[];
  routeSegments: { coordinates: LngLat[]; color?: string }[];
  routeSummary: string;
  routeLoading: boolean;
}

const DAY_ROUTE_COLORS = [
  "#E74C3C", "#3498DB", "#2ECC71", "#F39C12",
  "#9B59B6", "#1ABC9C", "#E67E22", "#E91E63",
];

/**
 * Hook that calculates a multi-point route for all items in a plan.
 * Runs once when plan items become available and the device is online.
 */
export const usePlanRoute = (
  plan: PlanEntity | null,
  isOffline: boolean,
): PlanRouteResult => {
  const [routeCoordinates, setRouteCoordinates] = useState<LngLat[]>([]);
  const [routeSegments, setRouteSegments] = useState<{ coordinates: LngLat[]; color?: string }[]>([]);
  const [routeSummary, setRouteSummary] = useState<string>("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [hasCalcRoute, setHasCalcRoute] = useState(false);

  useEffect(() => {
    if (hasCalcRoute || !plan?.items_by_day || isOffline) return;

    const calculatePlanRoute = async () => {
      // Collect all waypoints ordered by day then by leg_number/order
      const waypoints: RoutePoint[] = [];
      const dayKeys = Object.keys(plan.items_by_day!)
        .map(Number)
        .sort((a, b) => a - b);

      for (const dayKey of dayKeys) {
        const dayItems = plan.items_by_day![String(dayKey)] || [];
        const sorted = [...dayItems].sort(
          (a, b) => (a.leg_number || 0) - (b.leg_number || 0),
        );
        for (const item of sorted) {
          const lat = Number(item.site?.latitude);
          const lng = Number(item.site?.longitude);
          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            const prev = waypoints[waypoints.length - 1];
            if (!prev || prev.latitude !== lat || prev.longitude !== lng) {
              waypoints.push({ latitude: lat, longitude: lng });
            }
          }
        }
      }

      if (waypoints.length < 2) {
        setRouteCoordinates([]);
        setRouteSegments([]);
        setRouteSummary("");
        return;
      }

      try {
        setRouteLoading(true);
        const result = await vietmapService.calculateMultiPointRoute(waypoints);

        if (result.allCoordinates.length >= 2) {
          setRouteCoordinates(result.allCoordinates);

          const segs = result.segments.map((seg, idx) => ({
            coordinates: seg.route.coordinates,
            color: DAY_ROUTE_COLORS[idx % DAY_ROUTE_COLORS.length],
          }));
          setRouteSegments(segs);

          const totalKm = result.totalDistanceKm;
          const totalMin = result.totalDurationMinutes;
          const distText = totalKm < 1
            ? `${Math.round(totalKm * 1000)} m`
            : `${totalKm.toFixed(1)} km`;
          let timeText: string;
          if (totalMin < 60) {
            timeText = `${totalMin} phút`;
          } else {
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            timeText = m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
          }
          setRouteSummary(
            `Tổng: ${distText} • ${timeText} • ${waypoints.length} điểm dừng`,
          );
        }
      } catch (err) {
        console.log("Route calculation failed:", err);
        setRouteSummary("");
      } finally {
        setRouteLoading(false);
        setHasCalcRoute(true);
      }
    };

    calculatePlanRoute();
  }, [hasCalcRoute, plan?.items_by_day, isOffline]);

  return { routeCoordinates, routeSegments, routeSummary, routeLoading };
};
