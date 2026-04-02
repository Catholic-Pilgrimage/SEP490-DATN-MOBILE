import { MapPin } from "../../../../components/map/VietmapView";
import { PlanEntity } from "../../../../types/pilgrim/planner.types";

const DAY_PIN_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#E91E63",
  "#00BCD4",
  "#8BC34A",
];

const DAY_PIN_ICONS = ["📍", "📍", "📍", "📍", "📍", "📍", "📍", "📍", "📍", "📍"];

export function buildPlanMapPins(plan: PlanEntity | null): MapPin[] {
  if (!plan?.items_by_day) return [];

  const pins: MapPin[] = [];
  const seenSiteIds = new Set<string>();

  Object.entries(plan.items_by_day).forEach(([dayKey, items]) => {
    const dayIndex = parseInt(dayKey, 10) - 1;
    const pinColor = DAY_PIN_COLORS[dayIndex % DAY_PIN_COLORS.length];
    const pinIcon = DAY_PIN_ICONS[dayIndex % DAY_PIN_ICONS.length];

    items.forEach((item, index) => {
      const siteId = item.site_id || item.site?.id || "";
      if (
        item.site &&
        item.site.latitude &&
        item.site.longitude &&
        !seenSiteIds.has(siteId)
      ) {
        if (siteId) seenSiteIds.add(siteId);
        pins.push({
          id: item.id || `pin_${dayKey}_${index}`,
          latitude: Number(item.site.latitude),
          longitude: Number(item.site.longitude),
          title: item.site.name,
          subtitle: `Ngày ${dayKey}${item.site.address ? " • " + item.site.address : ""}`,
          icon: pinIcon,
          color: pinColor,
        });
      }
    });
  });

  return pins;
}

export function getPlanMapCenter(mapPins: MapPin[]) {
  if (mapPins.length === 0) {
    return { latitude: 10.762622, longitude: 106.660172, zoom: 6 };
  }
  if (mapPins.length === 1) {
    return {
      latitude: mapPins[0].latitude,
      longitude: mapPins[0].longitude,
      zoom: 13,
    };
  }

  const lats = mapPins.map((p) => p.latitude);
  const lngs = mapPins.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const maxDiff = Math.max(maxLat - minLat, maxLng - minLng);

  let zoom = 12;
  if (maxDiff > 5) zoom = 4;
  else if (maxDiff > 3) zoom = 5;
  else if (maxDiff > 1.5) zoom = 6;
  else if (maxDiff > 1) zoom = 7;
  else if (maxDiff > 0.5) zoom = 8;
  else if (maxDiff > 0.2) zoom = 9;
  else if (maxDiff > 0.1) zoom = 10;
  else if (maxDiff > 0.05) zoom = 11;
  else if (maxDiff > 0.02) zoom = 12;
  else zoom = 13;

  return { latitude: centerLat, longitude: centerLng, zoom };
}

/**
 * Số người đã trong đoàn (thực tế), không phải `number_of_people` (quota khi tạo kế hoạch).
 * Ưu tiên danh sách `plan.members` (id user); nếu chưa có thì dùng `companion_count` nếu BE gửi.
 */
export function getPlannerRosterCount(plan: PlanEntity | null): number {
  if (!plan) return 1;
  const ownerId = String(plan.user_id ?? plan.owner?.id ?? "").trim();
  const ids = new Set<string>();
  if (ownerId) ids.add(ownerId);

  const rows = Array.isArray((plan as { members?: unknown }).members)
    ? ((plan as { members?: Array<{ id?: string; user_id?: string }> })
        .members ?? [])
    : [];

  for (const m of rows) {
    const id = String(m?.id ?? m?.user_id ?? "").trim();
    if (id) ids.add(id);
  }

  if (rows.length > 0) {
    return Math.max(1, ids.size);
  }

  const cc = (plan as { companion_count?: number }).companion_count;
  if (typeof cc === "number" && cc >= 0) {
    return Math.max(1, 1 + cc);
  }

  return 1;
}
