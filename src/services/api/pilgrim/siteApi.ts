/**
 * Pilgrim Site API
 */

import { ApiResponse, PaginatedResponse, PaginationParams } from '../../../types/api.types';
import {
  CreateReviewRequest,
  GetSiteEventsParams,
  GetSiteMassSchedulesParams,
  GetSiteMediaParams,
  GetSiteNearbyPlacesParams,
  NearbySite,
  NearbySitesParams,
  SearchSitesParams,
  Site,
  SiteEventResponse,
  SiteMassScheduleResponse,
  SiteMediaResponse,
  SiteNearbyPlaceResponse,
  SiteReview,
  SiteSummary,
} from '../../../types/pilgrim';
import apiClient from '../apiClient';
import { PILGRIM_ENDPOINTS } from '../endpoints';

// List & Detail
export const getSites = async (params?: PaginationParams): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(PILGRIM_ENDPOINTS.SITES.LIST, { params });
  return response.data;
};

export const getSiteDetail = async (id: string): Promise<ApiResponse<Site>> => {
  const response = await apiClient.get<ApiResponse<Site>>(PILGRIM_ENDPOINTS.SITES.DETAIL(id));
  return response.data;
};

export const searchSites = async (params: SearchSitesParams): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(PILGRIM_ENDPOINTS.SITES.SEARCH, { params });
  return response.data;
};

export const getNearbySites = async (params: NearbySitesParams): Promise<ApiResponse<NearbySite[]>> => {
  const response = await apiClient.get<ApiResponse<NearbySite[]>>(PILGRIM_ENDPOINTS.SITES.NEARBY, { params });
  return response.data;
};

// Favorites (auth required)
export const getFavorites = async (params?: PaginationParams): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiClient.get<PaginatedResponse<SiteSummary>>(PILGRIM_ENDPOINTS.SITES.FAVORITES, { params });
  return response.data;
};

export const addFavorite = async (siteId: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(PILGRIM_ENDPOINTS.SITES.ADD_FAVORITE(siteId));
  return response.data;
};

export const removeFavorite = async (siteId: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(PILGRIM_ENDPOINTS.SITES.REMOVE_FAVORITE(siteId));
  return response.data;
};

// Reviews
export const getSiteReviews = async (siteId: string, params?: PaginationParams): Promise<PaginatedResponse<SiteReview>> => {
  const response = await apiClient.get<PaginatedResponse<SiteReview>>(PILGRIM_ENDPOINTS.SITES.REVIEWS(siteId), { params });
  return response.data;
};

export const addReview = async (siteId: string, data: CreateReviewRequest): Promise<ApiResponse<SiteReview>> => {
  const response = await apiClient.post<ApiResponse<SiteReview>>(PILGRIM_ENDPOINTS.SITES.ADD_REVIEW(siteId), data);
  return response.data;
};

// Media (public)
export const getSiteMedia = async (siteId: string, params?: GetSiteMediaParams): Promise<SiteMediaResponse> => {
  const response = await apiClient.get<SiteMediaResponse>(PILGRIM_ENDPOINTS.SITES.MEDIA(siteId), { params });
  return response.data;
};

// Mass Schedules (public)
export const getSiteMassSchedules = async (siteId: string, params?: GetSiteMassSchedulesParams): Promise<SiteMassScheduleResponse> => {
  const response = await apiClient.get<SiteMassScheduleResponse>(PILGRIM_ENDPOINTS.SITES.MASS_SCHEDULES(siteId), { params });
  return response.data;
};

// Events (public)
export const getSiteEvents = async (siteId: string, params?: GetSiteEventsParams): Promise<SiteEventResponse> => {
  const response = await apiClient.get<SiteEventResponse>(PILGRIM_ENDPOINTS.SITES.EVENTS(siteId), { params });
  return response.data;
};

// Nearby Places (public)
export const getSiteNearbyPlaces = async (siteId: string, params?: GetSiteNearbyPlacesParams): Promise<SiteNearbyPlaceResponse> => {
  const response = await apiClient.get<SiteNearbyPlaceResponse>(PILGRIM_ENDPOINTS.SITES.NEARBY_PLACES(siteId), { params });
  return response.data;
};

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
  getSiteMedia,
  getSiteMassSchedules,
  getSiteEvents,
  getSiteNearbyPlaces,
};

export default pilgrimSiteApi;
