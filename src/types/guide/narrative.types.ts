/**
 * Local Guide — Thuyết minh âm thanh cho Model 3D (TTS & upload audio).
 *
 * Backend: `SEP490-DATN-BACKEND/controllers/localGuide/narrativeController.js`
 * Routes:  `routes/localGuide.routes.js` — GET media/voices, PUT/DELETE media/:id/narrative
 */

import type { MediaNarrativeStatus, RNFileObject } from "./media.types";

// ============================================
// STATUS & VOICES
// ============================================

/** Đồng bộ {@link MediaNarrativeStatus} trên `MediaItem`. */
export type NarrativeStatus = MediaNarrativeStatus;

/** Giọng TTS (VBee) — GET /api/local-guide/media/voices */
export interface TtsVoiceOption {
  id: string;
  name: string;
  gender: string;
  region: string;
  language: string;
  quality: string;
  /** URL file âm thanh demo để nghe thử giọng (VBee cung cấp). */
  demo?: string;
}

export interface GetTtsVoicesParams {
  /** Lọc theo mã ngôn ngữ, ví dụ `vi`, `en` */
  language?: string;
}

// ============================================
// PUT /media/:id/narrative — multipart/form-data
// ============================================

/**
 * Gửi text → backend gọi VBee TTS (async); response thường có `narrative_status: processing`.
 * Body fields: `narration_text`, optional `voice`.
 */
export interface UpdateNarrativeTtsBody {
  narrationText: string;
  /** Mã giọng VBee (vd. từ {@link getTtsVoices}); tùy chọn — backend có default theo region site */
  voice?: string;
}

/**
 * Upload file âm thanh (.mp3/.wav theo cấu hình backend).
 * Body fields: `audio_file` (file), optional `narration_text` (ghi chú/kịch bản lưu kèm).
 */
export interface UpdateNarrativeAudioBody {
  audioFile: RNFileObject;
  /** Text kèm theo (optional) — backend lưu `narration_text` */
  narrationText?: string;
}

export type UpdateNarrativeRequest =
  | ({ source: "tts" } & UpdateNarrativeTtsBody)
  | ({ source: "audio" } & UpdateNarrativeAudioBody);

/**
 * Payload trả về sau PUT narrative (cấu trúc thực tế từ ResponseUtil.success).
 * Một số field có thể null tùy nhánh TTS vs upload.
 */
export interface NarrativeUpdateResult {
  id: string;
  audio_url: string | null;
  narration_text: string | null;
  /** Trạng thái duyệt media (ảnh/video/3D), không nhầm với narrative_status */
  status?: string;
  narrative_status: NarrativeStatus | null;
  is_active?: boolean;
  /** Thông điệp gợi ý (vd. TTS đang xử lý) */
  message?: string;
}

/** DELETE narrative — reset các trường liên quan */
export interface NarrativeDeleteResult {
  id: string;
  audio_url: null;
  narration_text: null;
  narrative_status: null;
}
