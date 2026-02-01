/**
 * Guide Events API
 * Handles event operations for Local Guide
 *
 * Endpoints:
 * - GET    /api/local-guide/events        - List events
 * - POST   /api/local-guide/events        - Create event
 * - PUT    /api/local-guide/events/:id    - Update event
 * - DELETE /api/local-guide/events/:id    - Delete event (soft)
 */

import { ApiResponse } from "../../../types/api.types";
import {
  CreateEventRequest,
  EventItem,
  EventListData,
  GetEventsParams,
  UpdateEventRequest,
} from "../../../types/guide";
import apiClient from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get event list for the local guide's site
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated list of events
 *
 * Response codes:
 * - 200: Success
 * - 401: Not logged in
 * - 403: Not a Local Guide
 */
export const getEvents = async (
  params?: GetEventsParams
): Promise<ApiResponse<EventListData>> => {
  const response = await apiClient.get<ApiResponse<EventListData>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_EVENTS.LIST,
    { params }
  );
  return response.data;
};

/**
 * Create a new event for the local guide's site
 * Uses multipart/form-data format
 *
 * @param data - Event data including optional banner image
 * @returns Created event item
 *
 * Required fields: name, start_date
 *
 * Response codes:
 * - 201: Event created successfully
 * - 400: Validation error (missing name/start_date, or user has no assigned site)
 * - 401: Not logged in
 * - 403: Not a Local Guide
 */
export const createEvent = async (
  data: CreateEventRequest
): Promise<ApiResponse<EventItem>> => {
  const formData = new FormData();

  // Required fields
  formData.append("name", data.name);
  formData.append("start_date", data.start_date);

  // Optional fields
  if (data.description) {
    formData.append("description", data.description);
  }
  if (data.end_date) {
    formData.append("end_date", data.end_date);
  }
  if (data.start_time) {
    formData.append("start_time", data.start_time);
  }
  if (data.end_time) {
    formData.append("end_time", data.end_time);
  }
  if (data.location) {
    formData.append("location", data.location);
  }

  // Banner image (React Native FormData format)
  if (data.banner) {
    formData.append("banner", {
      uri: data.banner.uri,
      name: data.banner.name,
      type: data.banner.type,
    } as any);
  }

  const response = await apiClient.post<ApiResponse<EventItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_EVENTS.CREATE,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
};

/**
 * Update an existing event
 * Uses multipart/form-data format
 *
 * Note: Only events with status 'pending' or 'rejected' can be updated
 *
 * @param id - Event ID
 * @param data - Fields to update
 * @returns Updated event item
 *
 * Response codes:
 * - 200: Update successful
 * - 400: Cannot update approved event
 * - 404: Event not found or doesn't belong to user
 */
export const updateEvent = async (
  id: string,
  data: UpdateEventRequest
): Promise<ApiResponse<EventItem>> => {
  const formData = new FormData();

  // Only append fields that are provided
  if (data.name !== undefined) {
    formData.append("name", data.name);
  }
  if (data.description !== undefined) {
    formData.append("description", data.description);
  }
  if (data.start_date !== undefined) {
    formData.append("start_date", data.start_date);
  }
  if (data.end_date !== undefined) {
    formData.append("end_date", data.end_date);
  }
  if (data.start_time !== undefined) {
    formData.append("start_time", data.start_time);
  }
  if (data.end_time !== undefined) {
    formData.append("end_time", data.end_time);
  }
  if (data.location !== undefined) {
    formData.append("location", data.location);
  }

  // Banner image (React Native FormData format)
  if (data.banner) {
    formData.append("banner", {
      uri: data.banner.uri,
      name: data.banner.name,
      type: data.banner.type,
    } as any);
  }

  const response = await apiClient.put<ApiResponse<EventItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_EVENTS.UPDATE(id),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
};

/**
 * Delete an event (soft delete)
 *
 * Note: Only events with status 'pending' or 'rejected' can be deleted
 *
 * @param id - Event ID
 * @returns Success response
 *
 * Response codes:
 * - 200: Delete successful
 * - 400: Cannot delete approved event
 * - 404: Event not found
 */
export const deleteEvent = async (
  id: string
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_EVENTS.DELETE(id)
  );
  return response.data;
};

/**
 * Restore a soft-deleted event
 *
 * Note: Only events with is_active: false and status 'pending' or 'rejected' can be restored
 * Cannot restore approved events
 *
 * @param id - Event ID
 * @returns Restored event item
 *
 * Response codes:
 * - 200: Restore successful
 * - 400: Cannot restore approved event / Event is already active
 * - 401: Not logged in
 * - 403: Not a Local Guide
 * - 404: Event not found
 */
export const restoreEvent = async (
  id: string
): Promise<ApiResponse<EventItem>> => {
  const response = await apiClient.patch<ApiResponse<EventItem>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_EVENTS.RESTORE(id)
  );
  return response.data;
};

// ============================================
// EXPORT AS OBJECT (for consistent API pattern)
// ============================================

const guideEventApi = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  restoreEvent,
};

export default guideEventApi;
