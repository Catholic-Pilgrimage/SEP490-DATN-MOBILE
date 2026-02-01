/**
 * Guide Dashboard API
 * Handles dashboard operations for Local Guide
 *
 * Endpoints:
 * - GET /api/guide/dashboard           - Get overview
 * - GET /api/guide/dashboard/statistics - Get statistics
 */

import { ApiResponse } from "../../../types/api.types";
import { DashboardOverview, DashboardStatistics } from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get dashboard overview
 */
export const getOverview = async (): Promise<
  ApiResponse<DashboardOverview>
> => {
  const response = await apiClient.get<ApiResponse<DashboardOverview>>(
    GUIDE_ENDPOINTS.DASHBOARD.OVERVIEW,
  );
  return response.data;
};

/**
 * Get dashboard statistics
 * @param period - Time period ('week' | 'month' | 'year')
 */
export const getStatistics = async (
  period: "week" | "month" | "year" = "month",
): Promise<ApiResponse<DashboardStatistics>> => {
  const response = await apiClient.get<ApiResponse<DashboardStatistics>>(
    GUIDE_ENDPOINTS.DASHBOARD.STATISTICS,
    { params: { period } },
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const guideDashboardApi = {
  getOverview,
  getStatistics,
};

export default guideDashboardApi;
