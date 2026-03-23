/**
 * Dashboard Home Utilities
 * Business logic for processing dashboard data
 * 
 * This file contains pure utility functions for:
 * - Active Shift calculation
 * - Today's Overview merging & sorting
 * - Recent Activity processing
 * - SOS badge logic
 */

import {
  ActiveShiftInfo,
  EventItem,
  MassSchedule,
  MediaItem,
  RecentActivityItem,
  RecentActivityType,
  SiteScheduleShift,
  SOSInfo,
  SOSRequest,
  TodayOverviewItem,
} from '../../../../types/guide';
import type { GuideNearbyPlace } from '../../../../services/api/guide/nearbyPlacesApi';
import {
  compareDatesDesc,
  compareTimeStrings,
  formatTimeDisplay,
  getCurrentDayOfWeek,
  getCurrentTimeInMinutes,
  getTodayDateString,
  isCurrentTimeInRange,
  isTodayInDays,
  parseTimeToMinutes,
} from '../../../../utils/dateUtils';

// ============================================
// ACTIVE SHIFT LOGIC
// ============================================

/**
 * Filter shifts to find the active shift for today
 * 
 * Logic:
 * 1. Filter shifts where is_mine = true AND status = "approved"
 * 2. Check if day_of_week matches today (0-6)
 * 3. Check if current time is within start_time - end_time
 */
export const getActiveShift = (
  shifts: SiteScheduleShift[] | undefined | null
): ActiveShiftInfo => {
  const defaultInfo: ActiveShiftInfo = {
    isOnDuty: false,
    shift: null,
    startTime: '',
    endTime: '',
  };

  if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
    console.log('[DashboardUtils] getActiveShift - No shifts provided');
    return defaultInfo;
  }

  const today = getCurrentDayOfWeek();
  console.log('[DashboardUtils] getActiveShift - Today Index (0-6):', today);

  // Find my approved shift for today
  const todayShift = shifts.find(
    (shift) =>
      shift.is_mine &&
      shift.status === 'approved' &&
      shift.day_of_week === today
  );

  console.log('[DashboardUtils] getActiveShift - Found Today Shift:', JSON.stringify(todayShift, null, 2));

  if (!todayShift) {
    console.log('[DashboardUtils] getActiveShift - No approved shift for today found');
    return defaultInfo;
  }

  // Check if currently within shift time
  const isOnDuty = isCurrentTimeInRange(todayShift.start_time, todayShift.end_time);
  console.log(`[DashboardUtils] getActiveShift - Time Check: ${todayShift.start_time} - ${todayShift.end_time} | Is On Duty: ${isOnDuty}`);

  // Calculate remaining time if on duty
  let remainingTime: string | undefined;
  if (isOnDuty) {
    const currentMinutes = getCurrentTimeInMinutes();
    const endMinutes = parseTimeToMinutes(todayShift.end_time);
    if (endMinutes !== null) {
      const remaining = endMinutes - currentMinutes;
      const hours = Math.floor(remaining / 60);
      const minutes = remaining % 60;
      remainingTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
  }

  const result = {
    isOnDuty,
    shift: todayShift,
    startTime: formatTimeDisplay(todayShift.start_time, true),
    endTime: formatTimeDisplay(todayShift.end_time, true),
    remainingTime,
  };

  console.log('[DashboardUtils] getActiveShift - Final Result:', JSON.stringify(result, null, 2));
  return result;
};

// ============================================
// TODAY'S OVERVIEW LOGIC
// ============================================

/**
 * Filter and merge events + schedules for today's overview
 * 
 * Logic for Events:
 * - Filter: start_date = today AND status = "approved"
 * 
 * Logic for Schedules:
 * - Filter: days_of_week contains today AND status = "approved"
 * 
 * Then:
 * - Merge both lists
 * - Sort by time ASC
 * - Mark "NOW" for currently happening items
 */
export const getTodayOverview = (
  events: EventItem[] | undefined | null,
  schedules: MassSchedule[] | undefined | null
): TodayOverviewItem[] => {
  const today = getTodayDateString();
  const currentMinutes = getCurrentTimeInMinutes();
  const items: TodayOverviewItem[] = [];

  // Process events
  if (events && Array.isArray(events)) {
    const todayEvents = events.filter(
      (event) =>
        event.start_date === today &&
        event.status === 'approved' &&
        event.is_active
    );

    todayEvents.forEach((event) => {
      const startMinutes = parseTimeToMinutes(event.start_time);
      const endMinutes = parseTimeToMinutes(event.end_time);

      const isNow =
        startMinutes !== null &&
        endMinutes !== null &&
        currentMinutes >= startMinutes &&
        currentMinutes <= endMinutes;

      const isPast = endMinutes !== null && currentMinutes > endMinutes;

      items.push({
        id: event.id,
        type: 'event',
        title: event.name,
        description: event.description,
        time: event.start_time,
        displayTime: formatTimeDisplay(event.start_time),
        location: event.location,
        isNow,
        isPast,
        originalData: event,
      });
    });
  }

  // Process schedules
  if (schedules && Array.isArray(schedules)) {
    const todaySchedules = schedules.filter(
      (schedule) =>
        isTodayInDays(schedule.days_of_week) &&
        schedule.status === 'approved' &&
        schedule.is_active
    );

    todaySchedules.forEach((schedule) => {
      const scheduleMinutes = parseTimeToMinutes(schedule.time);

      // For schedules, consider "NOW" if within 30 minutes window
      const isNow =
        scheduleMinutes !== null &&
        currentMinutes >= scheduleMinutes - 15 &&
        currentMinutes <= scheduleMinutes + 30;

      const isPast = scheduleMinutes !== null && currentMinutes > scheduleMinutes + 30;

      items.push({
        id: schedule.id,
        type: 'schedule',
        title: schedule.note || `Lịch lễ ${formatTimeDisplay(schedule.time)}`, // Use note as title
        description: undefined,
        time: schedule.time,
        displayTime: formatTimeDisplay(schedule.time),
        location: undefined, // MassSchedule doesn't have location
        isNow,
        isPast,
        originalData: schedule,
      });
    });
  }

  // Sort by time ASC
  items.sort((a, b) => compareTimeStrings(a.time, b.time));

  return items;
};

/**
 * Get the current or next item from today's overview
 */
export const getCurrentOrNextOverviewItem = (
  items: TodayOverviewItem[]
): TodayOverviewItem | null => {
  // First, find any item that's happening now
  const nowItem = items.find((item) => item.isNow);
  if (nowItem) return nowItem;

  // Otherwise, find the next upcoming item
  const upcomingItem = items.find((item) => !item.isPast);
  return upcomingItem || null;
};

// ============================================
// SOS INFO LOGIC
// ============================================

/**
 * Process SOS requests to get dashboard info
 * 
 * Logic:
 * - Count pending SOS
 * - Check if any pending → show red badge
 */
export const getSOSInfo = (
  requests: SOSRequest[] | undefined | null,
  totalCount?: number
): SOSInfo => {
  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];
  const count = totalCount ?? pendingRequests.length;

  return {
    pendingCount: count,
    hasPending: count > 0,
    latestRequest: pendingRequests[0] || null,
  };
};

// ============================================
// RECENT ACTIVITY LOGIC
// ============================================

/**
 * Map media item to recent activity format
 */
const mapMediaToActivity = (media: MediaItem): RecentActivityItem => ({
  id: media.id,
  type: 'media' as RecentActivityType,
  title: media.caption || 'Media',
  metaLabel: getMediaMetaLabel(media),
  statusLabel: getActivityStatusLabel(media.status),
  statusTone: getActivityStatusTone(media.status),
  thumbnail: media.type === 'image' ? media.url : null,
  created_at: media.created_at,
  status: media.status,
  originalData: media,
});

/**
 * Get content label for media item
 */
const getMediaMetaLabel = (media: MediaItem): string => {
  const typeLabels: Record<string, string> = {
    image: 'Hình ảnh',
    video: 'Video',
    model_3d: 'Mô hình 3D',
  };

  return typeLabels[media.type] || media.type;
};

/**
 * Map event item to recent activity format
 */
const mapEventToActivity = (event: EventItem): RecentActivityItem => ({
  id: event.id,
  type: 'event' as RecentActivityType,
  title: event.name,
  metaLabel: getEventMetaLabel(),
  statusLabel: getActivityStatusLabel(event.status),
  statusTone: getActivityStatusTone(event.status),
  thumbnail: event.banner_url,
  created_at: event.created_at,
  status: event.status,
  originalData: event,
});

/**
 * Get content label for event item
 */
const getEventMetaLabel = (): string => 'Sự kiện';

/**
 * Map nearby place to RecentActivityItem
 */
const mapNearbyPlaceToActivity = (place: GuideNearbyPlace): RecentActivityItem => ({
  id: place.id,
  type: 'nearby_place' as RecentActivityType,
  title: place.name,
  metaLabel: getNearbyPlaceMetaLabel(place),
  statusLabel: getActivityStatusLabel(place.status),
  statusTone: getActivityStatusTone(place.status),
  thumbnail: null,
  created_at: place.created_at,
  status: place.status,
  originalData: place,
});

const getNearbyPlaceMetaLabel = (place: GuideNearbyPlace): string => {
  const categoryLabels: Record<string, string> = {
    food: 'Ăn uống',
    accommodation: 'Lưu trú',
    medical: 'Y tế',
  };
  const cat = categoryLabels[place.category] || 'Địa điểm';
  return cat;
};

const getActivityStatusTone = (
  status?: string,
): RecentActivityItem['statusTone'] => {
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    return status;
  }
  return null;
};

const getActivityStatusLabel = (status?: string): string | undefined => {
  const statusLabels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  };

  return status ? statusLabels[status] : undefined;
};

/**
 * Merge and process recent activity from media + events + nearby places
 * 
 * Logic:
 * 1. Map media & events to unified format
 * 2. Merge both lists
 * 3. Sort by created_at DESC
 * 4. Take top 5 items
 */
export const getRecentActivity = (
  mediaItems: MediaItem[] | undefined | null,
  eventItems: EventItem[] | undefined | null,
  limit = 5,
  nearbyPlaceItems?: GuideNearbyPlace[] | undefined | null,
): RecentActivityItem[] => {
  const activities: RecentActivityItem[] = [];

  if (mediaItems && Array.isArray(mediaItems)) {
    mediaItems.forEach((media) => {
      activities.push(mapMediaToActivity(media));
    });
  }

  if (eventItems && Array.isArray(eventItems)) {
    eventItems.forEach((event) => {
      activities.push(mapEventToActivity(event));
    });
  }

  if (nearbyPlaceItems && Array.isArray(nearbyPlaceItems)) {
    nearbyPlaceItems.forEach((place) => {
      activities.push(mapNearbyPlaceToActivity(place));
    });
  }

  activities.sort((a, b) => compareDatesDesc(a.created_at, b.created_at));

  return activities.slice(0, limit);
};

// ============================================
// QUICK ACTION BADGES
// ============================================

export interface QuickActionBadges {
  sos: number;
  schedule: number;
  messages: number;
  media: number;
}

/**
 * Calculate badge counts for quick action buttons
 */
export const getQuickActionBadges = (data: {
  pendingSOSCount?: number;
  pendingMediaCount?: number;
  unreadMessages?: number;
  upcomingEvents?: number;
}): QuickActionBadges => {
  return {
    sos: data.pendingSOSCount || 0,
    schedule: data.upcomingEvents || 0,
    messages: data.unreadMessages || 0,
    media: data.pendingMediaCount || 0,
  };
};

// ============================================
// PENDING BADGES (Đề xuất cải thiện UI)
// ============================================

export interface PendingBadges {
  sos: number;
  media: number;
  events: number;
  schedules: number;
  messages: number;
}

/**
 * Calculate pending badges for all quick action buttons
 * Dựa trên đề xuất: Thêm dot/badge cho mỗi quick action nếu có pending items
 */
export const getPendingBadges = (data: {
  sosTotal?: number;
  pendingMedia?: number;
  pendingEvents?: number;
  pendingSchedules?: number;
  unreadMessages?: number;
}): PendingBadges => {
  return {
    sos: data.sosTotal || 0,
    media: data.pendingMedia || 0,
    events: data.pendingEvents || 0,
    schedules: data.pendingSchedules || 0,
    messages: data.unreadMessages || 0,
  };
};

/**
 * Check if any badge has pending items
 */
export const hasAnyPendingBadge = (badges: PendingBadges): boolean => {
  return Object.values(badges).some((count) => count > 0);
};

/**
 * Get total pending count across all badges
 */
export const getTotalPendingCount = (badges: PendingBadges): number => {
  return Object.values(badges).reduce((sum, count) => sum + count, 0);
};

// ============================================
// SITE STATUS DISPLAY HELPERS
// ============================================

/**
 * Get site status display info
 * Dựa trên đề xuất: CLOSED badge động theo opening_hours + current time
 */
export const getSiteStatusDisplay = (openingHours: {
  open: string;
  close: string;
} | null): {
  isOpen: boolean;
  statusText: string;
  statusTextVi: string;
  badgeVariant: 'success' | 'error';
  nextChangeText: string;
} => {
  if (!openingHours) {
    return {
      isOpen: false,
      statusText: 'Closed',
      statusTextVi: 'Đóng cửa',
      badgeVariant: 'error',
      nextChangeText: '',
    };
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const openMinutes = parseTimeToMinutes(openingHours.open);
  const closeMinutes = parseTimeToMinutes(openingHours.close);

  if (openMinutes === null || closeMinutes === null) {
    return {
      isOpen: false,
      statusText: 'Unknown',
      statusTextVi: 'Không xác định',
      badgeVariant: 'error',
      nextChangeText: '',
    };
  }

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    // Calculate time until close
    const minutesUntilClose = closeMinutes - currentMinutes;
    const hoursUntilClose = Math.floor(minutesUntilClose / 60);
    const minsRemaining = minutesUntilClose % 60;

    let nextChangeText = '';
    if (hoursUntilClose > 0) {
      nextChangeText = `Đóng cửa sau ${hoursUntilClose}h ${minsRemaining}m`;
    } else {
      nextChangeText = `Đóng cửa sau ${minsRemaining} phút`;
    }

    return {
      isOpen: true,
      statusText: 'Open',
      statusTextVi: 'Đang mở',
      badgeVariant: 'success',
      nextChangeText,
    };
  } else {
    // Calculate time until open
    let minutesUntilOpen: number;
    if (currentMinutes < openMinutes) {
      minutesUntilOpen = openMinutes - currentMinutes;
    } else {
      // After close time, calculate until next day open
      minutesUntilOpen = (24 * 60 - currentMinutes) + openMinutes;
    }

    const hoursUntilOpen = Math.floor(minutesUntilOpen / 60);
    const minsRemaining = minutesUntilOpen % 60;

    let nextChangeText = '';
    if (hoursUntilOpen > 0) {
      nextChangeText = `Mở cửa sau ${hoursUntilOpen}h ${minsRemaining}m`;
    } else {
      nextChangeText = `Mở cửa sau ${minsRemaining} phút`;
    }

    return {
      isOpen: false,
      statusText: 'Closed',
      statusTextVi: 'Đóng cửa',
      badgeVariant: 'error',
      nextChangeText,
    };
  }
};

/**
 * Get active shift display info
 * Dựa trên đề xuất: Active Shift chỉ hiển thị khi đang ON DUTY
 */
export const getActiveShiftDisplay = (
  shiftInfo: ActiveShiftInfo
): {
  shouldShow: boolean;
  badgeText: string;
  badgeTextVi: string;
  timeRange: string;
  remainingText: string;
} => {
  if (!shiftInfo.isOnDuty || !shiftInfo.shift) {
    return {
      shouldShow: false,
      badgeText: '',
      badgeTextVi: '',
      timeRange: '',
      remainingText: '',
    };
  }

  const timeRange = `${shiftInfo.startTime} - ${shiftInfo.endTime}`;

  return {
    shouldShow: true,
    badgeText: 'On Duty',
    badgeTextVi: 'Đang trực',
    timeRange,
    remainingText: shiftInfo.remainingTime
      ? `Còn ${shiftInfo.remainingTime}`
      : '',
  };
};

// ============================================
// EXPORT ALL
// ============================================

export const dashboardHomeUtils = {
  getActiveShift,
  getTodayOverview,
  getCurrentOrNextOverviewItem,
  getSOSInfo,
  getRecentActivity,
  getQuickActionBadges,
  getPendingBadges,
  hasAnyPendingBadge,
  getTotalPendingCount,
  getSiteStatusDisplay,
  getActiveShiftDisplay,
};

export default dashboardHomeUtils;
