/**
 * Local Guide — API thuyết minh âm thanh cho Model 3D (TTS & upload file).
 *
 * Backend (tham chiếu khi debug):
 * - `SEP490-DATN-BACKEND/controllers/localGuide/narrativeController.js`
 * - `SEP490-DATN-BACKEND/routes/localGuide.routes.js` (GET voices, PUT/DELETE narrative)
 *
 * Quy ước:
 * - Mọi call dùng `apiClient` (token + base URL) giống `mediaApi`.
 * - PUT luôn `multipart/form-data` (backend dùng multer `uploadNarrativeAudio.single('audio_file')`;
 *   vẫn nhận body field khi không có file).
 */

import type { ApiResponse } from "../../../types/api.types";
import type {
  GetTtsVoicesParams,
  NarrativeDeleteResult,
  NarrativeUpdateResult,
  TtsVoiceOption,
  UpdateNarrativeRequest,
} from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// GET — danh sách giọng TTS
// ============================================

/**
 * GET /api/local-guide/media/voices
 *
 * @param params.language - Optional: lọc `vi` | `en` | … (khớp field `language` của voice)
 */
export async function getTtsVoices(
  params?: GetTtsVoicesParams,
): Promise<ApiResponse<TtsVoiceOption[]>> {
  const response = await apiClient.get<ApiResponse<TtsVoiceOption[]>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.TTS_VOICES,
    { params: params?.language ? { language: params.language } : undefined },
  );
  return response.data;
}

// ============================================
// PUT — cập nhật narrative (TTS hoặc audio)
// ============================================

function buildNarrativeFormData(payload: UpdateNarrativeRequest): FormData {
  const formData = new FormData();

  if (payload.source === "tts") {
    formData.append("narration_text", payload.narrationText.trim());
    if (payload.voice) {
      formData.append("voice", payload.voice);
    }
    return formData;
  }

  // React Native FormData file shape (giống `mediaApi.uploadMedia`)
  formData.append("audio_file", {
    uri: payload.audioFile.uri,
    name: payload.audioFile.name,
    type: payload.audioFile.type,
  } as any);

  if (payload.narrationText?.trim()) {
    formData.append("narration_text", payload.narrationText.trim());
  }

  return formData;
}

/**
 * PUT /api/local-guide/media/:mediaId/narrative
 *
 * - **TTS**: `source: "tts"` + `narrationText` (≥3 ký tự, ≤5000 — validate backend).
 *   Response thường có `narrative_status: "processing"` cho đến khi webhook VBee xong.
 * - **Audio**: `source: "audio"` + `audioFile` (mp3/wav theo cấu hình server).
 *
 * Không gọi được khi `narrative_status === "approved"` (backend 403).
 */
export async function updateModelNarrative(
  mediaId: string,
  payload: UpdateNarrativeRequest,
): Promise<ApiResponse<NarrativeUpdateResult>> {
  const formData = buildNarrativeFormData(payload);

  const response = await apiClient.put<ApiResponse<NarrativeUpdateResult>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.NARRATIVE(mediaId),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return response.data;
}

// ============================================
// DELETE — gỡ thuyết minh
// ============================================

/**
 * DELETE /api/local-guide/media/:mediaId/narrative
 *
 * Chỉ khi narrative chưa approved (backend 403 nếu đã duyệt).
 */
export async function deleteModelNarrative(
  mediaId: string,
): Promise<ApiResponse<NarrativeDeleteResult>> {
  const response = await apiClient.delete<ApiResponse<NarrativeDeleteResult>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_MEDIA.NARRATIVE(mediaId),
  );
  return response.data;
}

// ============================================
// Default export (cùng pattern guideMediaApi)
// ============================================

const guideNarrativeApi = {
  getTtsVoices,
  updateModelNarrative,
  deleteModelNarrative,
};

export default guideNarrativeApi;
