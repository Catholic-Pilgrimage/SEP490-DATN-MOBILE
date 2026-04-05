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
  UpdateJournalRequest,
} from "../../../types/pilgrim";
import { getAudioUploadMeta } from "../../../utils/audioUpload";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// HELPERS
// ============================================

const appendPlannerItemFields = (
  formData: FormData,
  data: Pick<Partial<CreateJournalRequest>, "planner_item_id" | "planner_item_ids">,
) => {
  const plannerItemIds = Array.from(
    new Set([...(data.planner_item_ids ?? []), ...(data.planner_item_id ? [data.planner_item_id] : [])].filter(Boolean)),
  );

  plannerItemIds.forEach((id) => {
    formData.append("planner_item_id[]", id);
  });
};

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
 */
export const createJournal = async (
  data: CreateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("content", data.content);

  appendPlannerItemFields(formData, data);

  if (data.planner_id) formData.append("planner_id", data.planner_id);
  if (data.privacy) formData.append("privacy", data.privacy);

  if (data.images && data.images.length > 0) {
    data.images.forEach((uri, index) => {
      const fileType = uri.split('.').pop() || 'jpeg';
      formData.append("images", {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: `image/${fileType}`,
        name: `image_${index}.${fileType}`,
      } as any);
    });
  }

  if (data.audio) {
    const { extension, mimeType } = getAudioUploadMeta(data.audio);
    formData.append("audio", {
      uri: Platform.OS === 'ios' ? data.audio.replace('file://', '') : data.audio,
      type: mimeType,
      name: `audio.${extension}`,
    } as any);
  }

  if (data.video) {
    const fileType = data.video.split('.').pop() || 'mp4';
    formData.append("video", {
      uri: Platform.OS === 'ios' ? data.video.replace('file://', '') : data.video,
      type: `video/${fileType}`,
      name: `video.${fileType}`,
    } as any);
  }

  const response = await apiClient.post<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.CREATE,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
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
 */
export const updateJournal = async (
  id: string,
  data: UpdateJournalRequest,
): Promise<ApiResponse<JournalEntry>> => {
  const formData = new FormData();

  if (data.title !== undefined) formData.append("title", data.title);
  if (data.content !== undefined) formData.append("content", data.content);
  if (data.privacy !== undefined) formData.append("privacy", data.privacy);
  appendPlannerItemFields(formData, data);
  if (data.image_url !== undefined) {
    formData.append("image_url", JSON.stringify(data.image_url));
  }
  if (data.audio_url !== undefined) {
    formData.append("audio_url", data.audio_url ?? "");
  }
  if (data.video_url !== undefined) {
    formData.append("video_url", data.video_url ?? "");
  }
  if (data.clear_images !== undefined) {
    formData.append("clear_images", String(data.clear_images));
  }
  if (data.clear_audio !== undefined) {
    formData.append("clear_audio", String(data.clear_audio));
  }
  if (data.clear_video !== undefined) {
    formData.append("clear_video", String(data.clear_video));
  }

  if (data.images && data.images.length > 0) {
    data.images.forEach((uri, index) => {
      const fileType = uri.split('.').pop() || 'jpeg';
      formData.append("images", {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: `image/${fileType}`,
        name: `image_${index}.${fileType}`,
      } as any);
    });
  }

  if (data.audio) {
    const { extension, mimeType } = getAudioUploadMeta(data.audio);
    formData.append("audio", {
      uri: Platform.OS === 'ios' ? data.audio.replace('file://', '') : data.audio,
      type: mimeType,
      name: `audio.${extension}`,
    } as any);
  }

  if (data.video) {
    const fileType = data.video.split('.').pop() || 'mp4';
    formData.append("video", {
      uri: Platform.OS === 'ios' ? data.video.replace('file://', '') : data.video,
      type: `video/${fileType}`,
      name: `video.${fileType}`,
    } as any);
  }

  const response = await apiClient.patch<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.UPDATE(id),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
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
 * Share journal to community (tạo post từ journal)
 */
export const shareJournal = async (id: string): Promise<ApiResponse<any>> => {
  const response = await apiClient.post<ApiResponse<any>>(
    PILGRIM_ENDPOINTS.JOURNAL.SHARE(id),
  );
  return response.data;
};

/**
 * Restore a soft-deleted journal (patch is_active back to true)
 */
export const restoreJournal = async (id: string): Promise<ApiResponse<JournalEntry>> => {
  const response = await apiClient.patch<ApiResponse<JournalEntry>>(
    PILGRIM_ENDPOINTS.JOURNAL.RESTORE(id),
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
  getJournalDetail,
  updateJournal,
  shareJournal,
  restoreJournal,
};

export default pilgrimJournalApi;
