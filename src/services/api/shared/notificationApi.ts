/**
 * Notification API
 * Handles notification operations
 *
 * Endpoints:
 * - GET    /api/notifications              - List notifications
 * - PATCH  /api/notifications/:id/read    - Mark as read
 * - PATCH  /api/notifications/read-all    - Mark all as read
 * - DELETE /api/notifications/:id         - Delete notification
 * - DELETE /api/notifications             - Delete all notifications
 * - GET    /api/notifications/settings    - Get notification settings
 * - PUT    /api/notifications/settings    - Update notification settings
 * - POST   /api/notifications/token       - Register Expo Push Token
 * - DELETE /api/notifications/token       - Revoke Expo Push Token
 */

import {
    ApiResponse,
    Pagination,
    PaginationParams,
} from "../../../types/api.types";
import apiClient from "../apiClient";
import { SHARED_ENDPOINTS } from "../endpoints";

// ============================================
// TYPES
// ============================================

/**
 * Notification Types
 * Defines all possible notification types in the system
 */
export type NotificationType =
  // ========== LOCAL GUIDE NOTIFICATIONS ==========
  | "local_guide_created" // Được thêm làm Local Guide
  | "local_guide_disabled" // Tài khoản bị tạm khóa
  | "local_guide_removed" // Bị xóa khỏi đội ngũ

  // Shift (lịch trực)
  | "shift_assigned" // Lịch trực được duyệt
  | "shift_rejected" // Lịch trực bị từ chối

  // Content approval results
  | "media_approved" // Media được duyệt
  | "media_rejected" // Media bị từ chối
  | "event_approved" // Sự kiện được duyệt
  | "event_rejected" // Sự kiện bị từ chối
  | "schedule_approved" // Lịch lễ được duyệt
  | "schedule_rejected" // Lịch lễ bị từ chối
  | "nearby_place_approved" // Địa điểm lân cận được duyệt
  | "nearby_place_rejected" // Địa điểm lân cận bị từ chối

  // ========== PILGRIM NOTIFICATIONS ==========
  | "planner_invite" // Được mời tham gia kế hoạch
  | "planner_joined" // Có người tham gia kế hoạch
  | "planner_first_checkin" // Có người check-in đầu tiên tại điểm
  | "planner_item_missed" // Bị đánh dấu vắng khi trưởng đoàn chốt
  | "planner_item_skipped" // Điểm bị bỏ qua (còn điểm sau)
  | "planner_item_skipped_last" // Điểm cuối bị bỏ qua
  | "planner_item_added" // Thêm địa điểm vào lịch
  | "planner_schedule_changed" // Thay đổi lịch / điểm tiếp theo
  | "favorite_site_update" // Site yêu thích có cập nhật

  // SOS
  | "sos_assigned" // SOS được tiếp nhận
  | "sos_resolved"; // SOS đã được giải quyết

// DTO Types (Data Transfer Objects - from API)
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationResponse {
  notifications: NotificationDto[];
  pagination: Pagination;
  unread_count: number;
}

/**
 * Notification Data Interface (Internal Model)
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
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

export interface NotificationListParams extends PaginationParams {
  unread_only?: boolean;
}

export interface RegisterTokenParams {
  expo_token: string;
  platform: "android" | "ios";
  device_id?: string;
}

export interface RevokeTokenParams {
  expo_token: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get notifications
 */
/**
 * Get notifications
 */
export const getNotifications = async (
  params?: NotificationListParams,
): Promise<ApiResponse<NotificationResponse>> => {
  const response = await apiClient.get<ApiResponse<NotificationResponse>>(
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
  const response = await apiClient.patch<ApiResponse<void>>(
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
 * Delete all notifications
 */
export const deleteAllNotifications = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.DELETE_ALL,
  );
  return response.data;
};

/**
 * Delete read notifications
 */
export const deleteReadNotifications = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.DELETE_READ,
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

/**
 * Register Expo Push Token
 */
export const registerPushToken = async (
  params: RegisterTokenParams,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN,
    params,
  );
  return response.data;
};

/**
 * Revoke Expo Push Token
 */
export const revokePushToken = async (
  params: RevokeTokenParams,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    SHARED_ENDPOINTS.NOTIFICATIONS.REVOKE_TOKEN,
    { data: params },
  );
  return response.data;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if notification is for Local Guide
 */
export const isLocalGuideNotification = (type: NotificationType): boolean => {
  return [
    "local_guide_created",
    "local_guide_disabled",
    "local_guide_removed",
    "shift_assigned",
    "shift_rejected",
    "media_approved",
    "media_rejected",
    "event_approved",
    "event_rejected",
    "schedule_approved",
    "schedule_rejected",
    "nearby_place_approved",
    "nearby_place_rejected",
  ].includes(type);
};

/**
 * Check if notification is for Pilgrim
 */
export const isPilgrimNotification = (type: NotificationType): boolean => {
  return [
    "planner_invite",
    "planner_joined",
    "planner_first_checkin",
    "planner_item_missed",
    "planner_item_skipped",
    "planner_item_skipped_last",
    "planner_item_added",
    "planner_schedule_changed",
    "favorite_site_update",
    "sos_assigned",
    "sos_resolved",
  ].includes(type);
};

/**
 * Check if notification is approval-related
 */
export const isApprovalNotification = (type: NotificationType): boolean => {
  return type.endsWith("_approved") || type.endsWith("_rejected");
};

/**
 * Check if notification is positive (approved, success)
 */
export const isPositiveNotification = (type: NotificationType): boolean => {
  return [
    "local_guide_created",
    "shift_assigned",
    "media_approved",
    "event_approved",
    "schedule_approved",
    "nearby_place_approved",
    "planner_joined",
    "sos_resolved",
  ].includes(type);
};

/**
 * Check if notification is negative (rejected, disabled)
 */
export const isNegativeNotification = (type: NotificationType): boolean => {
  return [
    "local_guide_disabled",
    "local_guide_removed",
    "shift_rejected",
    "media_rejected",
    "event_rejected",
    "schedule_rejected",
    "nearby_place_rejected",
    "planner_item_missed",
  ].includes(type);
};

/**
 * Get notification category
 */
export const getNotificationCategory = (
  type: NotificationType,
): "account" | "shift" | "content" | "planner" | "sos" => {
  if (
    [
      "local_guide_created",
      "local_guide_disabled",
      "local_guide_removed",
    ].includes(type)
  ) {
    return "account";
  }
  if (["shift_assigned", "shift_rejected"].includes(type)) {
    return "shift";
  }
  if (isApprovalNotification(type)) {
    return "content";
  }
  if (
    [
      "planner_invite",
      "planner_joined",
      "planner_first_checkin",
      "planner_item_missed",
      "planner_item_skipped",
      "planner_item_skipped_last",
      "planner_item_added",
      "planner_schedule_changed",
      "favorite_site_update",
    ].includes(type)
  ) {
    return "planner";
  }
  return "sos";
};

/**
 * Get notification icon name (for UI)
 */
export const getNotificationIcon = (type: NotificationType): string => {
  const category = getNotificationCategory(type);
  switch (category) {
    case "account":
      return "person";
    case "shift":
      return "calendar";
    case "content":
      return isPositiveNotification(type) ? "checkmark-circle" : "close-circle";
    case "planner":
      return "map";
    case "sos":
      return "alert-circle";
    default:
      return "notifications";
  }
};

/**
 * Get notification color (for UI)
 */
export const getNotificationColor = (type: NotificationType): string => {
  if (isPositiveNotification(type)) {
    return "#4CAF50"; // Green
  }
  if (isNegativeNotification(type)) {
    return "#F44336"; // Red
  }
  if (type === "sos_assigned") {
    return "#FF9800"; // Orange
  }
  return "#2196F3"; // Blue (default)
};

/**
 * Map DTO to Model
 */
export const mapNotificationDtoToModel = (
  dto: NotificationDto,
): Notification => {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    message: dto.message, // Map 'message' from DTO to 'message' in Model (was 'body' in old model, but updated to match)
    data: dto.data,
    isRead: dto.is_read,
    createdAt: dto.created_at,
  };
};

// ============================================
// EXPORT
// ============================================

const notificationApi = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
  getSettings,
  updateSettings,
  registerPushToken,
  revokePushToken,
  // Helper functions
  isLocalGuideNotification,
  isPilgrimNotification,
  isApprovalNotification,
  isPositiveNotification,
  isNegativeNotification,
  getNotificationCategory,
  getNotificationIcon,
  getNotificationColor,
  mapNotificationDtoToModel,
};

export default notificationApi;
