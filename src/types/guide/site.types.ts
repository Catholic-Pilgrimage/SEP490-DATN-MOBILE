/**
 * Guide Types - Site
 * Type definitions for Local Guide Site feature
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

/**
 * Site status for guide-managed sites
 */
export type GuideSiteStatus = "draft" | "pending" | "published" | "rejected";

// ============================================
// NESTED TYPES
// ============================================

/**
 * Opening hours
 */
export interface OpeningHours {
  open: string;
  close: string;
}

/**
 * Contact information
 */
export interface ContactInfo {
  phone?: string;
  email?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Local Guide's assigned site
 * GET /api/local-guide/site
 */
export interface LocalGuideSite {
  id: string;
  code: string;
  name: string;
  description: string;
  history: string;
  address: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  region: SiteRegion;
  type: SiteType;
  patron_saint: string;
  cover_image: string;
  opening_hours: OpeningHours;
  contact_info: ContactInfo;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Guide-managed site (for site management feature)
 */
export interface GuideSite {
  id: string;
  name: string;
  description: string;
  address: string;
  region: string;
  images: string[];
  status: GuideSiteStatus;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create site request
 */
export interface CreateSiteRequest {
  name: string;
  description: string;
  address: string;
  regionId: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Update site request
 */
export interface UpdateSiteRequest extends Partial<CreateSiteRequest> {
  status?: "draft" | "pending";
}
