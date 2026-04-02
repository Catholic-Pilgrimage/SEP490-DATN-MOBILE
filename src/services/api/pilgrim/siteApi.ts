/**
 * Pilgrim Site API
 */

import { ApiResponse, PaginatedResponse, PaginationParams } from '../../../types/api.types';
import {
  CreateReviewRequest,
  FavoriteResponse,
  GetFavoritesResponse,
  GetSiteEventsParams,
  GetSiteMassSchedulesParams,
  GetSiteMediaParams,
  GetSiteNearbyPlacesParams,
  GetSiteReviewsParams,
  NearbySite,
  NearbySitesParams,
  NearbyPlaceReview,
  ReviewImageInput,
  SearchSitesParams,
  Site,
  SiteEventResponse,
  SiteMassScheduleResponse,
  SiteMediaResponse,
  SiteNearbyPlaceResponse,
  SiteReviewListData,
  SiteReview,
  SiteReviewPagination,
  SiteReviewReply,
  SiteReviewSummary,
  SiteSummary,
  UpdateReviewRequest,
} from '../../../types/pilgrim';
import apiHttp from '../apiClient';
import { PILGRIM_ENDPOINTS } from '../endpoints';

const getReviewFeedback = (data: CreateReviewRequest | UpdateReviewRequest) =>
  (typeof data.feedback === 'string' && data.feedback.trim()) ||
  (typeof data.content === 'string' && data.content.trim()) ||
  '';

const getImageFileName = (uri: string) => {
  const segment = uri.split('/').pop();
  return segment && segment.trim() ? segment : `review-${Date.now()}.jpg`;
};

const buildReviewFormData = (data: CreateReviewRequest | UpdateReviewRequest) => {
  const formData = new FormData();
  formData.append('rating', String(data.rating));
  formData.append('feedback', getReviewFeedback(data));

  for (const image of data.images ?? []) {
    if (!image) continue;

    if (typeof image === 'string') {
      formData.append('images', {
        uri: image,
        name: getImageFileName(image),
        type: 'image/jpeg',
      } as unknown as Blob);
      continue;
    }

    const typedImage = image as ReviewImageInput;
    if (!typedImage.uri) continue;

    formData.append('images', {
      uri: typedImage.uri,
      name: typedImage.name || getImageFileName(typedImage.uri),
      type: typedImage.type || 'image/jpeg',
    } as unknown as Blob);
  }

  return formData;
};

const normalizeReviewSummary = (
  raw?: Record<string, unknown>,
): SiteReviewSummary | undefined => {
  if (!raw) return undefined;

  return {
    avgRating: Number(raw.avg_rating || raw.avgRating || 0),
    totalReviews: Number(raw.total_reviews || raw.totalReviews || 0),
    ratingDistribution:
      raw.rating_distribution &&
      typeof raw.rating_distribution === 'object' &&
      !Array.isArray(raw.rating_distribution)
        ? (raw.rating_distribution as Record<string, number>)
        : undefined,
  };
};

const normalizeReviewPagination = (
  raw?: Record<string, unknown>,
  fallback?: GetSiteReviewsParams,
): SiteReviewPagination => ({
  page: Number(raw?.page || fallback?.page || 1),
  limit: Number(raw?.limit || fallback?.limit || 10),
  totalItems: Number(raw?.totalItems || raw?.total || 0),
  totalPages: Number(
    raw?.totalPages ||
      raw?.total_pages ||
      (raw?.totalItems || raw?.total
        ? Math.max(
            1,
            Math.ceil(
              Number(raw?.totalItems || raw?.total || 0) /
                Number(raw?.limit || fallback?.limit || 10),
            ),
          )
        : 1),
  ),
  total: Number(raw?.total || raw?.totalItems || 0),
  total_pages: Number(raw?.total_pages || raw?.totalPages || 0),
});

const normalizeSiteReview = <T extends SiteReview | NearbyPlaceReview>(
  raw: T | Record<string, unknown>,
): T => {
  const review = raw as Record<string, unknown>;
  const reviewer =
    (review.reviewer as Record<string, unknown> | undefined) || undefined;
  const rawReply =
    (review.reply as Record<string, unknown> | undefined) || undefined;
  const rawReplier =
    (rawReply?.replier as Record<string, unknown> | undefined) || undefined;
  const reply: SiteReviewReply | undefined = rawReply
    ? {
        id: String(rawReply.id || ''),
        content: String(rawReply.content || ''),
        createdAt: String(rawReply.createdAt || rawReply.created_at || ''),
        replier: rawReplier
          ? {
              id: String(rawReplier.id || ''),
              fullName: String(
                rawReplier.fullName || rawReplier.full_name || 'Local Guide',
              ),
              avatarUrl:
                String(rawReplier.avatarUrl || rawReplier.avatar_url || '') ||
                undefined,
              role: String(rawReplier.role || '') || undefined,
            }
          : undefined,
      }
    : undefined;
  const images =
    (review.images as string[] | undefined) ||
    (review.image_urls as string[] | undefined) ||
    [];

  return {
    ...(review as T),
    siteId: String(review.siteId || review.site_id || ''),
    nearbyPlaceId: String(review.nearbyPlaceId || review.nearby_place_id || ''),
    userId: String(
      review.userId || review.user_id || reviewer?.id || '',
    ),
    userName: String(
      review.userName ||
        review.user_name ||
        reviewer?.full_name ||
        reviewer?.fullName ||
        'Người dùng',
    ),
    userAvatar: String(
      review.userAvatar ||
        review.user_avatar ||
        reviewer?.avatar_url ||
        reviewer?.avatarUrl ||
        '',
    ) || undefined,
    content: String(
      review.content || review.feedback || review.comment || '',
    ),
    feedback: String(
      review.feedback || review.content || review.comment || '',
    ),
    images,
    imageUrls: images,
    verifiedVisit:
      typeof review.verifiedVisit === 'boolean'
        ? review.verifiedVisit
        : Boolean(review.verified_visit),
    reply,
    createdAt: String(review.createdAt || review.created_at || ''),
    updatedAt: String(review.updatedAt || review.updated_at || ''),
  } as T;
};

// List & Detail
export const getSites = async (params?: PaginationParams): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiHttp.get<PaginatedResponse<SiteSummary>>(PILGRIM_ENDPOINTS.SITES.LIST, { params });
  return response.data;
};

export const getSiteDetail = async (id: string): Promise<ApiResponse<Site>> => {
  const response = await apiHttp.get<ApiResponse<Site>>(PILGRIM_ENDPOINTS.SITES.DETAIL(id));
  return response.data;
};

export const searchSites = async (params: SearchSitesParams): Promise<PaginatedResponse<SiteSummary>> => {
  const response = await apiHttp.get<PaginatedResponse<SiteSummary>>(PILGRIM_ENDPOINTS.SITES.SEARCH, { params });
  return response.data;
};

export const getNearbySites = async (params: NearbySitesParams): Promise<ApiResponse<NearbySite[]>> => {
  const response = await apiHttp.get<ApiResponse<NearbySite[]>>(PILGRIM_ENDPOINTS.SITES.NEARBY, { params });
  return response.data;
};

// Favorites (auth required)
/**
 * Get list of favorite sites for the current user
 * @param params Pagination parameters
 * @returns Promise with list of favorite sites and pagination info
 */
export const getFavorites = async (params?: PaginationParams): Promise<GetFavoritesResponse> => {
  const response = await apiHttp.get<GetFavoritesResponse>(PILGRIM_ENDPOINTS.SITES.FAVORITES, { params });
  return response.data;
};

/**
 * Add a site to favorites
 * @param siteId ID of the site to add
 * @returns Promise with operation result and site info
 */
export const addFavorite = async (siteId: string): Promise<FavoriteResponse> => {
  const response = await apiHttp.post<FavoriteResponse>(PILGRIM_ENDPOINTS.SITES.ADD_FAVORITE(siteId));
  return response.data;
};

/**
 * Remove a site from favorites
 * @param siteId ID of the site to remove
 * @returns Promise with operation result and site info
 */
export const removeFavorite = async (siteId: string): Promise<FavoriteResponse> => {
  const response = await apiHttp.delete<FavoriteResponse>(PILGRIM_ENDPOINTS.SITES.REMOVE_FAVORITE(siteId));
  return response.data;
};

// Reviews
export const getSiteReviews = async (
  siteId: string,
  params?: GetSiteReviewsParams,
): Promise<ApiResponse<SiteReviewListData<SiteReview>>> => {
  const response = await apiHttp.get<ApiResponse<SiteReviewListData<SiteReview>>>(
    PILGRIM_ENDPOINTS.SITES.REVIEWS(siteId),
    { params },
  );

  return {
    ...response.data,
    data: response.data.data
      ? {
          summary: normalizeReviewSummary(
            response.data.data.summary as Record<string, unknown> | undefined,
          ),
          reviews: (
            response.data.data.reviews ||
            ((response.data.data as unknown as { items?: SiteReview[] }).items ?? [])
          ).map((item) => normalizeSiteReview<SiteReview>(item)),
          pagination:
            normalizeReviewPagination(
              response.data.data.pagination as Record<string, unknown> | undefined,
              params,
            ),
        }
      : undefined,
  };
};

export const addReview = async (siteId: string, data: CreateReviewRequest): Promise<ApiResponse<SiteReview>> => {
  const response = await apiHttp.post<ApiResponse<SiteReview>>(
    PILGRIM_ENDPOINTS.SITES.ADD_REVIEW(siteId),
    buildReviewFormData(data),
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return {
    ...response.data,
    data: response.data.data
      ? normalizeSiteReview<SiteReview>(response.data.data)
      : undefined,
  };
};

export const updateSiteReview = async (
  siteId: string,
  reviewId: string,
  data: UpdateReviewRequest,
): Promise<ApiResponse<SiteReview>> => {
  const response = await apiHttp.put<ApiResponse<SiteReview>>(
    PILGRIM_ENDPOINTS.SITES.UPDATE_REVIEW(siteId, reviewId),
    buildReviewFormData(data),
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return {
    ...response.data,
    data: response.data.data
      ? normalizeSiteReview<SiteReview>(response.data.data)
      : undefined,
  };
};

export const deleteSiteReview = async (
  siteId: string,
  reviewId: string,
): Promise<ApiResponse<null>> => {
  const response = await apiHttp.delete<ApiResponse<null>>(
    PILGRIM_ENDPOINTS.SITES.DELETE_REVIEW(siteId, reviewId),
  );
  return response.data;
};

export const getNearbyPlaceReviews = async (
  siteId: string,
  nearbyPlaceId: string,
  params?: GetSiteReviewsParams,
): Promise<ApiResponse<SiteReviewListData<NearbyPlaceReview>>> => {
  const response = await apiHttp.get<ApiResponse<SiteReviewListData<NearbyPlaceReview>>>(
    PILGRIM_ENDPOINTS.SITES.NEARBY_PLACE_REVIEWS(siteId, nearbyPlaceId),
    { params },
  );

  return {
    ...response.data,
    data: response.data.data
      ? {
          summary: normalizeReviewSummary(
            response.data.data.summary as Record<string, unknown> | undefined,
          ),
          reviews: (
            response.data.data.reviews ||
            ((response.data.data as unknown as { items?: NearbyPlaceReview[] }).items ?? [])
          ).map((item) => normalizeSiteReview<NearbyPlaceReview>(item)),
          pagination:
            normalizeReviewPagination(
              response.data.data.pagination as Record<string, unknown> | undefined,
              params,
            ),
        }
      : undefined,
  };
};

export const addNearbyPlaceReview = async (
  siteId: string,
  nearbyPlaceId: string,
  data: CreateReviewRequest,
): Promise<ApiResponse<NearbyPlaceReview>> => {
  const response = await apiHttp.post<ApiResponse<NearbyPlaceReview>>(
    PILGRIM_ENDPOINTS.SITES.ADD_NEARBY_PLACE_REVIEW(siteId, nearbyPlaceId),
    buildReviewFormData(data),
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return {
    ...response.data,
    data: response.data.data
      ? normalizeSiteReview<NearbyPlaceReview>(response.data.data)
      : undefined,
  };
};

export const updateNearbyPlaceReview = async (
  siteId: string,
  nearbyPlaceId: string,
  reviewId: string,
  data: UpdateReviewRequest,
): Promise<ApiResponse<NearbyPlaceReview>> => {
  const response = await apiHttp.put<ApiResponse<NearbyPlaceReview>>(
    PILGRIM_ENDPOINTS.SITES.UPDATE_NEARBY_PLACE_REVIEW(
      siteId,
      nearbyPlaceId,
      reviewId,
    ),
    buildReviewFormData(data),
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return {
    ...response.data,
    data: response.data.data
      ? normalizeSiteReview<NearbyPlaceReview>(response.data.data)
      : undefined,
  };
};

export const deleteNearbyPlaceReview = async (
  siteId: string,
  nearbyPlaceId: string,
  reviewId: string,
): Promise<ApiResponse<null>> => {
  const response = await apiHttp.delete<ApiResponse<null>>(
    PILGRIM_ENDPOINTS.SITES.DELETE_NEARBY_PLACE_REVIEW(
      siteId,
      nearbyPlaceId,
      reviewId,
    ),
  );
  return response.data;
};

export const createSiteReview = addReview;

// Media (public)
export const getSiteMedia = async (siteId: string, params?: GetSiteMediaParams): Promise<SiteMediaResponse> => {
  const response = await apiHttp.get<SiteMediaResponse>(PILGRIM_ENDPOINTS.SITES.MEDIA(siteId), { params });
  return response.data;
};

// Mass Schedules (public)
export const getSiteMassSchedules = async (siteId: string, params?: GetSiteMassSchedulesParams): Promise<SiteMassScheduleResponse> => {
  const response = await apiHttp.get<SiteMassScheduleResponse>(PILGRIM_ENDPOINTS.SITES.MASS_SCHEDULES(siteId), { params });
  return response.data;
};

// Events (public)
export const getSiteEvents = async (siteId: string, params?: GetSiteEventsParams): Promise<SiteEventResponse> => {
  const response = await apiHttp.get<SiteEventResponse>(PILGRIM_ENDPOINTS.SITES.EVENTS(siteId), { params });
  return response.data;
};

// Nearby Places (public)
export const getSiteNearbyPlaces = async (siteId: string, params?: GetSiteNearbyPlacesParams): Promise<SiteNearbyPlaceResponse> => {
  const response = await apiHttp.get<SiteNearbyPlaceResponse>(PILGRIM_ENDPOINTS.SITES.NEARBY_PLACES(siteId), { params });
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
  createSiteReview,
  updateSiteReview,
  deleteSiteReview,
  getNearbyPlaceReviews,
  addNearbyPlaceReview,
  updateNearbyPlaceReview,
  deleteNearbyPlaceReview,
  getSiteMedia,
  getSiteMassSchedules,
  getSiteEvents,
  getSiteNearbyPlaces,
};

export default pilgrimSiteApi;
