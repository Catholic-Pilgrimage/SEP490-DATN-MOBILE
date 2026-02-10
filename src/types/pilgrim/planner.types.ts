/**
 * Pilgrim Types - Planner
 * Type definitions for Pilgrim Trip Planner feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type PlanStatus = "draft" | "planned" | "ongoing" | "completed" | "cancelled";

export type TransportationType = "car" | "bus" | "train" | "plane" | "walk" | "other";

// ============================================
// SUB-ENTITIES
// ============================================

export interface PlanOwner {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
}

export interface PlanItem {
  id: string;
  uuid?: string;
  planner_id?: string;
  site_id?: string;
  day_number?: number;
  order_index?: number;
  note?: string;
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

export interface PlanParticipant {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

// ============================================
// API RESPONSE ENTITIES
// ============================================

// Matches GET /api/planners item
export interface PlanEntity {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date?: string;
  number_of_people: number;
  transportation: string;
  status: string;
  share_token: string;
  qr_code_url: string;
  owner?: PlanOwner;
  created_at: string;
  updated_at: string;

  // Detailed fields (optional in list)
  items?: PlanItem[];
  items_by_day?: Record<string, PlanItem[]>;
  number_of_days?: number;
  is_public?: boolean; // inferred from usage
}

export interface GetPlansResponse {
  planners: PlanEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddPlanItemResponse {
  item: PlanItem;
}

export interface ReorderPlanItemsResponse {
  items: PlanItem[];
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreatePlanRequest {
  name: string;
  start_date: string;
  end_date: string;
  number_of_people: number;
  transportation: string;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  status?: string;
}

export interface AddPlanItemRequest {
  site_id: string;
  day_number: number;
  note?: string;
}

export interface ReorderPlanItemsRequest {
  day_number: number;
  item_ids: string[];
}

export interface InviteParticipantRequest {
  userId: string;
  role: "editor" | "viewer";
}

export interface AISuggestionRequest {
  region?: string;
  duration: number;
  interests?: string[];
  startLocation?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================
// UI / LEGACY TYPES
// ============================================

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
