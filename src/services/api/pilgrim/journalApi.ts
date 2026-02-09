/**
 * Pilgrim Journal API
 * Handles journal operations for Pilgrims
 *
 * Endpoints:
 * - GET    /api/journals/me   - List my journals
 * - POST   /api/journals      - Create journal
 * - DELETE /api/journals/:id  - Delete journal
 */

import { Platform } from "react-native";
import { ApiResponse } from "../../../types/api.types";
import {
  CreateJournalRequest,
  GetJournalsParams,
  GetJournalsResponse,
  JournalEntry,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of MY journals (private & public)
 */
export const getMyJournals = async (
  params?: GetJournalsParams,
): Promise<GetJournalsResponse> => {
  const response = await apiClient.get<GetJournalsResponse>(
    PILGRIM_ENDPOINTS.JOURNAL.ME,
    { params },
  );
  return response.data;
};

/**
 * Create new journal with support for file uploads (images, audio, video)
 * Requires FormData if files are present.
 */
export const createJournal = async (
  data: CreateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const formData = new FormData();

  // 1. Append Text Fields
  formData.append("title", data.title);
  formData.append("content", data.content);
  formData.append("planner_item_id", data.planner_item_id);
  if (data.privacy) {
    formData.append("privacy", data.privacy);
  }

  // 2. Append Images (Array)
  if (data.images && data.images.length > 0) {
    data.images.forEach((uri, index) => {
      const fileType = uri.split('.').pop() || 'jpeg';
      const fileName = `image_${index}.${fileType}`;
      formData.append("images", {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: `image/${fileType}`, // simplified mime type inference
        name: fileName,
      } as any);
    });
  }

  // 3. Append Audio (Single file)
  if (data.audio) {
    const uri = data.audio;
    const fileType = uri.split('.').pop() || 'm4a'; // default audio ext
    formData.append("audio", {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: `audio/${fileType}`,
      name: `audio.${fileType}`,
    } as any);
  }

  // 4. Append Video (Single file)
  if (data.video) {
    const uri = data.video;
    const fileType = uri.split('.').pop() || 'mp4';
    formData.append("video", {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: `video/${fileType}`,
      name: `video.${fileType}`,
    } as any);
  }

  const response = await apiClient.post<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.CREATE,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
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

// ============================================
// EXPORT
// ============================================

const pilgrimJournalApi = {
  getMyJournals,
  createJournal,
  deleteJournal,
};

export default pilgrimJournalApi;
