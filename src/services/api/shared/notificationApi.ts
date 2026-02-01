/**
 * Notification API
 * Handles notification operations
 *
 * Endpoints:
 * - GET  /api/notifications           - List notifications
 * - PATCH /api/notifications/:id/read - Mark as read
 * - POST /api/notifications/read-all  - Mark all as read
 * - DELETE /api/notifications/:id     - Delete notification
 * - GET  /api/notifications/settings  - Get notification settings
 * - PUT  /api/notifications/settings  - Update notification settings
 */

import {
    ApiResponse,
    PaginatedResponse,
    PaginationParams,
} from "../../../types/api.types";
import apiClient from "../apiClient";
import { SHARED_ENDPOINTS } from "../endpoints";

// ============================================
// TYPES
// ============================================

export interface Notification {
  id: string;
  type: "booking" | "message" | "review" | "system" | "promotion";
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  bookingAlerts: boolean;
  messageAlerts: boolean;
  reviewAlerts: boolean;
  promotionAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get notifications
 */
export const getNotifications = async (
  params?: PaginationParams,
): Promise<PaginatedResponse<Notification>> => {
  const response = await apiClient.get<PaginatedResponse<Notification>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.LIST,
    { params },
  );
  return response.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.patch<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.MARK_READ(id),
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
  );
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (
  id: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.DELETE(id),
  );
  return response.data;
};

/**
 * Get notification settings
 */
export const getSettings = async (): Promise<
  ApiResponse<NotificationSettings>
> => {
  const response = await apiClient.get<ApiResponse<NotificationSettings>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.SETTINGS,
  );
  return response.data;
};

/**
 * Update notification settings
 */
export const updateSettings = async (
  data: Partial<NotificationSettings>,
): Promise<ApiResponse<NotificationSettings>> => {
  const response = await apiClient.put<ApiResponse<NotificationSettings>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.UPDATE_SETTINGS,
    data,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const notificationApi = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getSettings,
  updateSettings,
};

export default notificationApi;
