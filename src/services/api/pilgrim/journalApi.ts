/**
 * Pilgrim Journal API
 * Handles journal operations for Pilgrims
 *
 * Endpoints:
 * - GET    /api/journals      - List journals
 * - POST   /api/journals      - Create journal
 * - GET    /api/journals/:id  - Get journal detail
 * - PUT    /api/journals/:id  - Update journal
 * - DELETE /api/journals/:id  - Delete journal
 * - POST   /api/journals/:id/share - Share journal
 */

import { ApiResponse, PaginatedResponse } from "../../../types/api.types";
import {
    CreateJournalRequest,
    GetJournalsParams,
    JournalEntry,
    JournalSummary,
    UpdateJournalRequest,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of journals
 */
export const getJournals = async (
  params?: GetJournalsParams,
): Promise<PaginatedResponse<JournalSummary>> => {
  const response = await apiClient.get<PaginatedResponse<JournalSummary>>(
    PILGRIM_ENDPOINTS.JOURNAL.LIST,
    { params },
  );
  return response.data;
};

/**
 * Get journal detail
 */
export const getJournalDetail = async (
  id: string,
): Promise<ApiResponse<JournalEntry>> => {
  const response = await apiClient.get<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.DETAIL(id),
  );
  return response.data;
};

/**
 * Create new journal
 */
export const createJournal = async (
  data: CreateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const response = await apiClient.post<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.CREATE,
    data,
  );
  return response.data;
};

/**
 * Update journal
 */
export const updateJournal = async (
  id: string,
  data: UpdateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const response = await apiClient.put<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.UPDATE(id),
    data,
  );
  return response.data;
};

/**
 * Delete journal
 */
export const deleteJournal = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.JOURNAL.DELETE(id),
  );
  return response.data;
};

/**
 * Share journal
 */
export const shareJournal = async (
  id: string,
): Promise<ApiResponse<{ shareUrl: string }>> => {
  const response = await apiClient.post<ApiResponse<{ shareUrl: string }>>(
    PILGRIM_ENDPOINTS.JOURNAL.SHARE(id),
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimJournalApi = {
  getJournals,
  getJournalDetail,
  createJournal,
  updateJournal,
  deleteJournal,
  shareJournal,
};

export default pilgrimJournalApi;
