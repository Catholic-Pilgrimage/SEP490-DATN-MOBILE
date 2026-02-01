/**
 * Pilgrim Site/Explore API
 * Handles site exploration for Pilgrims
 *
 * Endpoints:
 * - GET /api/sites              - List sites
 * - GET /api/sites/:id          - Get site detail
 * - GET /api/sites/search       - Search sites
 * - GET /api/sites/nearby       - Get nearby sites
 * - GET /api/sites/favorites    - Get favorite sites
 * - POST /api/sites/:id/favorite - Add to favorites
 * - DELETE /api/sites/:id/favorite - Remove from favorites
 * - GET /api/sites/:id/reviews  - Get site reviews
 * - POST /api/sites/:id/reviews - Add review
 */

import {
    ApiResponse,
    PaginatedResponse,
    PaginationParams,
} from "../../../types/api.types";
import {
    CreateReviewRequest,
    NearbySite,
    NearbySitesParams,
    SearchSitesParams,
    Site,
    SiteReview,
    SiteSummary,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of sites
 */
export const getSites = async (
  params?: PaginationParams,
): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(
    PILGRIM_ENDPOINTS.SITES.LIST,
    { params },
  );
  return response.data;
};

/**
 * Get site detail
 */
export const getSiteDetail = async (id: string): Promise<ApiResponse<Site>> => {
  const response = await apiClient.get<ApiResponse<Site>>(
    PILGRIM_ENDPOINTS.SITES.DETAIL(id),
  );
  return response.data;
};

/**
 * Search sites
 */
export const searchSites = async (
  params: SearchSitesParams,
): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(
    PILGRIM_ENDPOINTS.SITES.SEARCH,
    { params },
  );
  return response.data;
};

/**
 * Get nearby sites
 */
export const getNearbySites = async (
  params: NearbySitesParams,
): Promise<ApiResponse<NearbySite[]>> => {
  const response = await apiClient.get<ApiResponse<NearbySite[]>>(
    PILGRIM_ENDPOINTS.SITES.NEARBY,
    { params },
  );
  return response.data;
};

/**
 * Get favorite sites
 */
export const getFavorites = async (
  params?: PaginationParams,
): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(
    PILGRIM_ENDPOINTS.SITES.FAVORITES,
    { params },
  );
  return response.data;
};

/**
 * Add site to favorites
 */
export const addFavorite = async (
  siteId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.SITES.ADD_FAVORITE(siteId),
  );
  return response.data;
};

/**
 * Remove site from favorites
 */
export const removeFavorite = async (
  siteId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.SITES.REMOVE_FAVORITE(siteId),
  );
  return response.data;
};

/**
 * Get site reviews
 */
export const getSiteReviews = async (
  siteId: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<SiteReview>> => {
  const response = await apiClient.get<PaginatedResponse<SiteReview>>(
    PILGRIM_ENDPOINTS.SITES.REVIEWS(siteId),
    { params },
  );
  return response.data;
};

/**
 * Add site review
 */
export const addReview = async (
  siteId: string,
  data: CreateReviewRequest,
): Promise<ApiResponse<SiteReview>> => {
  const response = await apiClient.post<ApiResponse<SiteReview>>(
    PILGRIM_ENDPOINTS.SITES.ADD_REVIEW(siteId),
    data,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimSiteApi = {
  getSites,
  getSiteDetail,
  searchSites,
  getNearbySites,
  getFavorites,
  addFavorite,
  removeFavorite,
  getSiteReviews,
  addReview,
};

export default pilgrimSiteApi;
