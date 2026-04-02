/**
 * Pilgrim Site Types
 */

// Enums
import {
    DayOfWeek,
    NearbyPlaceCategory,
    SiteMediaType,
    SiteRegion,
    SiteType,
} from "../common.types";

// Site Base
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
  distance?: number;
  openingHours?: { open: string; close: string };
  contactInfo?: { phone?: string; email?: string; website?: string };
  history?: string;
  createdAt: string;
  updatedAt: string;
}

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
  region?: "Bac" | "Trung" | "Nam";
  latitude?: number;
  longitude?: number;
  /** Bổn mạng — dùng lọc/ghi chú khi thêm điểm vào kế hoạch nhóm. */
  patronSaint?: string;
}

export interface NearbySite extends SiteSummary {
  latitude: number;
  longitude: number;
  distance: number;
}

// Favorites
export interface FavoriteResponseData {
  site_id: string;
  site_name: string;
}

export interface FavoriteResponse {
  success: boolean;
  message: string;
  data: FavoriteResponseData;
}

export interface FavoriteSite {
  id: string;
  code: string;
  name: string;
  description: string;
  address: string;
  province: string;
  district: string;
  region: SiteRegion;
  type: SiteType;
  patron_saint: string;
  cover_image: string;
  opening_hours: { open?: string; close?: string } | Record<string, never>;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
}

export interface GetFavoritesResponse {
  success: boolean;
  message: string;
  data: {
    sites: FavoriteSite[];
    pagination: {
      page: number;
      limit: number;
      totalItems?: number;
      totalPages?: number;
    };
  };
}

export interface FeaturedSite extends SiteSummary {
  description: string;
  featuredReason?: string;
}

// Site Media
export interface SiteMedia {
  id: string;
  code: string;
  url: string;
  type: SiteMediaType;
  caption?: string;
  created_at: string;
}

export interface GetSiteMediaParams {
  page?: number;
  limit?: number;
  type?: SiteMediaType;
}

export interface SiteMediaResponse {
  success: boolean;
  data: {
    site: { id: string; code: string; name: string };
    data: SiteMedia[];
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

// Mass Schedules
export interface SiteMassSchedule {
  id: string;
  code: string;
  days_of_week: DayOfWeek[];
  time: string;
  note?: string;
  created_at: string;
}

export interface GetSiteMassSchedulesParams {
  day_of_week?: DayOfWeek;
}

export interface SiteMassScheduleResponse {
  success: boolean;
  data: {
    site: { id: string; code: string; name: string };
    data: SiteMassSchedule[];
  };
}

// Events
export interface SiteEvent {
  id: string;
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  banner_url?: string;
  created_at: string;
}

export interface GetSiteEventsParams {
  page?: number;
  limit?: number;
  upcoming?: "true" | "false";
  start_date?: string;
  end_date?: string;
}

export interface SiteEventResponse {
  success: boolean;
  data: {
    site: { id: string; code: string; name: string };
    data: SiteEvent[];
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

// Nearby Places
export interface SiteNearbyPlace {
  id: string;
  code: string;
  name: string;
  category: NearbyPlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  phone?: string;
  description?: string;
}

export interface GetSiteNearbyPlacesParams {
  page?: number;
  limit?: number;
  category?: NearbyPlaceCategory;
}

export interface SiteNearbyPlaceResponse {
  success: boolean;
  message?: string;
  data: {
    site: { id: string; code: string; name: string };
    data: SiteNearbyPlace[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

// Reviews
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

export interface CreateReviewRequest {
  rating: number;
  content: string;
  images?: string[];
}

// Search
export interface SearchSitesParams {
  query?: string;
  region?: SiteRegion;
  type?: SiteType;
  province?: string;
  page?: number;
  limit?: number;
  has_events?: "true" | "false";
  start_date?: string;
  end_date?: string;
}

export interface NearbySitesParams {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}
