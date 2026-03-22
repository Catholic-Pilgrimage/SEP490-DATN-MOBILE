/**
 * Mass Schedule API Service
 * Handles all Mass Schedule (Lịch lễ) API operations for Local Guide
 *
 * Endpoints:
 * - POST   /api/local-guide/schedules           - Create schedule
 * - GET    /api/local-guide/schedules           - List schedules
 * - PUT    /api/local-guide/schedules/:id       - Update schedule
 * - DELETE /api/local-guide/schedules/:id       - Delete schedule (soft)
 * - PATCH  /api/local-guide/schedules/:id/restore - Restore schedule
 */

import { ApiResponse } from "../../../types/api.types";
import {
  CreateMassScheduleRequest,
  GetMassSchedulesParams,
  MassSchedule,
  MassScheduleActionResponse,
  MassScheduleListResponse,
  MassScheduleResponse,
  UpdateMassScheduleRequest,
} from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of mass schedules
 * GET /api/local-guide/schedules
 *
 * @param params - Filter parameters
 * @returns Paginated list of mass schedules
 *
 * @example
 * // Get approved schedules for Sunday
 * const schedules = await getMassSchedules({
 *   status: 'approved',
 *   day_of_week: 0,
 * });
 */
export const getMassSchedules = async (
  params?: GetMassSchedulesParams
): Promise<MassScheduleListResponse> => {
  const response = await apiClient.get<MassScheduleListResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.LIST,
    { params }
  );
  return response.data;
};

/**
 * Get single mass schedule by ID
 * GET /api/local-guide/schedules/:id
 *
 * @param id - Schedule ID
 * @returns Single mass schedule
 */
export const getMassScheduleById = async (
  id: string
): Promise<MassScheduleResponse> => {
  const response = await apiClient.get<MassScheduleResponse>(
    `${GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.LIST}/${id}`
  );
  return response.data;
};

/**
 * Create new mass schedule
 * POST /api/local-guide/schedules
 *
 * @param data - Schedule data
 * @returns Created schedule with status 'pending'
 *
 * @example
 * const newSchedule = await createMassSchedule({
 *   days_of_week: [0, 3, 6],  // CN, T4, T7
 *   time: "06:00",
 *   note: "Lễ chiều thứ 2, 4, 6 hàng tuần",
 * });
 *
 * Notes:
 * - Status is always 'pending' on creation
 * - Manager will receive notification to approve
 */
export const createMassSchedule = async (
  data: CreateMassScheduleRequest
): Promise<MassScheduleResponse> => {
  const response = await apiClient.post<MassScheduleResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.CREATE,
    data
  );
  return response.data;
};

/**
 * Update mass schedule
 * PUT /api/local-guide/schedules/:id
 *
 * @param id - Schedule ID
 * @param data - Fields to update (all optional)
 * @returns Updated schedule
 *
 * @example
 * const updated = await updateMassSchedule('uuid', {
 *   days_of_week: [0, 1, 2, 3, 4, 5, 6],
 *   time: "07:00",
 *   note: "Lễ chiều thứ 2, 4, 6 hàng tuần",
 * });
 *
 * Rules:
 * - Can only update own schedules
 * - Can only update when status = 'pending' or 'rejected'
 * - CANNOT update approved schedules
 * - If rejected → auto reset to 'pending' after update
 */
export const updateMassSchedule = async (
  id: string,
  data: UpdateMassScheduleRequest
): Promise<MassScheduleResponse> => {
  const response = await apiClient.put<MassScheduleResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete mass schedule (soft delete)
 * DELETE /api/local-guide/schedules/:id
 *
 * @param id - Schedule ID
 * @returns Success message
 *
 * Rules:
 * - Can only delete own schedules
 * - Can only delete when status = 'pending' or 'rejected'
 * - CANNOT delete approved schedules
 * - Soft delete: is_active = false (can restore later)
 */
export const deleteMassSchedule = async (
  id: string
): Promise<MassScheduleActionResponse> => {
  const response = await apiClient.delete<MassScheduleActionResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.DELETE(id)
  );
  return response.data;
};

/**
 * Restore deleted mass schedule
 * PATCH /api/local-guide/schedules/:id/restore
 *
 * @param id - Schedule ID
 * @returns Restored schedule info
 */
export const restoreMassSchedule = async (
  id: string
): Promise<MassScheduleActionResponse> => {
  const response = await apiClient.patch<MassScheduleActionResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MASS_SCHEDULES.RESTORE(id)
  );
  return response.data;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get schedules for a specific day
 * Convenience function to filter by day_of_week
 */
export const getSchedulesForDay = async (
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<MassScheduleListResponse> => {
  return getMassSchedules({
    day_of_week: dayOfWeek,
    status,
    is_active: true,
  });
};

/**
 * Get only approved schedules
 * Useful for displaying active mass times
 */
export const getApprovedSchedules = async (): Promise<MassScheduleListResponse> => {
  return getMassSchedules({
    status: 'approved',
    is_active: true,
  });
};

/**
 * Get pending schedules (awaiting approval)
 */
export const getPendingSchedules = async (): Promise<MassScheduleListResponse> => {
  return getMassSchedules({
    status: 'pending',
    is_active: true,
  });
};

/**
 * Get rejected schedules
 */
export const getRejectedSchedules = async (): Promise<MassScheduleListResponse> => {
  return getMassSchedules({
    status: 'rejected',
    is_active: true,
  });
};

// ============================================
// EXPORT
// ============================================

const massScheduleApi = {
  // CRUD operations
  getList: getMassSchedules,
  getById: getMassScheduleById,
  create: createMassSchedule,
  update: updateMassSchedule,
  delete: deleteMassSchedule,
  restore: restoreMassSchedule,

  // Helper functions
  getForDay: getSchedulesForDay,
  getApproved: getApprovedSchedules,
  getPending: getPendingSchedules,
  getRejected: getRejectedSchedules,
};

export default massScheduleApi;
