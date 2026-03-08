/**
 * Pilgrim Types - Planner
 * Type definitions for Pilgrim Trip Planner feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type PlanStatus =
  | "draft"
  | "planned"
  | "ongoing"
  | "completed"
  | "cancelled";

export type TransportationType =
  | "car"
  | "bus"
  | "train"
  | "plane"
  | "walk"
  | "other";

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
  event_id?: string;
  day_number?: number;
  order_index?: number;
  note?: string;
  nearby_amenity_ids?: string[]; // UUIDs of nearby places saved to this item
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
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: text (e.g., "1 hour", "2 hours 30 minutes")
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

export interface MessageSender {
  id: string;
  full_name: string;
  avatar_url: string;
}

export interface PlannerMessage {
  id: string;
  message_type: "text" | "image";
  content: string;
  image_url: string;
  sender: MessageSender;
  created_at: string;
  planner_id: string;
  user_id: string;
  user: MessageSender;
}

export interface GetPlanMessagesResponse {
  messages: PlannerMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UploadMessageImageResponse {
  image_url: string;
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
  event_id?: string;
  note?: string;
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: text (e.g., "1 hour", "30 minutes", "2 hours 30 minutes")
}

export interface UpdatePlanItemRequest {
  day_number?: number;
  order_index?: number;
  note?: string;
  nearby_amenity_ids?: string[]; // UUIDs of nearby places to associate with this item
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: "30 minutes", "1 hour", "2 hours 30 minutes"
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

export interface SendPlanMessageRequest {
  message_type: "text" | "image";
  content: string;
  image_url?: string;
}

// ============================================
// CHECK-IN TYPES
// ============================================

export interface CheckInEntity {
  id: string;
  planner_item_id: string;
  user_id: string;
  site_id: string;
  checked_in_at: string;
  note?: string;
  photos?: string[];
  site?: {
    id: string;
    name: string;
    image?: string;
    address?: string;
  };
  planner?: {
    id: string;
    name: string;
  };
}

export interface GetCheckInsResponse {
  check_ins?: CheckInEntity[]; // Legacy format (optional)
  // OR can be directly an array when used with ApiResponse<CheckInEntity[]>
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CheckInItemRequest {
  latitude: number;
  longitude: number;
  note?: string;
  photos?: string[];
}

export interface CheckInItemResponse {
  check_in: CheckInEntity;
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
