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
 * Journal entry
 */
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: JournalMood;
  images: string[];
  siteId?: string;
  siteName?: string;
  visibility: JournalVisibility;
  likes: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Journal summary (for lists)
 */
export interface JournalSummary {
  id: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  mood?: JournalMood;
  siteName?: string;
  visibility: JournalVisibility;
  createdAt: string;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create journal request
 */
export interface CreateJournalRequest {
  title: string;
  content: string;
  mood?: JournalMood;
  images?: string[];
  siteId?: string;
  visibility?: JournalVisibility;
}

/**
 * Update journal request
 */
export interface UpdateJournalRequest extends Partial<CreateJournalRequest> {}

/**
 * Get journals params
 */
export interface GetJournalsParams {
  visibility?: JournalVisibility;
  siteId?: string;
  page?: number;
  limit?: number;
}
