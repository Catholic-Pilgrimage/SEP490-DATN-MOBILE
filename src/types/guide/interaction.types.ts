/**
 * Guide Types - Interaction
 * Type definitions for Local Guide Interaction features (messages, reviews)
 */

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Message
 */
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Review
 */
export interface Review {
  id: string;
  pilgrimId: string;
  pilgrimName: string;
  pilgrimAvatar?: string;
  siteId: string;
  siteName: string;
  targetType?: "site" | "nearby_place";
  nearbyPlaceId?: string;
  nearbyPlaceName?: string;
  rating: number;
  content: string;
  response?: string;
  createdAt: string;
  responseUpdatedAt?: string;
}

export interface ReviewSummary {
  avgRating: number;
  totalReviews: number;
  ratingDistribution?: Record<string, number>;
}

export interface ReviewPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ReviewListData {
  data: Review[];
  pagination: ReviewPagination;
  siteReviews: Review[];
  nearbyPlaceReviews: Review[];
  siteSummary?: ReviewSummary;
  sitePagination: ReviewPagination;
  nearbyPlacePagination: ReviewPagination;
}

export interface GetReviewsParams {
  page?: number;
  limit?: number;
  type?: "all" | "site" | "nearby_place";
  has_reply?: boolean | "true" | "false";
  sort?: "newest" | "oldest" | "highest" | "lowest";
}

export interface ReviewReplyRequest {
  content: string;
}
