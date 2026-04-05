/**
 * Guide Nearby Places API
 * Local Guide đề xuất địa điểm lân cận (ăn uống, lưu trú, y tế) gần site
 *
 * Endpoints:
 * - GET    /api/local-guide/nearby-places        - Danh sách
 * - POST   /api/local-guide/nearby-places        - Tạo mới
 * - PUT    /api/local-guide/nearby-places/:id    - Cập nhật
 * - DELETE /api/local-guide/nearby-places/:id    - Xóa
 */

import { ApiResponse } from "../../../types/api.types";
import { NearbyPlaceCategory } from "../../../types/common.types";
import type { GuideReviewerInfo } from "../../../types/guide/review-tracking.types";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// TYPES
// ============================================

export interface GuideNearbyPlace {
  id: string;
  site_id: string;
  code: string;
  created_by: string;
  name: string;
  category: NearbyPlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  phone?: string;
  description?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer?: GuideReviewerInfo | null;
  created_at: string;
}

export interface CreateNearbyPlaceRequest {
  name: string;
  category: NearbyPlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  phone?: string;
  description?: string;
}

export interface UpdateNearbyPlaceRequest extends Partial<CreateNearbyPlaceRequest> {}

export interface NearbyPlaceListResponse {
  success: boolean;
  message?: string;
  data: {
    data: GuideNearbyPlace[];
    [key: string]: any;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Lấy danh sách địa điểm lân cận do guide đề xuất
 */
export const getNearbyPlaces = async (params?: {
  is_active?: boolean;
}): Promise<NearbyPlaceListResponse> => {
  const response = await apiClient.get<NearbyPlaceListResponse>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_NEARBY_PLACES.LIST,
    { params: { is_active: true, ...params } },
  );
  return response.data;
};

/**
 * Tạo địa điểm lân cận mới
 */
export const createNearbyPlace = async (
  data: CreateNearbyPlaceRequest,
): Promise<ApiResponse<GuideNearbyPlace>> => {
  const response = await apiClient.post<ApiResponse<GuideNearbyPlace>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_NEARBY_PLACES.CREATE,
    data,
  );
  return response.data;
};

/**
 * Cập nhật địa điểm lân cận
 */
export const updateNearbyPlace = async (
  id: string,
  data: UpdateNearbyPlaceRequest,
): Promise<ApiResponse<GuideNearbyPlace>> => {
  const response = await apiClient.put<ApiResponse<GuideNearbyPlace>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_NEARBY_PLACES.UPDATE(id),
    data,
  );
  return response.data;
};

/**
 * Xóa địa điểm lân cận
 */
export const deleteNearbyPlace = async (
  id: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_NEARBY_PLACES.DELETE(id),
  );
  return response.data;
};

/**
 * Khôi phục địa điểm lân cận đã xóa
 */
export const restoreNearbyPlace = async (
  id: string,
): Promise<ApiResponse<GuideNearbyPlace>> => {
  const response = await apiClient.patch<ApiResponse<GuideNearbyPlace>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_NEARBY_PLACES.RESTORE(id),
  );
  return response.data;
};

const guideNearbyPlacesApi = {
  getNearbyPlaces,
  createNearbyPlace,
  updateNearbyPlace,
  deleteNearbyPlace,
  restoreNearbyPlace,
};

export default guideNearbyPlacesApi;
