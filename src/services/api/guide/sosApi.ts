/**
 * Guide SOS API
 * Handles SOS functionalities for Local Guides
 */

import { ApiResponse } from "../../../types/api.types";
import {
    GetGuideSOSListResponse,
    GuideSOSListParams,
    ResolveSOSRequest,
    SOSEntity,
} from "../../../types/guide/sos.types";
import client from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get SOS list at assigned site
 */
export const getGuideSOSList = async (
  params?: GuideSOSListParams,
): Promise<ApiResponse<GetGuideSOSListResponse>> => {
  const response = await client.get<ApiResponse<GetGuideSOSListResponse>>(
    GUIDE_ENDPOINTS.SOS.LIST,
    { params },
  );
  return response.data;
};

/**
 * Get SOS detail
 */
export const getGuideSOSDetail = async (
  id: string,
): Promise<ApiResponse<SOSEntity>> => {
  const response = await client.get<ApiResponse<SOSEntity>>(
    GUIDE_ENDPOINTS.SOS.DETAIL(id),
  );

  if (response.data?.data) {
    const detail = response.data.data;
    const normalizedNotes = detail.notes ?? detail.note;
    if (normalizedNotes && !detail.notes) {
      detail.notes = normalizedNotes;
    }
    if (normalizedNotes && !detail.note) {
      detail.note = normalizedNotes;
    }
  }

  return response.data;
};

/**
 * Assign SOS to self (Accept)
 */
export const assignSOS = async (id: string): Promise<ApiResponse<void>> => {
  const response = await client.patch<ApiResponse<void>>(
    GUIDE_ENDPOINTS.SOS.ASSIGN(id),
  );
  return response.data;
};

/**
 * Resolve SOS
 */
export const resolveSOS = async (
  id: string,
  data: ResolveSOSRequest,
): Promise<ApiResponse<void>> => {
  const payload: ResolveSOSRequest = {
    ...data,
    notes: data.notes ?? data.note,
    note: data.note ?? data.notes,
  };

  const response = await client.patch<ApiResponse<void>>(
    GUIDE_ENDPOINTS.SOS.RESOLVE(id),
    payload,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const guideSOSApi = {
  getGuideSOSList,
  getGuideSOSDetail,
  assignSOS,
  resolveSOS,
};

export default guideSOSApi;
