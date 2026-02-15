/**
 * Guide Types - Dashboard Home
 * Type definitions for Dashboard Home screen data
 * 
 * This file contains types for:
 * - Site Schedule (Active Shift)
 * - SOS Support requests
 * - Recent Activity items
 * - Today's Overview (merged events + schedules)
 */

// ============================================
// SITE SCHEDULE / ACTIVE SHIFT
// ============================================

/**
 * Shift status
 */
export type ShiftStatus = 'pending' | 'approved' | 'rejected';

/**
 * Site schedule shift item from API
 * GET /api/local-guide/site-schedule?week_start_date=YYYY-MM-DD
 */
export interface SiteScheduleShift {
  shift_id: string;
  submission_id: string;
  start_time: string;  // HH:mm:ss
  end_time: string;    // HH:mm:ss
  guide_name: string;
  status: ShiftStatus; // pending, approved, etc.
  is_mine: boolean;
  day_of_week?: number; // Optional, might be inferred from key
}

export type SiteScheduleMap = Record<string, SiteScheduleShift[]>;

export interface SiteScheduleData {
  week_start_date: string;
  site_id: string;
  site_name: string;
  opening_hours: any; // Define structure if known
  schedule: SiteScheduleMap;
}

/**
 * Site schedule API response
 */
export interface SiteScheduleResponse {
  success: boolean;
  data: SiteScheduleData;
  message?: string;
}

/**
 * Processed active shift info for UI
 */
export interface ActiveShiftInfo {
  isOnDuty: boolean;
  shift: SiteScheduleShift | null;
  startTime: string;
  endTime: string;
  remainingTime?: string;
}

// ============================================
// MASS SCHEDULE - Re-export from mass-schedule.types.ts
// ============================================

// Note: Full MassSchedule types are defined in mass-schedule.types.ts
// Import them from there for CRUD operations
// The MassScheduleItem below is kept for backward compatibility with dashboard utils

import type { MassSchedule } from './mass-schedule.types';
import type { SOSStatus } from './sos.types';

/**
 * @deprecated Use MassSchedule from mass-schedule.types.ts instead
 * Keeping for backward compatibility with dashboard home utils
 */
export type MassScheduleItem = MassSchedule;

// ============================================
// SOS SUPPORT
// ============================================

/**
 * SOS request priority
 */
export type SOSPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * SOS request item from API
 * GET /api/sos/site/list?status=pending
 */
export interface SOSRequest {
  id: string;
  site_id: string;
  pilgrim_id: string;
  pilgrim_name: string;
  pilgrim_avatar?: string;
  title: string;
  description: string;
  location?: string;
  status: SOSStatus;
  priority: SOSPriority;
  created_at: string;
  updated_at: string;
}

/**
 * SOS list API response with pagination
 * Actual API returns: { success, data: { sosRequests: [], pagination: {} }, message }
 */
export interface SOSListResponse {
  success: boolean;
  data: {
    sosRequests: SOSRequest[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
  message?: string;
}

/**
 * Processed SOS info for dashboard
 */
export interface SOSInfo {
  pendingCount: number;
  hasPending: boolean;
  latestRequest: SOSRequest | null;
}

// ============================================
// TODAY'S OVERVIEW (Merged Events + Schedules)
// ============================================

/**
 * Overview item type (for UI differentiation)
 */
export type OverviewItemType = 'event' | 'schedule';

/**
 * Today's overview item (unified from events & schedules)
 */
export interface TodayOverviewItem {
  id: string;
  type: OverviewItemType;
  title: string;
  description?: string;
  time: string;           // HH:mm for sorting
  displayTime: string;    // Formatted for display
  location?: string;
  isNow: boolean;         // Currently happening
  isPast: boolean;        // Already passed
  originalData: any;      // Reference to original event/schedule
}

// ============================================
// RECENT ACTIVITY
// ============================================

/**
 * Recent activity type
 */
export type RecentActivityType = 'media' | 'event';

/**
 * Recent activity item (unified from media & events)
 * Mapped from API responses
 */
export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  title: string;
  subtitle: string;
  thumbnail?: string | null;
  created_at: string;
  status?: string;
  originalData: any;      // Reference to original media/event
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Notification item from API
 * GET /api/notifications?limit=5
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

// ============================================
// DASHBOARD HOME COMBINED STATE
// ============================================

/**
 * Complete dashboard home data state
 * Used by useDashboardHome hook
 */
export interface DashboardHomeData {
  // Site info
  siteInfo: {
    id: string;
    name: string;
    patronSaint: string;
    coverImage: string;
    isOpen: boolean;
    openingHours: {
      open: string;
      close: string;
    };
  } | null;

  // Active shift
  activeShift: ActiveShiftInfo;

  // Today's overview
  todayOverview: TodayOverviewItem[];

  // SOS info
  sosInfo: SOSInfo;

  // Recent activity
  recentActivity: RecentActivityItem[];

  // Notifications
  notifications: {
    items: NotificationItem[];
    unreadCount: number;
  };
}

/**
 * Dashboard home loading states
 */
export interface DashboardHomeLoadingState {
  siteInfo: boolean;
  activeShift: boolean;
  todayOverview: boolean;
  sosInfo: boolean;
  recentActivity: boolean;
  notifications: boolean;
}

/**
 * Dashboard home error states
 */
export interface DashboardHomeErrorState {
  siteInfo: string | null;
  activeShift: string | null;
  todayOverview: string | null;
  sosInfo: string | null;
  recentActivity: string | null;
  notifications: string | null;
}

// ============================================
// PENDING BADGES (Đề xuất cải thiện UI)
// ============================================

/**
 * Pending counts for quick action badges
 * Hiển thị badge đếm pending items cho mỗi nút
 */
export interface PendingBadges {
  /** SOS requests đang chờ xử lý */
  sos: number;
  /** Media đang chờ duyệt */
  media: number;
  /** Events đang chờ duyệt */
  events: number;
  /** Mass Schedules đang chờ duyệt */
  schedules: number;
  /** Tin nhắn chưa đọc */
  messages: number;
}

/**
 * Dashboard home data với pending badges
 */
export interface DashboardHomeDataWithBadges extends DashboardHomeData {
  pendingBadges: PendingBadges;
}

// ============================================
// SITE STATUS DISPLAY
// ============================================

/**
 * Site status info for display
 */
export interface SiteStatusInfo {
  /** Site đang mở hay đóng */
  isOpen: boolean;
  /** Text trạng thái tiếng Anh */
  statusText: string;
  /** Text trạng thái tiếng Việt */
  statusTextVi: string;
  /** Thời gian thay đổi trạng thái tiếp theo */
  nextChange: string | null;
  /** CSS class để style badge */
  badgeVariant: 'success' | 'error';
}

/**
 * Active shift display info
 */
export interface ActiveShiftDisplay {
  /** Có đang trong ca không */
  isOnDuty: boolean;
  /** Badge text hiển thị */
  badgeText: string;
  /** Thời gian còn lại trong ca */
  remainingTime?: string;
  /** Thời gian ca: "08:00 - 16:00" */
  shiftTimeRange: string;
}
