/**
 * Report API
 * Handles content reporting (posts, comments, users)
 */

import { ApiResponse, PaginationParams } from "../../../types/api.types";
import {
  CreateReportRequest,
  GetMyReportsResponse,
  ReportEntity,
} from "../../../types/report.types";
import apiClient from "../apiClient";
import { SHARED_ENDPOINTS } from "../endpoints";

/**
 * Create a new report
 */
export const createReport = async (
  data: CreateReportRequest,
): Promise<ApiResponse<ReportEntity>> => {
  const response = await apiClient.post<ApiResponse<ReportEntity>>(
    SHARED_ENDPOINTS.REPORTS.CREATE,
    data,
  );
  return response.data;
};

/**
 * Get my reports
 */
export const getMyReports = async (
  params?: PaginationParams,
): Promise<ApiResponse<GetMyReportsResponse>> => {
  const response = await apiClient.get<ApiResponse<GetMyReportsResponse>>(
    SHARED_ENDPOINTS.REPORTS.MY_REPORTS,
    { params },
  );
  return response.data;
};

/**
 * Get report detail
 */
export const getReportDetail = async (
  id: string,
): Promise<ApiResponse<ReportEntity>> => {
  const response = await apiClient.get<ApiResponse<ReportEntity>>(
    SHARED_ENDPOINTS.REPORTS.DETAIL(id),
  );
  return response.data;
};

/**
 * Delete my report
 */
export const deleteReport = async (
  id: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    SHARED_ENDPOINTS.REPORTS.DELETE(id),
  );
  return response.data;
};

const reportApi = {
  createReport,
  getMyReports,
  getReportDetail,
  deleteReport,
};

export default reportApi;
