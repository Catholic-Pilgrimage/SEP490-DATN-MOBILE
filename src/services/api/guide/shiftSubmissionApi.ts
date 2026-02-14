import {
    CreateShiftSubmissionRequest,
    CreateShiftSubmissionResponse,
    GetShiftSubmissionsParams,
    GetShiftSubmissionsResponse,
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

const shiftSubmissionApi = {
    getShiftSubmissions,
    createShiftSubmission,
};

export default shiftSubmissionApi;
