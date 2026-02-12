/**
 * Dashboard API
 * Unified API service for Dashboard & Home screen
 *
 * Endpoints:
 * - GET /api/guide/dashboard            - Get overview statistics
 * - GET /api/guide/dashboard/statistics - Get chart statistics
 * - GET /api/local-guide/site-schedule  - Get site schedule (active shift)
 * - GET /api/sos/site/list              - Get SOS requests
 * - GET /api/notifications              - Get notifications
 * 
 * Note: Mass Schedules API is in massScheduleApi.ts
 */

import { ApiResponse } from "../../../types/api.types";
import {
  DashboardOverview,
  DashboardStatistics,
  NotificationListResponse,
  SiteScheduleResponse,
  SiteScheduleShift,
  SOSListResponse,
  SOSRequest
} from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS, SHARED_ENDPOINTS } from "../endpoints";

// ============================================
// DASHBOARD STATISTICS
// ============================================

/**
 * Get dashboard overview statistics
 * GET /api/guide/dashboard
 */
export const getOverview = async (): Promise<ApiResponse<DashboardOverview>> => {
  const response = await apiClient.get<ApiResponse<DashboardOverview>>(
    GUIDE_ENDPOINTS.DASHBOARD.OVERVIEW
  );
  return response.data;
};

/**
 * Get dashboard chart statistics
 * GET /api/guide/dashboard/statistics
 * @param period - Time period ('week' | 'month' | 'year')
 */
export const getStatistics = async (
  period: 'week' | 'month' | 'year' = 'month'
): Promise<ApiResponse<DashboardStatistics>> => {
  const response = await apiClient.get<ApiResponse<DashboardStatistics>>(
    GUIDE_ENDPOINTS.DASHBOARD.STATISTICS,
    { params: { period } }
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
): Promise<ApiResponse<SiteScheduleShift[]>> => {
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
  // Statistics
  getOverview,
  getStatistics,

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
