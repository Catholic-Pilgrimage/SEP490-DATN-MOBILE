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
  rating: number;
  content: string;
  response?: string;
  createdAt: string;
}
