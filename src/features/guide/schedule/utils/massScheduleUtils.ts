/**
 * Mass Schedule Utilities
 * Helper functions for Mass Schedule data processing and UI
 */

import { formatTimeDisplay, getCurrentDayOfWeek } from '../../../../utils/dateUtils';
import {
  DayOfWeek,
  DayOfWeekInfo,
  MassSchedule,
  MassScheduleFormData,
  MassScheduleStatus,
  MassScheduleValidationErrors,
  MassScheduleWithUI,
} from '../../../../types/guide';

// ============================================
// DAY OF WEEK HELPERS
// ============================================

/**
 * Day of week information with labels
 */
export const DAYS_OF_WEEK: DayOfWeekInfo[] = [
  { value: 0, labelVi: 'Chủ Nhật', labelEn: 'Sunday', shortLabelVi: 'CN', shortLabelEn: 'Sun' },
  { value: 1, labelVi: 'Thứ Hai', labelEn: 'Monday', shortLabelVi: 'T2', shortLabelEn: 'Mon' },
  { value: 2, labelVi: 'Thứ Ba', labelEn: 'Tuesday', shortLabelVi: 'T3', shortLabelEn: 'Tue' },
  { value: 3, labelVi: 'Thứ Tư', labelEn: 'Wednesday', shortLabelVi: 'T4', shortLabelEn: 'Wed' },
  { value: 4, labelVi: 'Thứ Năm', labelEn: 'Thursday', shortLabelVi: 'T5', shortLabelEn: 'Thu' },
  { value: 5, labelVi: 'Thứ Sáu', labelEn: 'Friday', shortLabelVi: 'T6', shortLabelEn: 'Fri' },
  { value: 6, labelVi: 'Thứ Bảy', labelEn: 'Saturday', shortLabelVi: 'T7', shortLabelEn: 'Sat' },
];

/**
 * Get day info by value
 */
export const getDayInfo = (day: DayOfWeek): DayOfWeekInfo => {
  return DAYS_OF_WEEK[day];
};

/**
 * Format days array to display string
 * @param days - Array of day values [0, 3, 6]
 * @param locale - 'vi' or 'en'
 * @param useShort - Use short labels
 * @returns "CN, T4, T7" or "Sun, Wed, Sat"
 */
export const formatDaysDisplay = (
  days: DayOfWeek[],
  locale: 'vi' | 'en' = 'vi',
  useShort = true
): string => {
  if (!days || days.length === 0) return '';

  // Sort days for consistent display
  const sortedDays = [...days].sort((a, b) => a - b);

  return sortedDays
    .map((day) => {
      const info = getDayInfo(day);
      if (locale === 'vi') {
        return useShort ? info.shortLabelVi : info.labelVi;
      }
      return useShort ? info.shortLabelEn : info.labelEn;
    })
    .join(', ');
};

/**
 * Check if schedule runs today
 */
export const isScheduleToday = (days: DayOfWeek[]): boolean => {
  const today = getCurrentDayOfWeek() as DayOfWeek;
  return days.includes(today);
};

/**
 * Check if all days are selected (daily schedule)
 */
export const isDaily = (days: DayOfWeek[]): boolean => {
  return days.length === 7;
};

/**
 * Check if only weekdays (Mon-Fri)
 */
export const isWeekdaysOnly = (days: DayOfWeek[]): boolean => {
  const weekdays: DayOfWeek[] = [1, 2, 3, 4, 5];
  return (
    days.length === 5 &&
    weekdays.every((d) => days.includes(d)) &&
    !days.includes(0) &&
    !days.includes(6)
  );
};

/**
 * Check if only weekends (Sat-Sun)
 */
export const isWeekendsOnly = (days: DayOfWeek[]): boolean => {
  return days.length === 2 && days.includes(0) && days.includes(6);
};

// ============================================
// STATUS HELPERS
// ============================================

interface StatusInfo {
  labelVi: string;
  labelEn: string;
  color: string;
  bgColor: string;
}

const STATUS_INFO: Record<MassScheduleStatus, StatusInfo> = {
  pending: {
    labelVi: 'Chờ duyệt',
    labelEn: 'Pending',
    color: '#F59E0B',     // Amber
    bgColor: '#FEF3C7',
  },
  approved: {
    labelVi: 'Đã duyệt',
    labelEn: 'Approved',
    color: '#10B981',     // Emerald
    bgColor: '#D1FAE5',
  },
  rejected: {
    labelVi: 'Từ chối',
    labelEn: 'Rejected',
    color: '#EF4444',     // Red
    bgColor: '#FEE2E2',
  },
};

/**
 * Get status display info
 */
export const getStatusInfo = (status: MassScheduleStatus): StatusInfo => {
  return STATUS_INFO[status] || STATUS_INFO.pending;
};

/**
 * Check if schedule can be edited
 * Rule: Can only edit when status = 'pending' or 'rejected'
 */
export const canEditSchedule = (schedule: MassSchedule): boolean => {
  return schedule.status !== 'approved' && schedule.is_active;
};

/**
 * Check if schedule can be deleted
 * Rule: Can only delete when status = 'pending' or 'rejected'
 */
export const canDeleteSchedule = (schedule: MassSchedule): boolean => {
  return schedule.status !== 'approved' && schedule.is_active;
};

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Transform MassSchedule to MassScheduleWithUI
 * Adds computed UI properties
 */
export const transformToUISchedule = (
  schedule: MassSchedule
): MassScheduleWithUI => {
  const statusInfo = getStatusInfo(schedule.status);

  return {
    ...schedule,
    formattedTime: formatTimeDisplay(schedule.time),
    daysDisplayVi: formatDaysDisplay(schedule.days_of_week, 'vi'),
    daysDisplayEn: formatDaysDisplay(schedule.days_of_week, 'en'),
    canEdit: canEditSchedule(schedule),
    canDelete: canDeleteSchedule(schedule),
    statusLabelVi: statusInfo.labelVi,
    statusLabelEn: statusInfo.labelEn,
    statusColor: statusInfo.color,
  };
};

/**
 * Transform array of schedules to UI format
 */
export const transformSchedulesToUI = (
  schedules: MassSchedule[]
): MassScheduleWithUI[] => {
  return schedules.map(transformToUISchedule);
};

/**
 * Convert MassSchedule to form data
 */
export const scheduleToFormData = (
  schedule: MassSchedule
): MassScheduleFormData => {
  // Convert time from HH:MM:SS to HH:MM for form
  const timeParts = schedule.time.split(':');
  const formTime = `${timeParts[0]}:${timeParts[1]}`;

  return {
    days_of_week: schedule.days_of_week,
    time: formTime,
    note: schedule.note || '',
  };
};

/**
 * Create empty form data
 */
export const createEmptyFormData = (): MassScheduleFormData => ({
  days_of_week: [],
  time: '06:00',
  note: '',
});

// ============================================
// VALIDATION
// ============================================

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const pattern24Hour = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return pattern24Hour.test(time);
};

/**
 * Validate days of week array
 */
export const isValidDaysOfWeek = (days: number[]): boolean => {
  if (!Array.isArray(days) || days.length === 0) return false;
  return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
};

/**
 * Validate note length
 */
export const isValidNote = (note: string | undefined | null): boolean => {
  if (!note) return true; // Note is optional
  return note.length <= 500;
};

/**
 * Validate mass schedule form data
 * @returns Object with validation errors (empty if valid)
 */
export const validateMassScheduleForm = (
  data: MassScheduleFormData
): MassScheduleValidationErrors => {
  const errors: MassScheduleValidationErrors = {};

  // Validate days_of_week
  if (!data.days_of_week || data.days_of_week.length === 0) {
    errors.days_of_week = 'Vui lòng chọn ít nhất 1 ngày trong tuần';
  } else if (!isValidDaysOfWeek(data.days_of_week)) {
    errors.days_of_week = 'Ngày không hợp lệ';
  }

  // Validate time
  if (!data.time) {
    errors.time = 'Vui lòng nhập giờ lễ';
  } else if (!isValidTimeFormat(data.time)) {
    errors.time = 'Định dạng giờ không hợp lệ (HH:MM)';
  }

  // Validate note
  if (!isValidNote(data.note)) {
    errors.note = 'Ghi chú không được quá 500 ký tự';
  }

  return errors;
};

/**
 * Check if form data is valid
 */
export const isFormValid = (data: MassScheduleFormData): boolean => {
  const errors = validateMassScheduleForm(data);
  return Object.keys(errors).length === 0;
};

// ============================================
// SORTING & FILTERING
// ============================================

/**
 * Sort schedules by time (ascending)
 */
export const sortByTime = (schedules: MassSchedule[]): MassSchedule[] => {
  return [...schedules].sort((a, b) => a.time.localeCompare(b.time));
};

/**
 * Sort schedules by status (pending first, then approved, then rejected)
 */
export const sortByStatus = (schedules: MassSchedule[]): MassSchedule[] => {
  const order: Record<MassScheduleStatus, number> = {
    pending: 0,
    approved: 1,
    rejected: 2,
  };
  return [...schedules].sort((a, b) => order[a.status] - order[b.status]);
};

/**
 * Filter schedules that run on a specific day
 */
export const filterByDay = (
  schedules: MassSchedule[],
  day: DayOfWeek
): MassSchedule[] => {
  return schedules.filter((s) => s.days_of_week.includes(day));
};

/**
 * Filter schedules by status
 */
export const filterByStatus = (
  schedules: MassSchedule[],
  status: MassScheduleStatus
): MassSchedule[] => {
  return schedules.filter((s) => s.status === status);
};

/**
 * Get schedules for today, sorted by time
 */
export const getTodaySchedules = (schedules: MassSchedule[]): MassSchedule[] => {
  const today = getCurrentDayOfWeek() as DayOfWeek;
  const todaySchedules = filterByDay(schedules, today);
  return sortByTime(todaySchedules);
};

// ============================================
// EXPORTS
// ============================================

export const massScheduleUtils = {
  // Day helpers
  DAYS_OF_WEEK,
  getDayInfo,
  formatDaysDisplay,
  isScheduleToday,
  isDaily,
  isWeekdaysOnly,
  isWeekendsOnly,

  // Status helpers
  getStatusInfo,
  canEditSchedule,
  canDeleteSchedule,

  // Transformation
  transformToUISchedule,
  transformSchedulesToUI,
  scheduleToFormData,
  createEmptyFormData,

  // Validation
  isValidTimeFormat,
  isValidDaysOfWeek,
  isValidNote,
  validateMassScheduleForm,
  isFormValid,

  // Sorting & Filtering
  sortByTime,
  sortByStatus,
  filterByDay,
  filterByStatus,
  getTodaySchedules,
};

export default massScheduleUtils;
