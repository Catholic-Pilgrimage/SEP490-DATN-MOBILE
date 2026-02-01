/**
 * Pilgrim Types - Site
 * Type definitions for Pilgrim Site/Explore features
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Site region
 */
export type SiteRegion = "Bac" | "Trung" | "Nam";

/**
 * Site type
 */
export type SiteType = "church" | "shrine" | "monastery" | "center" | "other";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Site for pilgrim view
 */
export interface Site {
  id: string;
  code: string;
  name: string;
  description: string;
  address: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  region: SiteRegion;
  type: SiteType;
  patronSaint?: string;
  coverImage: string;
  images: string[];
  rating: number;
  reviewCount: number;
  isFavorite: boolean;
  distance?: number; // in km, for nearby searches
  openingHours?: {
    open: string;
    close: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Site summary (for lists)
 */
export interface SiteSummary {
  id: string;
  name: string;
  address: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  isFavorite: boolean;
  type: SiteType;
}

/**
 * Nearby site
 */
export interface NearbySite extends SiteSummary {
  latitude: number;
  longitude: number;
  distance: number; // in km
}

/**
 * Featured site
 */
export interface FeaturedSite extends SiteSummary {
  description: string;
  featuredReason?: string;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Search sites params
 */
export interface SearchSitesParams {
  query?: string;
  region?: SiteRegion;
  type?: SiteType;
  page?: number;
  limit?: number;
}

/**
 * Nearby sites params
 */
export interface NearbySitesParams {
  latitude: number;
  longitude: number;
  radius?: number; // in km, default 10
  limit?: number;
}

/**
 * Site review
 */
export interface SiteReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create review request
 */
export interface CreateReviewRequest {
  rating: number;
  content: string;
  images?: string[];
}
