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

/**
 * Calculate route between two points using Vietmap Routing API
 * @param from Starting point
 * @param to Destination point
 * @returns Route information including duration and distance
 */
export const calculateRoute = async (
  from: RoutePoint,
  to: RoutePoint,
): Promise<RouteResult> => {
  try {
    const url = `${VIETMAP_CONFIG.ROUTING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&point=${from.latitude},${from.longitude}&point=${to.latitude},${to.longitude}&vehicle=car&points_encoded=false`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.paths || data.paths.length === 0) {
      throw new Error('Không thể tính toán lộ trình');
    }

    const path = data.paths[0];
    const duration = path.time / 1000; // convert ms to seconds
    const distance = path.distance; // meters

    const durationMinutes = Math.ceil(duration / 60);
    const distanceKm = distance / 1000;

    // Format duration text in Vietnamese
    let durationText: string;
    if (durationMinutes < 60) {
      durationText = `${durationMinutes} phút`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        durationText = `${hours} giờ`;
      } else {
        durationText = `${hours} giờ ${minutes} phút`;
      }
    }

    return {
      duration,
      distance,
      durationMinutes,
      durationText,
      distanceKm,
    };
  } catch (error: any) {
    console.error('Calculate route error:', error);
    throw new Error(error.message || 'Không thể tính toán lộ trình');
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
): Promise<RouteResultWithGeometry> => {
  try {
    const url = `${VIETMAP_CONFIG.ROUTING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&point=${from.latitude},${from.longitude}&point=${to.latitude},${to.longitude}&vehicle=car&points_encoded=false`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.paths || data.paths.length === 0) {
      throw new Error('Không thể tính toán lộ trình');
    }

    const path = data.paths[0];
    const duration = path.time / 1000;
    const distance = path.distance;
    const durationMinutes = Math.ceil(duration / 60);
    const distanceKm = distance / 1000;

    let durationText: string;
    if (durationMinutes < 60) {
      durationText = `${durationMinutes} phút`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      durationText = minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
    }

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
  } catch (error: any) {
    console.error('Calculate route with geometry error:', error);
    throw new Error(error.message || 'Không thể tính toán lộ trình');
  }
};

/**
 * Calculate routes between an ordered list of waypoints.
 * Returns individual segments + a merged polyline for the full trip.
 */
export const calculateMultiPointRoute = async (
  points: RoutePoint[],
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
      calculateRouteWithGeometry(points[i], points[i + 1])
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
