/**
 * Guide Types - Events
 * Type definitions for Local Guide Events feature
 *
 * API Endpoints:
 * - POST   /api/local-guide/events        - Create event
 * - GET    /api/local-guide/events        - List events
 * - PUT    /api/local-guide/events/:id    - Update event
 * - DELETE /api/local-guide/events/:id    - Delete event (soft)
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

/**
 * Event approval status
 */
export type EventStatus = "pending" | "approved" | "rejected";

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Event item returned from API
 */
export interface EventItem {
  id: string;
  site_id: string;
  code: string;
  name: string;
  description: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  location: string;
  banner_url: string | null;
  status: EventStatus;
  rejection_reason: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Event list pagination info
 */
export interface EventPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Event list response data structure
 */
export interface EventListData {
  data: EventItem[];
  pagination: EventPagination;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * React Native file object for FormData
 */
export interface RNEventFileObject {
  uri: string;
  name: string;
  type: string; // MIME type like "image/jpeg", "image/png"
}

/**
 * Parameters for fetching event list
 * GET /api/local-guide/events
 */
export interface GetEventsParams {
  page?: number;
  limit?: number;
  status?: EventStatus;
  is_active?: boolean;
}

/**
 * Request body for creating event
 * POST /api/local-guide/events (multipart/form-data)
 *
 * Required: name, start_date
 */
export interface CreateEventRequest {
  name: string; // Max 255 chars
  description?: string; // Max 2000 chars
  start_date: string; // Format: YYYY-MM-DD
  end_date?: string; // Format: YYYY-MM-DD
  start_time?: string; // Format: HH:MM
  end_time?: string; // Format: HH:MM
  location?: string; // Max 255 chars
  banner?: RNEventFileObject; // jpg, png, jpeg, webp
}

/**
 * Request body for updating event
 * PUT /api/local-guide/events/:id (multipart/form-data)
 *
 * Note: Only events with status 'pending' or 'rejected' can be updated
 */
export interface UpdateEventRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  banner?: RNEventFileObject;
}
