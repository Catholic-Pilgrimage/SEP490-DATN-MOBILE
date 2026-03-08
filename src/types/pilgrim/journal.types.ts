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
export interface JournalEntry {
  id: string;
  user_id: string;
  site_id: string;
  planner_item_id?: string; // Optional in response?
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
  site?: {
    id: string;
    name: string;
    code: string;
    province: string;
  };
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
  planner_item_id: string; // Required - ID của planner item đã check-in
  privacy?: JournalVisibility;
  images?: string[]; // Local URIs to upload - Tối đa 10 ảnh (jpg, png, jpeg, webp), max 10MB
  audio?: string; // Local URI to upload - File audio (mp3, wav, m4a, ogg, aac), max 100MB
  video?: string; // Local URI to upload - File video (mp4, mov, avi, webm), max 100MB
}

/**
 * Update journal request
 */
export interface UpdateJournalRequest extends Partial<CreateJournalRequest> { }

/**
 * Get journals params
 */
export interface GetJournalsParams {
  visibility?: JournalVisibility;
  siteId?: string;
  page?: number;
  limit?: number;
}
