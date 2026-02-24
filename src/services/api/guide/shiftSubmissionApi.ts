import {
    CreateShiftSubmissionRequest,
    CreateShiftSubmissionResponse,
    GetShiftSubmissionDetailResponse,
    GetShiftSubmissionsParams,
    GetShiftSubmissionsResponse,
    UpdateShiftSubmissionRequest
} from "../../../types/guide/shiftSubmission.types";
import { apiClient } from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

/**
 * Lấy danh sách đăng ký lịch làm việc
 * GET /api/local-guide/shift-submissions
 */
export const getShiftSubmissions = async (
    params?: GetShiftSubmissionsParams
): Promise<GetShiftSubmissionsResponse> => {
    try {
        const response = await apiClient.get<GetShiftSubmissionsResponse>(
            GUIDE_ENDPOINTS.SHIFT_SUBMISSIONS.list,
            { params }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Tạo đăng ký lịch làm việc mới
 * POST /api/local-guide/shift-submissions
 */
export const createShiftSubmission = async (
    data: CreateShiftSubmissionRequest
): Promise<CreateShiftSubmissionResponse> => {
    try {
        const response = await apiClient.post<CreateShiftSubmissionResponse>(
            GUIDE_ENDPOINTS.SHIFT_SUBMISSIONS.create,
            data
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Hủy đăng ký lịch làm việc
 * DELETE /api/local-guide/shift-submissions/:id
 */
export const deleteShiftSubmission = async (
    id: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            GUIDE_ENDPOINTS.SHIFT_SUBMISSIONS.delete(id)
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Cập nhật đăng ký lịch làm việc
 * PUT /api/local-guide/shift-submissions/:id
 */
export const updateShiftSubmission = async (
    id: string,
    data: UpdateShiftSubmissionRequest
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient.put<{ success: boolean; message: string }>(
            GUIDE_ENDPOINTS.SHIFT_SUBMISSIONS.update(id),
            data
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};



/**
 * Lấy chi tiết đăng ký lịch làm việc
 * GET /api/local-guide/shift-submissions/:id
 */
export const getShiftSubmissionDetail = async (
    id: string
): Promise<GetShiftSubmissionDetailResponse> => {
    try {
        const response = await apiClient.get<GetShiftSubmissionDetailResponse>(
            GUIDE_ENDPOINTS.SHIFT_SUBMISSIONS.detail(id)
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

const shiftSubmissionApi = {
    getShiftSubmissions,
    getShiftSubmissionDetail,
    createShiftSubmission,
    deleteShiftSubmission,
    updateShiftSubmission,
};

export default shiftSubmissionApi;
