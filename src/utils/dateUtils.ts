/**
 * Date and Time Utilities
 * Comprehensive utilities for date/time operations
 * Used across dashboard and schedule features
 */

// ============================================
// TIME PARSING & COMPARISON
// ============================================

/**
 * Parse time string (HH:mm or HH:mm:ss) to total minutes from midnight
 * @param timeString - Time in format "HH:mm" or "HH:mm:ss"
 * @returns Total minutes from midnight, or null if invalid
 */
export const parseTimeToMinutes = (timeString: string | undefined | null): number | null => {
  if (!timeString) return null;

  const parts = timeString.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return null;

  const [hours, minutes] = parts;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

/**
 * Get current time as total minutes from midnight
 */
export const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Check if current time is within a time range
 * @param startTime - Start time in "HH:mm" or "HH:mm:ss" format
 * @param endTime - End time in "HH:mm" or "HH:mm:ss" format
 * @returns true if current time is within range
 */
export const isCurrentTimeInRange = (
  startTime: string | undefined | null,
  endTime: string | undefined | null
): boolean => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) return false;

  const current = getCurrentTimeInMinutes();

  // Handle overnight ranges (e.g., 22:00 - 06:00)
  if (end < start) {
    return current >= start || current <= end;
  }

  return current >= start && current <= end;
};

/**
 * Format time for display (e.g., "08:00" -> "8:00 AM")
 */
export const formatTimeDisplay = (
  timeString: string | undefined | null,
  use24Hour = false
): string => {
  if (!timeString) return '--:--';

  const parts = timeString.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return '--:--';

  const [hours, minutes] = parts;

  if (use24Hour) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// ============================================
// DAY OF WEEK UTILITIES
// ============================================

/**
 * Get current day of week (0 = Sunday, 6 = Saturday)
 */
export const getCurrentDayOfWeek = (): number => {
  return new Date().getDay();
};

/**
 * Check if today matches a specific day of week
 * @param dayOfWeek - Day number (0-6, where 0 is Sunday)
 */
export const isTodayDayOfWeek = (dayOfWeek: number): boolean => {
  return getCurrentDayOfWeek() === dayOfWeek;
};

/**
 * Check if today is in an array of days
 * @param daysOfWeek - Array of day numbers (0-6)
 */
export const isTodayInDays = (daysOfWeek: number[] | undefined | null): boolean => {
  if (!daysOfWeek || !Array.isArray(daysOfWeek)) return false;
  return daysOfWeek.includes(getCurrentDayOfWeek());
};

/**
 * Get day name from number
 */
export const getDayName = (dayOfWeek: number, locale: 'en' | 'vi' = 'vi'): string => {
  const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const viDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const days = locale === 'en' ? enDays : viDays;
  return days[dayOfWeek] || '';
};

// ============================================
// DATE COMPARISON
// ============================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  return formatDateToISO(today);
};

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date string is today
 * @param dateString - Date in YYYY-MM-DD format
 */
export const isToday = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false;
  return dateString === getTodayDateString();
};

/**
 * Check if date is within range (inclusive)
 */
export const isDateInRange = (
  dateString: string,
  startDate: string,
  endDate: string
): boolean => {
  return dateString >= startDate && dateString <= endDate;
};

/**
 * Get start of current week (Monday)
 */
/**
 * Get start of current week (Monday) or week of given date
 */
export const getWeekStartDate = (date?: Date): string => {
  const targetDate = date ? new Date(date) : new Date();
  const dayOfWeek = targetDate.getDay();
  // Adjust to get Monday (day 1). If Sunday (0), go back 6 days
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diff);
  return formatDateToISO(monday);
};

// ============================================
// SITE OPEN/CLOSED STATUS
// ============================================

export interface OpeningHours {
  open: string;
  close: string;
}

/**
 * Check if site is currently open based on opening hours
 * @param openingHours - Object with open and close times
 * @returns Object with isOpen status and next status change info
 */
export const getSiteOpenStatus = (
  openingHours: OpeningHours | undefined | null
): {
  isOpen: boolean;
  statusText: string;
  statusTextVi: string;
  nextChange: string | null;
} => {
  if (!openingHours?.open || !openingHours?.close) {
    return {
      isOpen: false,
      statusText: 'Unknown',
      statusTextVi: 'Không xác định',
      nextChange: null,
    };
  }

  const isOpen = isCurrentTimeInRange(openingHours.open, openingHours.close);

  if (isOpen) {
    return {
      isOpen: true,
      statusText: 'OPEN',
      statusTextVi: 'ĐANG MỞ',
      nextChange: `Closes at ${formatTimeDisplay(openingHours.close)}`,
    };
  }

  return {
    isOpen: false,
    statusText: 'CLOSED',
    statusTextVi: 'ĐÓNG CỬA',
    nextChange: `Opens at ${formatTimeDisplay(openingHours.open)}`,
  };
};

// ============================================
// RELATIVE TIME
// ============================================

/**
 * Get relative time string (e.g., "2 hours ago", "just now")
 */
export const getRelativeTime = (
  dateString: string | undefined | null,
  locale: 'en' | 'vi' = 'vi'
): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === 'vi') {
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDateDisplay(dateString, 'vi');
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateDisplay(dateString, 'en');
};

/**
 * Format date for display
 */
export const formatDateDisplay = (
  dateString: string | undefined | null,
  locale: 'en' | 'vi' = 'vi'
): string => {
  if (!dateString) return '';

  const date = new Date(dateString);

  if (locale === 'vi') {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================
// SORTING UTILITIES
// ============================================

/**
 * Compare two time strings for sorting
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export const compareTimeStrings = (a: string, b: string): number => {
  const aMinutes = parseTimeToMinutes(a) ?? 0;
  const bMinutes = parseTimeToMinutes(b) ?? 0;
  return aMinutes - bMinutes;
};

/**
 * Compare two date strings for sorting (DESC)
 */
export const compareDatesDesc = (
  a: string | undefined | null,
  b: string | undefined | null
): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(b).getTime() - new Date(a).getTime();
};

/**
 * Compare two date strings for sorting (ASC)
 */
export const compareDatesAsc = (
  a: string | undefined | null,
  b: string | undefined | null
): number => {
  return -compareDatesDesc(a, b);
};
