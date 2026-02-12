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
import apiClient from "../apiClient";
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
    const response = await apiClient.get<ApiResponse<GetGuideSOSListResponse>>(
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
    const response = await apiClient.get<ApiResponse<SOSEntity>>(
        GUIDE_ENDPOINTS.SOS.DETAIL(id),
    );
    return response.data;
};

/**
 * Assign SOS to self (Accept)
 */
export const assignSOS = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(
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
    const response = await apiClient.patch<ApiResponse<void>>(
        GUIDE_ENDPOINTS.SOS.RESOLVE(id),
        data,
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
