/**
 * Pilgrim SOS API
 * Handles SOS functionalities for Pilgrims
 */

import { ApiResponse } from "../../../types/api.types";
import {
    CreateSOSRequest,
    GetSOSListResponse,
    SOSEntity,
    SOSListParams,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Create SOS request
 */
export const createSOS = async (
    data: CreateSOSRequest,
): Promise<ApiResponse<SOSEntity>> => {
    const response = await apiClient.post<ApiResponse<SOSEntity>>(
        PILGRIM_ENDPOINTS.SOS.CREATE,
        data,
    );
    return response.data;
};

/**
 * Get SOS list (My SOS requests)
 */
export const getSOSList = async (
    params?: SOSListParams,
): Promise<ApiResponse<GetSOSListResponse>> => {
    const response = await apiClient.get<ApiResponse<GetSOSListResponse>>(
        PILGRIM_ENDPOINTS.SOS.LIST,
        { params },
    );
    return response.data;
};

/**
 * Get SOS detail
 */
export const getSOSDetail = async (
    id: string,
): Promise<ApiResponse<SOSEntity>> => {
    const response = await apiClient.get<ApiResponse<SOSEntity>>(
        PILGRIM_ENDPOINTS.SOS.DETAIL(id),
    );
    return response.data;
};

/**
 * Cancel SOS request
 */
export const cancelSOS = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
        PILGRIM_ENDPOINTS.SOS.CANCEL(id),
    );
    return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimSOSApi = {
    createSOS,
    getSOSList,
    getSOSDetail,
    cancelSOS,
};

export default pilgrimSOSApi;
