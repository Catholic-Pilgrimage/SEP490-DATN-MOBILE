/**
 * Guide Types - Schedule
 * Type definitions for Local Guide Schedule feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Schedule item type
 */
export type ScheduleItemType = "booking" | "event" | "maintenance";

/**
 * Schedule item status
 */
export type ScheduleItemStatus = "scheduled" | "completed" | "cancelled";

/**
 * Booking status
 */
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Schedule item
 */
export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  siteId?: string;
  siteName?: string;
  type: ScheduleItemType;
  status: ScheduleItemStatus;
}

/**
 * Availability setting
 */
export interface Availability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

/**
 * Booking
 */
export interface Booking {
  id: string;
  pilgrimId: string;
  pilgrimName: string;
  pilgrimAvatar?: string;
  siteId: string;
  siteName: string;
  scheduledDate: string;
  scheduledTime: string;
  numberOfPeople: number;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}
