/**
 * Pilgrim Dashboard API
 *
 * Endpoint:
 * - GET /api/pilgrim/dashboard/overview
 */

import { ApiResponse } from "../../../types/api.types";
import { PilgrimDashboardOverview } from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

/**
 * Get pilgrim dashboard overview.
 */
export const getOverview = async (): Promise<ApiResponse<PilgrimDashboardOverview>> => {
  const response = await apiClient.get<ApiResponse<PilgrimDashboardOverview>>(
    PILGRIM_ENDPOINTS.DASHBOARD.OVERVIEW
  );

  return response.data;
};

const pilgrimDashboardApi = {
  getOverview,
};

export default pilgrimDashboardApi;
