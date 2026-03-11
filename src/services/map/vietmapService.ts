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

export default {
  calculateRoute,
  calculateArrivalTime,
};
