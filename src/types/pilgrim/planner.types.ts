/**
 * Pilgrim Types - Planner
 * Type definitions for Pilgrim Trip Planner feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Plan status
 */
export type PlanStatus =
  | "draft"
  | "planned"
  | "ongoing"
  | "completed"
  | "cancelled";

/**
 * Backend Plan Entity (matches API response)
 */
export interface PlanEntity {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  number_of_days: number;
  number_of_people: number;
  transportation: string;
  budget_level: string;
  status: string;
  is_public: boolean;
  share_token: string;
  share_role: string;
  owner: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  items_by_day?: Record<string, PlanItem[]>;
}

export interface PlanItem {
  id: string;
  uuid?: string; // Sometimes ID might be passed as uuid or id? keeping generic
  planner_id?: string;
  site_id?: string;
  day_number?: number;
  order_index?: number;
  note?: string; // API uses 'note'
  site: {
    id?: string;
    name: string;
    image?: string;
    address?: string;
    cover_image?: string;
    latitude?: number;
    longitude?: number;
  };
  arrival_time?: string;
  departure_time?: string;
}

export interface AddPlanItemRequest {
  site_id: string;
  day_number: number;
  note?: string;
}

export interface AddPlanItemResponse {
  item: PlanItem;
}

export interface ReorderPlanItemsRequest {
  day_number: number;
  item_ids: string[];
}

export interface ReorderPlanItemsResponse {
  items: PlanItem[];
}

export interface GetPlansResponse {
  planners: PlanEntity[];
  pagination: {
    page: number
    limit: number;
    totalItems?: number; // backend might use different key, but for now assuming standard
    totalPages?: number;
  };
}

/**
 * Transportation type
 */
export type TransportationType =
  | "car"
  | "bus"
  | "train"
  | "plane"
  | "walk"
  | "other";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Plan stop/destination
 */
export interface PlanStop {
  id: string;
  siteId: string;
  siteName: string;
  siteImage: string;
  order: number;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}

/**
 * Trip plan
 */
export interface TripPlan {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  stops: PlanStop[];
  transportation?: TransportationType;
  estimatedBudget?: number;
  notes?: string;
  isShared: boolean;
  participants: PlanParticipant[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Plan participant
 */
export interface PlanParticipant {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

/**
 * Plan summary (for lists)
 */
export interface PlanSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  stopCount: number;
  coverImage?: string;
  participantCount: number;
  isShared?: boolean;
  transportation?: TransportationType[];
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create plan request
 */
export interface CreatePlanRequest {
  name: string;
  start_date: string;
  number_of_days: number;
  number_of_people: number;
  transportation: string; // or TransportationType
  budget_level: string; // 'low' | 'medium' | 'high'
  is_public?: boolean;
}

/**
 * Update plan request
 */
export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  status?: PlanStatus;
}

/**
 * Add stop request
 */
export interface AddStopRequest {
  siteId: string;
  order?: number;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}

/**
 * Invite participant request
 */
export interface InviteParticipantRequest {
  userId: string;
  role: "editor" | "viewer";
}

/**
 * AI suggestion request
 */
export interface AISuggestionRequest {
  region?: string;
  duration: number; // days
  interests?: string[];
  startLocation?: {
    latitude: number;
    longitude: number;
  };
}
