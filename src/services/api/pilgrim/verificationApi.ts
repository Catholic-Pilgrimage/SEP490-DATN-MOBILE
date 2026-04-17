/**
 * Pilgrim Verification API
 * Handles Verification functionalities for Guests and Pilgrims
 */

import { ApiResponse } from "../../../types/api.types";
import {
    ClaimableSitesResponse,
    GuestTransitionRequestPayload,
    GuestVerificationRequestPayload,
    GuestVerificationResponse,
    PilgrimTransitionRequestPayload,
    PilgrimVerificationRequestPayload,
    PilgrimVerificationResponse,
    TransitionResponse
} from "../../../types/pilgrim/verification.types";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Guest Verification Request
 * For guests (unauthenticated) who want to register as a local guide.
 *
 * @param payload - The verification data
 * @returns Verification response
 */
export const requestGuestVerification = async (
    payload: GuestVerificationRequestPayload,
): Promise<ApiResponse<GuestVerificationResponse>> => {
    const formData = new FormData();

    formData.append("applicant_email", payload.applicant_email);
    formData.append("applicant_name", payload.applicant_name);
    if (payload.applicant_phone) formData.append("applicant_phone", payload.applicant_phone);

    formData.append("site_name", payload.site_name);
    if (payload.site_address) formData.append("site_address", payload.site_address);
    formData.append("site_province", payload.site_province);

    if (payload.site_type) formData.append("site_type", payload.site_type);
    if (payload.site_region) formData.append("site_region", payload.site_region);
    if (payload.introduction) formData.append("introduction", payload.introduction);

    if (payload.certificate) {
        formData.append("certificate", {
            uri: payload.certificate.uri,
            name: payload.certificate.name || "certificate.jpg",
            type: payload.certificate.type || "image/jpeg",
        } as any);
    }

    const response = await apiClient.post<ApiResponse<GuestVerificationResponse>>(
        PILGRIM_ENDPOINTS.VERIFICATION.GUEST_REQUEST,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        },
    );
    return response.data;
};

/**
 * Pilgrim Verification Request
 * For authenticated pilgrims who want to register as a local guide.
 *
 * @param payload - The verification data
 * @returns Verification response
 */
export const requestPilgrimVerification = async (
    payload: PilgrimVerificationRequestPayload,
): Promise<ApiResponse<PilgrimVerificationResponse>> => {
    const formData = new FormData();

    formData.append("site_name", payload.site_name);
    if (payload.site_address) formData.append("site_address", payload.site_address);
    formData.append("site_province", payload.site_province);

    if (payload.site_type) formData.append("site_type", payload.site_type);
    if (payload.site_region) formData.append("site_region", payload.site_region);
    if (payload.introduction) formData.append("introduction", payload.introduction);

    if (payload.certificate) {
        formData.append("certificate", {
            uri: payload.certificate.uri,
            name: payload.certificate.name || "certificate.jpg",
            type: payload.certificate.type || "image/jpeg",
        } as any);
    }

    const response = await apiClient.post<ApiResponse<PilgrimVerificationResponse>>(
        PILGRIM_ENDPOINTS.VERIFICATION.PILGRIM_REQUEST,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        },
    );
    return response.data;
};

/**
 * Get My Verification Request (Pilgrim only)
 *
 * @returns Verification response
 */
export const getMyVerificationRequest = async (): Promise<ApiResponse<PilgrimVerificationResponse>> => {
    const response = await apiClient.get<ApiResponse<PilgrimVerificationResponse>>(
        PILGRIM_ENDPOINTS.VERIFICATION.MY_REQUEST,
    );
    return response.data;
};

/**
 * Get Claimable Sites
 * Lấy danh sách các địa điểm có thể xin nhận quản lý
 * Bao gồm 2 loại:
 * - transition: Site đang active, có Manager hiện tại → xin thay thế Manager
 * - unassigned: Site do Admin tạo sẵn (is_active=false), chưa có Manager → xin nhận quản lý
 *
 * @param params - Query parameters (page, limit, search, region, type, claim_type)
 * @returns List of claimable sites with pagination
 */
export const getClaimableSites = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    region?: string;
    type?: string;
    claim_type?: string;
}): Promise<ApiResponse<ClaimableSitesResponse>> => {
    const response = await apiClient.get<ApiResponse<ClaimableSitesResponse>>(
        `${PILGRIM_ENDPOINTS.SITES.AVAILABLE}`,
        { params },
    );
    return response.data;
};

/**
 * Guest Transition Request
 * For guests (unauthenticated) who want to replace a manager of a site.
 *
 * @param payload - The transition data
 * @returns Transition response
 */
export const requestGuestTransition = async (
    payload: GuestTransitionRequestPayload,
): Promise<ApiResponse<TransitionResponse>> => {
    const formData = new FormData();

    formData.append("applicant_email", payload.applicant_email);
    formData.append("applicant_name", payload.applicant_name);
    if (payload.applicant_phone) formData.append("applicant_phone", payload.applicant_phone);

    formData.append("existing_site_id", payload.existing_site_id);
    formData.append("transition_reason", payload.transition_reason);

    if (payload.introduction) formData.append("introduction", payload.introduction);

    if (payload.certificate) {
        formData.append("certificate", {
            uri: payload.certificate.uri,
            name: payload.certificate.name || "certificate.jpg",
            type: payload.certificate.type || "image/jpeg",
        } as any);
    }

    const response = await apiClient.post<ApiResponse<TransitionResponse>>(
        PILGRIM_ENDPOINTS.VERIFICATION.GUEST_TRANSITION,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        },
    );
    return response.data;
};

/**
 * Pilgrim Transition Request
 * For authenticated pilgrims who want to replace a manager of a site.
 *
 * @param payload - The transition data
 * @returns Transition response
 */
export const requestPilgrimTransition = async (
    payload: PilgrimTransitionRequestPayload,
): Promise<ApiResponse<TransitionResponse>> => {
    const formData = new FormData();

    formData.append("existing_site_id", payload.existing_site_id);
    formData.append("transition_reason", payload.transition_reason);

    if (payload.introduction) formData.append("introduction", payload.introduction);

    if (payload.certificate) {
        formData.append("certificate", {
            uri: payload.certificate.uri,
            name: payload.certificate.name || "certificate.jpg",
            type: payload.certificate.type || "image/jpeg",
        } as any);
    }

    const response = await apiClient.post<ApiResponse<TransitionResponse>>(
        PILGRIM_ENDPOINTS.VERIFICATION.PILGRIM_TRANSITION,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        },
    );
    return response.data;
};

// ============================================
// EXPORT AS OBJECT
// ============================================

const pilgrimVerificationApi = {
    requestGuestVerification,
    requestPilgrimVerification,
    getMyVerificationRequest,
    getClaimableSites,
    requestGuestTransition,
    requestPilgrimTransition,
};

export default pilgrimVerificationApi;
