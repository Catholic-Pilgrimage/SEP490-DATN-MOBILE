/**
 * Guide Site API
 * Handles site operations for Local Guide
 *
 * Endpoints:
 * - GET /api/local-guide/site - Get assigned site info
 */

import { ApiResponse } from "../../../types/api.types";
import { LocalGuideSite } from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get assigned site info for the local guide
 *
 * @returns Site info if guide is assigned
 *
 * Response codes:
 * - 200: Success
 * - 401: Not logged in
 * - 403: Not a Local Guide
 * - 404: Local Guide not assigned to any site
 */
export const getAssignedSite = async (): Promise<
  ApiResponse<LocalGuideSite>
> => {
  const response = await apiClient.get<ApiResponse<LocalGuideSite>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_SITE,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const guideSiteApi = {
  getAssignedSite,
};

export default guideSiteApi;
