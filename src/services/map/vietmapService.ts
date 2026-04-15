/**
 * Vietmap Service
 * Handles routing and geocoding with Vietmap API
 */

import { VIETMAP_CONFIG } from '../../config/map.config';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  duration: number; // seconds
  distance: number; // meters
  durationMinutes: number; // converted to minutes
  durationText: string; // human readable (e.g., "45 phút", "1 giờ 30 phút")
  distanceKm: number; // converted to kilometers
}

/** GeoJSON-ready coordinate: [longitude, latitude] */
export type LngLat = [number, number];

export interface RouteResultWithGeometry extends RouteResult {
  /** Ordered coordinates [lng, lat] for drawing on map */
  coordinates: LngLat[];
}

export interface RouteSegment {
  from: RoutePoint;
  to: RoutePoint;
  route: RouteResultWithGeometry;
}

export interface MultiPointRouteResult {
  segments: RouteSegment[];
  totalDurationMinutes: number;
  totalDistanceKm: number;
  /** All coordinates merged (in order) for a single continuous polyline */
  allCoordinates: LngLat[];
}

export type RouteTransportMode = "car" | "motorbike" | "bus";

const API_VEHICLE_BY_MODE: Record<RouteTransportMode, string> = {
  car: "car",
  motorbike: "bike",
  // Vietmap does not provide a dedicated bus profile in all tiers.
  // Keep API compatibility with car profile, then adjust ETA by mode.
  bus: "car",
};

const DURATION_MULTIPLIER_BY_MODE: Record<RouteTransportMode, number> = {
  car: 1,
  motorbike: 0.9,
  bus: 1.35,
};

const FALLBACK_SPEED_KMH_BY_MODE: Record<RouteTransportMode, number> = {
  car: 38,
  motorbike: 32,
  bus: 24,
};

const toDurationText = (durationMinutes: number): string => {
  if (durationMinutes < 60) return `${durationMinutes} phút`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
};

const haversineKm = (from: RoutePoint, to: RoutePoint): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const normalizeTransportMode = (
  transportation?: string | null,
): RouteTransportMode => {
  const raw = String(transportation || "")
    .trim()
    .toLowerCase();

  if (
    raw === "motorbike" ||
    raw === "motorcycle" ||
    raw === "bike" ||
    raw === "xe may" ||
    raw === "xe máy"
  ) {
    return "motorbike";
  }

  if (raw === "bus" || raw === "xe buyt" || raw === "xe buýt") {
    return "bus";
  }

  return "car";
};

const adjustDurationMinutesByMode = (
  durationMinutes: number,
  mode: RouteTransportMode,
): number => {
  const multiplier = DURATION_MULTIPLIER_BY_MODE[mode] ?? 1;
  return Math.max(1, Math.round(durationMinutes * multiplier));
};

const buildRoutingUrl = (
  from: RoutePoint,
  to: RoutePoint,
  mode: RouteTransportMode,
): string => {
  const vehicle = API_VEHICLE_BY_MODE[mode] || "car";
  return `${VIETMAP_CONFIG.ROUTING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&point=${from.latitude},${from.longitude}&point=${to.latitude},${to.longitude}&vehicle=${vehicle}&points_encoded=false`;
};

const buildFallbackRoute = (
  from: RoutePoint,
  to: RoutePoint,
  mode: RouteTransportMode,
): RouteResult => {
  const distanceKm = haversineKm(from, to);
  const distance = Math.max(1, Math.round(distanceKm * 1000));
  const speed = FALLBACK_SPEED_KMH_BY_MODE[mode] || FALLBACK_SPEED_KMH_BY_MODE.car;
  const durationMinutes = Math.max(1, Math.round((distanceKm / speed) * 60));
  const duration = durationMinutes * 60;

  return {
    duration,
    distance,
    durationMinutes,
    durationText: toDurationText(durationMinutes),
    distanceKm,
  };
};

const readRoutingPayload = async (response: Response): Promise<any> => {
  const raw = await response.text();
  if (!raw || raw.trim().length === 0) {
    throw new Error('Dữ liệu lộ trình rỗng');
  }

  const trimmed = raw.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    throw new Error('Dịch vụ bản đồ tạm thời không phản hồi đúng định dạng');
  }

  let data: any;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error('Dịch vụ bản đồ trả về dữ liệu không hợp lệ');
  }

  if (!response.ok) {
    const apiMessage =
      data?.message || data?.error?.message || `Lỗi dịch vụ bản đồ (${response.status})`;
    throw new Error(String(apiMessage));
  }

  if (!data?.paths || data.paths.length === 0) {
    throw new Error('Không thể tính toán lộ trình');
  }

  return data;
};

/**
 * Calculate route between two points using Vietmap Routing API
 * @param from Starting point
 * @param to Destination point
 * @returns Route information including duration and distance
 */
export const calculateRoute = async (
  from: RoutePoint,
  to: RoutePoint,
  transportation?: string,
): Promise<RouteResult> => {
  const mode = normalizeTransportMode(transportation);

  try {
    const url = buildRoutingUrl(from, to, mode);

    const response = await fetch(url);
    const data = await readRoutingPayload(response);

    const path = data.paths[0];
    const durationSeconds = path.time / 1000; // convert ms to seconds
    const distance = path.distance; // meters

    const baseDurationMinutes = Math.ceil(durationSeconds / 60);
    const durationMinutes = adjustDurationMinutesByMode(baseDurationMinutes, mode);
    const duration = durationMinutes * 60;
    const distanceKm = distance / 1000;

    const durationText = toDurationText(durationMinutes);

    return {
      duration,
      distance,
      durationMinutes,
      durationText,
      distanceKm,
    };
  } catch {
    // Degrade gracefully so planner flows continue even when routing API is flaky.
    return buildFallbackRoute(from, to, mode);
  }
};

/**
 * Calculate estimated arrival time based on departure time and travel duration
 * @param departureTime Format "HH:MM"
 * @param durationMinutes Travel duration in minutes
 * @returns Object containing the formatted arrival time "HH:MM" and number of days added if it crosses midnight
 */
export const calculateArrivalTime = (
  departureTime: string,
  durationMinutes: number,
): { time: string; daysAdded: number } => {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  const daysAdded = Math.floor(totalMinutes / (24 * 60));
  const arrivalHours = Math.floor(totalMinutes / 60) % 24;
  const arrivalMinutes = totalMinutes % 60;

  return {
    time: `${arrivalHours.toString().padStart(2, '0')}:${arrivalMinutes.toString().padStart(2, '0')}`,
    daysAdded
  };
};

/**
 * Calculate route and return geometry coordinates for map rendering.
 */
export const calculateRouteWithGeometry = async (
  from: RoutePoint,
  to: RoutePoint,
  transportation?: string,
): Promise<RouteResultWithGeometry> => {
  const mode = normalizeTransportMode(transportation);

  try {
    const url = buildRoutingUrl(from, to, mode);

    const response = await fetch(url);
    const data = await readRoutingPayload(response);

    const path = data.paths[0];
    const durationSeconds = path.time / 1000;
    const distance = path.distance;
    const baseDurationMinutes = Math.ceil(durationSeconds / 60);
    const durationMinutes = adjustDurationMinutesByMode(baseDurationMinutes, mode);
    const duration = durationMinutes * 60;
    const distanceKm = distance / 1000;

    const durationText = toDurationText(durationMinutes);

    // Extract geometry coordinates — VietMap returns [[lat, lng], ...] when points_encoded=false
    const rawCoords: number[][] = path.points?.coordinates || [];
    // VietMap coordinates are [lng, lat] already in GeoJSON order
    const coordinates: LngLat[] = rawCoords.map((c: number[]) => [c[0], c[1]] as LngLat);

    return {
      duration,
      distance,
      durationMinutes,
      durationText,
      distanceKm,
      coordinates,
    };
  } catch {
    const fallback = buildFallbackRoute(from, to, mode);
    return {
      ...fallback,
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
    };
  }
};

/**
 * Calculate routes between an ordered list of waypoints.
 * Returns individual segments + a merged polyline for the full trip.
 */
export const calculateMultiPointRoute = async (
  points: RoutePoint[],
  transportation?: string,
): Promise<MultiPointRouteResult> => {
  if (points.length < 2) {
    return {
      segments: [],
      totalDurationMinutes: 0,
      totalDistanceKm: 0,
      allCoordinates: [],
    };
  }

  const segments: RouteSegment[] = [];
  const allCoordinates: LngLat[] = [];
  let totalDurationMinutes = 0;
  let totalDistanceKm = 0;

  // Calculate each leg in parallel for speed
  const promises = [];
  for (let i = 0; i < points.length - 1; i++) {
    promises.push(
      calculateRouteWithGeometry(points[i], points[i + 1], transportation)
        .then((route) => ({ from: points[i], to: points[i + 1], route, index: i }))
        .catch(() => null),
    );
  }

  const results = await Promise.all(promises);

  // Sort by index to maintain order, then merge
  const sorted = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.index - b.index);

  for (const { from, to, route } of sorted) {
    segments.push({ from, to, route });
    totalDurationMinutes += route.durationMinutes;
    totalDistanceKm += route.distanceKm;
    // Avoid duplicating the junction point
    if (allCoordinates.length > 0 && route.coordinates.length > 0) {
      allCoordinates.push(...route.coordinates.slice(1));
    } else {
      allCoordinates.push(...route.coordinates);
    }
  }

  return {
    segments,
    totalDurationMinutes,
    totalDistanceKm,
    allCoordinates,
  };
};

export default {
  calculateRoute,
  calculateArrivalTime,
  calculateRouteWithGeometry,
  calculateMultiPointRoute,
};
