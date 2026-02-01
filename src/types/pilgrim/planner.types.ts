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
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create plan request
 */
export interface CreatePlanRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  transportation?: TransportationType;
  estimatedBudget?: number;
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
