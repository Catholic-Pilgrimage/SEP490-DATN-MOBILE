/**
 * Guide Types - Mass Schedule
 * Type definitions for Local Guide Mass Schedule (Lịch lễ) feature
 *
 * API Endpoints:
 * - POST   /api/local-guide/schedules           - Create schedule
 * - GET    /api/local-guide/schedules           - List schedules
 * - PUT    /api/local-guide/schedules/:id       - Update schedule
 * - DELETE /api/local-guide/schedules/:id       - Delete schedule (soft)
 * - PATCH  /api/local-guide/schedules/:id/restore - Restore schedule
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Mass schedule approval status
 */
export type MassScheduleStatus = 'pending' | 'approved' | 'rejected';

/**
 * Day of week mapping
 * 0 = Chủ Nhật (Sunday)
 * 1 = Thứ Hai (Monday)
 * 2 = Thứ Ba (Tuesday)
 * 3 = Thứ Tư (Wednesday)
 * 4 = Thứ Năm (Thursday)
 * 5 = Thứ Sáu (Friday)
 * 6 = Thứ Bảy (Saturday)
 */
import { DayOfWeek } from "../common.types";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Mass schedule item returned from API
 * GET /api/local-guide/schedules
 */
export interface MassSchedule {
  id: string;
  site_id: string;
  code: string;                    // Auto-generated: MS[MMDD][SEQ] (e.g., MS0203001)
  days_of_week: DayOfWeek[];       // Array of days (0-6)
  time: string;                    // HH:MM:SS format (e.g., "06:00:00")
  note: string | null;             // Optional note (max 500 chars)
  status: MassScheduleStatus;
  rejection_reason: string | null; // Reason if rejected
  is_active: boolean;              // Soft delete flag
  created_by: string;              // User ID who created
  created_at: string;              // ISO DateTime
  updated_at: string;              // ISO DateTime
}

/**
 * Mass schedule list pagination
 */
export interface MassSchedulePagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Mass schedule list response structure
 */
export interface MassScheduleListResponse {
  success: boolean;
  data: {
    data: MassSchedule[];
    pagination: MassSchedulePagination;
  };
  message?: string;
}

/**
 * Single mass schedule response
 */
export interface MassScheduleResponse {
  success: boolean;
  data: MassSchedule;
  message?: string;
}

/**
 * Delete/Restore response
 */
export interface MassScheduleActionResponse {
  success: boolean;
  message: string;
  data?: Partial<MassSchedule>;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Parameters for fetching mass schedule list
 * GET /api/local-guide/schedules
 */
export interface GetMassSchedulesParams {
  page?: number;
  limit?: number;
  status?: MassScheduleStatus;
  day_of_week?: DayOfWeek;         // Filter by specific day
  is_active?: boolean;
}

/**
 * Request body for creating mass schedule
 * POST /api/local-guide/schedules
 *
 * Validation:
 * - days_of_week: Required, min 1 element, values 0-6
 * - time: Required, format HH:MM or HH:MM:SS
 * - note: Optional, max 500 chars
 *
 * Note: Status is always 'pending' on creation
 */
export interface CreateMassScheduleRequest {
  days_of_week: DayOfWeek[];       // Required: e.g., [0, 3, 6] for Sun, Wed, Sat
  time: string;                    // Required: "HH:MM" or "HH:MM:SS"
  note?: string;                   // Optional: max 500 chars
}

/**
 * Request body for updating mass schedule
 * PUT /api/local-guide/schedules/:id
 *
 * Rules:
 * - Can only update own schedules
 * - Can only update when status = 'pending' or 'rejected'
 * - CANNOT update approved schedules
 * - If rejected → auto reset to 'pending' after update
 *
 * All fields are optional
 */
export interface UpdateMassScheduleRequest {
  days_of_week?: DayOfWeek[];
  time?: string;
  note?: string;
}

// ============================================
// UI HELPER TYPES
// ============================================

/**
 * Day of week display info
 */
export interface DayOfWeekInfo {
  value: DayOfWeek;
  labelVi: string;
  labelEn: string;
  shortLabelVi: string;
  shortLabelEn: string;
}

/**
 * Mass schedule with UI computed properties
 */
export interface MassScheduleWithUI extends MassSchedule {
  // Computed properties
  formattedTime: string;           // "6:00 AM" or "06:00"
  daysDisplayVi: string;           // "CN, T4, T7"
  daysDisplayEn: string;           // "Sun, Wed, Sat"
  canEdit: boolean;                // status !== 'approved'
  canDelete: boolean;              // status !== 'approved'
  statusLabelVi: string;           // "Chờ duyệt" / "Đã duyệt" / "Từ chối"
  statusLabelEn: string;           // "Pending" / "Approved" / "Rejected"
  statusColor: string;             // Color for status badge
}

/**
 * Mass schedule form data (for create/edit forms)
 */
export interface MassScheduleFormData {
  days_of_week: DayOfWeek[];
  time: string;                    // HH:MM format
  note: string;
}

/**
 * Mass schedule validation errors
 */
export interface MassScheduleValidationErrors {
  days_of_week?: string;
  time?: string;
  note?: string;
}
