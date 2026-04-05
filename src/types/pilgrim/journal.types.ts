/**
 * Pilgrim Types - Journal
 * Type definitions for Pilgrim Journal feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Journal visibility
 */
export type JournalVisibility = "private" | "public" | "friends";

/**
 * Journal mood
 */
export type JournalMood =
  | "peaceful"
  | "grateful"
  | "joyful"
  | "reflective"
  | "hopeful"
  | "blessed";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Get Journals Response Structure
 */
export interface GetJournalsResponse {
  message: string;
  data: {
    journals: JournalSummary[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

/**
 * Journal entry
 */
export type JournalType = 'point' | 'summary';
export type LocationScope = 'single_site' | 'multi_site';
export type SiteSource = 'journal.site' | 'plannerItem.site' | 'checked_in_sites' | null;

export interface JournalEntry {
  id: string;
  user_id: string;
  site_id: string;
  planner_item_id?: string | string[] | null; // UUID[] từ BE có thể về dạng array hoặc postgres array string
  planner_item_ids?: string[] | string | null; // Alias tương thích nếu BE trả field plural
  planner_id?: string; // ID kế hoạch hành hương được lấy tự động từ check-in
  title: string;
  content: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string[]; // Response has image_url array
  privacy: JournalVisibility;
  author?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
  /**
   * site = null có chủ đích khi location_scope = 'multi_site'
   * Không hiển thị location row trong trường hợp này.
   */
  site?: {
    id: string;
    name: string;
    code: string;
    province: string;
  } | null;
  planner?: {
    id: string;
    name: string;
    status?: string;
  };
  /** ID site đã được suy ra (có thể khác site_id gốc nếu resolve từ plannerItem) */
  resolved_site_id?: string | null;
  /** 'point' = nhật ký 1 địa điểm, 'summary' = tổng kết nhiều địa điểm */
  journal_type?: JournalType;
  /** 'single_site' = có 1 site hiển thị, 'multi_site' = nhiều site → ẩn location row */
  location_scope?: LocationScope;
  /** Nguồn suy ra site: 'journal.site' | 'plannerItem.site' | 'checked_in_sites' | null */
  site_source?: SiteSource;
  created_at: string;
  updated_at: string;
}

/**
 * Journal summary (for lists)
 */
export interface JournalSummary extends JournalEntry { } // Assuming summary has same fields for now or similar subset

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create journal request
 */
export interface CreateJournalRequest {
  title: string;
  content: string;
  planner_item_id?: string; // Fallback cho backend chỉ nhận 1 planner item
  planner_item_ids: string[]; // Mảng ID các planner items đã check-in (multi-select)
  planner_id?: string; // ID kế hoạch - lấy từ selectedPlanner.id
  privacy?: JournalVisibility;
  images?: string[]; // Local URIs to upload - Tối đa 10 ảnh (jpg, png, jpeg, webp), max 10MB
  audio?: string; // Local URI to upload - File audio (mp3, wav, m4a, ogg, aac), max 100MB
  video?: string; // Local URI to upload - File video (mp4, mov, avi, webm), max 100MB
}

/**
 * Update journal request
 */
export interface UpdateJournalRequest extends Partial<CreateJournalRequest> {
  image_url?: string[];
  audio_url?: string | null;
  video_url?: string | null;
  clear_images?: boolean;
  clear_audio?: boolean;
  clear_video?: boolean;
}

/**
 * Get journals params
 */
export interface GetJournalsParams {
  visibility?: JournalVisibility;
  siteId?: string;
  page?: number;
  limit?: number;
}
