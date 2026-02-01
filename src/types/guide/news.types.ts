/**
 * Guide Types - News
 * Type definitions for Local Guide News feature
 */

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * News item
 */
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  siteId?: string;
  siteName?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create news request
 */
export interface CreateNewsRequest {
  title: string;
  content: string;
  coverImage?: string;
  siteId?: string;
  isPublished?: boolean;
}

/**
 * Update news request
 */
export interface UpdateNewsRequest extends Partial<CreateNewsRequest> {}
