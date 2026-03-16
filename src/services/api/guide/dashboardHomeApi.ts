/**
 * Dashboard API
 * Unified API service for Dashboard & Home screen
 *
 * Endpoints:
 * - GET /api/local-guide/dashboard/overview - Get local guide dashboard overview
 * - GET /api/local-guide/site-schedule  - Get site schedule (active shift)
 * - GET /api/sos/site/list              - Get SOS requests
 * - GET /api/notifications              - Get notifications
 * 
 * Note: Mass Schedules API is in massScheduleApi.ts
 */

import { ApiResponse } from "../../../types/api.types";
import {
  LocalGuideDashboardOverview,
  NotificationListResponse,
  SiteScheduleData,
  SiteScheduleResponse,
  SOSListResponse,
  SOSRequest
} from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS, SHARED_ENDPOINTS } from "../endpoints";

// ============================================
// DASHBOARD OVERVIEW
// ============================================

/**
 * Get local guide dashboard overview
 * GET /api/local-guide/dashboard/overview
 */
export const getOverview = async (): Promise<ApiResponse<LocalGuideDashboardOverview>> => {
  const response = await apiClient.get<ApiResponse<LocalGuideDashboardOverview>>(
    GUIDE_ENDPOINTS.DASHBOARD.OVERVIEW
  );
  return response.data;
};

// ============================================
// SITE SCHEDULE (ACTIVE SHIFT)
// ============================================

/**
 * Get site schedule for a week
 * GET /api/local-guide/site-schedule
 * @param weekStartDate - Start date of the week (YYYY-MM-DD format)
 */
export const getSiteSchedule = async (
  weekStartDate: string
): Promise<ApiResponse<SiteScheduleData>> => {
  const response = await apiClient.get<SiteScheduleResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_SITE_SCHEDULE,
    { params: { week_start_date: weekStartDate } }
  );
  return {
    success: response.data.success,
    data: response.data.data,
    message: response.data.message ?? '',
  };
};

// ============================================
// SOS SUPPORT
// ============================================

/**
 * Get SOS requests for the site
 * GET /api/sos/site/list
 * @param params - Filter params
 */
export const getSOSRequests = async (params?: {
  status?: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  page?: number;
  limit?: number;
}): Promise<SOSListResponse> => {
  const response = await apiClient.get<SOSListResponse>(
    GUIDE_ENDPOINTS.SOS.LIST,
    { params }
  );
  return response.data;
};

/**
 * Get pending SOS count
 */
export const getPendingSOSCount = async (): Promise<{
  count: number;
  hasPending: boolean;
}> => {
  const response = await getSOSRequests({ status: 'pending', limit: 1 });
  const total = response.data?.pagination?.totalItems || 0;
  return {
    count: total,
    hasPending: total > 0,
  };
};

/**
 * Get SOS request detail
 * GET /api/sos/site/:id
 * @param id - SOS request ID
 */
export const getSOSDetail = async (
  id: string
): Promise<ApiResponse<SOSRequest>> => {
  const response = await apiClient.get<ApiResponse<SOSRequest>>(
    GUIDE_ENDPOINTS.SOS.DETAIL(id)
  );
  return response.data;
};

/**
 * Update SOS request status
 * PUT /api/sos/site/:id
 * @param id - SOS request ID
 * @param status - New status
 */
export const updateSOSStatus = async (
  id: string,
  status: 'in_progress' | 'resolved' | 'cancelled',
  notes?: string
): Promise<ApiResponse<SOSRequest>> => {
  const response = await apiClient.put<ApiResponse<SOSRequest>>(
    GUIDE_ENDPOINTS.SOS.DETAIL(id),
    { status, notes }
  );
  return response.data;
};

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Get notifications
 * GET /api/notifications
 * @param limit - Number of notifications to fetch
 */
export const getNotifications = async (
  limit = 5
): Promise<NotificationListResponse> => {
  const response = await apiClient.get<NotificationListResponse>(
    SHARED_ENDPOINTS.NOTIFICATIONS.LIST,
    { params: { limit } }
  );
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await getNotifications(1);
  return response.unreadCount || 0;
};

// ============================================
// EXPORT
// ============================================

const dashboardApi = {
  // Dashboard overview
  getOverview,

  // Site Schedule (Active Shift)
  getSiteSchedule,

  // SOS
  getSOSRequests,
  getPendingSOSCount,
  getSOSDetail,
  updateSOSStatus,

  // Notifications
  getNotifications,
  getUnreadNotificationCount,
};

export default dashboardApi;
