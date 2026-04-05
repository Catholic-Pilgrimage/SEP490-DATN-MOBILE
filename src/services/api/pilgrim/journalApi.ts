/**
 * Pilgrim Journal API
 * Handles journal operations for Pilgrims
 *
 * Endpoints:
 * - GET    /api/journals/me   - List my journals
 * - POST   /api/journals      - Create journal
 * - POST   /api/ai/suggest-prayer - Suggest prayer for spiritual journal
 * - DELETE /api/journals/:id  - Delete journal
 */

import { Platform } from "react-native";
import { suggestPrayer as suggestPrayerAI } from "../../ai";
import { ApiResponse } from "../../../types/api.types";
import {
  CreateJournalRequest,
  GetJournalsParams,
  GetJournalsResponse,
  JournalEntry,
  PrayerSuggestionResult,
  SuggestPrayerRequest,
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
 * Suggest a prayer while the pilgrim is writing a spiritual journal.
 *
 * Backward-compatible wrapper around the shared AI service.
 */
export const suggestPrayer = async (
  data: SuggestPrayerRequest,
): Promise<ApiResponse<PrayerSuggestionResult>> => {
  const response = await suggestPrayerAI(data);

  return {
    success: response.success,
    message: response.message ?? "",
    data: response.data
      ? {
          ...response.data,
          prayer: response.data.prayer_text,
          suggested_prayer: response.data.prayer_text,
          suggestion: response.data.prayer_text,
        }
      : undefined,
  };
};

/**
 * Create new journal with support for file uploads (images, audio, video)
 * Requires FormData if files are present.
 */
export const createJournal = async (
  data: CreateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const formData = new FormData();

  // 1. Append Text Fields (Required)
  formData.append("title", data.title);
  formData.append("content", data.content);
  formData.append("planner_item_id", data.planner_item_id); // Required - must be from checked-in location
  
  // Optional fields
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
 * Get journal details by ID
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
 * Update journal by ID
 * Supports partial updates and file uploads
 */
export const updateJournal = async (
  id: string,
  data: Partial<CreateJournalRequest>,
): Promise<ApiResponse<JournalEntry>> => {
  const formData = new FormData();

  // 1. Append Text Fields if they exist
  if (data.title !== undefined) formData.append("title", data.title);
  if (data.content !== undefined) formData.append("content", data.content);
  if (data.privacy !== undefined) formData.append("privacy", data.privacy);
  // planner_item_id is typically not updated, but if needed:
  if (data.planner_item_id !== undefined) formData.append("planner_item_id", data.planner_item_id);

  // 2. Append Images (Array) - This typically ADDS new images or REPLACES depending on backend logic.
  // Based on "Thêm ảnh mới" (Add new images) description in screenshot.
  if (data.images && data.images.length > 0) {
    data.images.forEach((uri, index) => {
      const fileType = uri.split('.').pop() || 'jpeg';
      const fileName = `image_${index}.${fileType}`;
      formData.append("images", {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: `image/${fileType}`,
        name: fileName,
      } as any);
    });
  }

  // 3. Append Audio (Single file)
  if (data.audio) {
    const uri = data.audio;
    const fileType = uri.split('.').pop() || 'm4a';
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

  const response = await apiClient.patch<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.UPDATE(id),
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
  suggestPrayer,
  createJournal,
  deleteJournal,
  getJournalDetail,
  updateJournal,
};

export default pilgrimJournalApi;
