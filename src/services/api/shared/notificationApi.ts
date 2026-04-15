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
  | "shift_submitted" // Local Guide gửi lịch trực chờ duyệt

  // Content approval results
  | "site_update_submitted" // Yêu cầu cập nhật site được gửi
  | "site_approved" // Site được duyệt
  | "site_rejected" // Site bị từ chối
  | "site_hidden" // Site bị ẩn
  | "media_approved" // Media được duyệt
  | "media_rejected" // Media bị từ chối
  | "media_submitted" // Media được gửi chờ duyệt
  | "event_approved" // Sự kiện được duyệt
  | "event_rejected" // Sự kiện bị từ chối
  | "event_submitted" // Sự kiện được gửi chờ duyệt
  | "schedule_approved" // Lịch lễ được duyệt
  | "schedule_rejected" // Lịch lễ bị từ chối
  | "schedule_submitted" // Lịch lễ được gửi chờ duyệt
  | "nearby_place_approved" // Địa điểm lân cận được duyệt
  | "nearby_place_rejected" // Địa điểm lân cận bị từ chối
  | "nearby_place_submitted" // Địa điểm lân cận được gửi chờ duyệt
  | "narrative_approved" // Bài tường thuật được duyệt
  | "narrative_rejected" // Bài tường thuật bị từ chối
  | "content_deleted" // Nội dung bị xóa do vi phạm
  | "content_warning" // Cảnh báo nội dung

  // Admin / Manager
  | "verification_submitted" // Có yêu cầu xác minh mới
  | "site_registration_submitted" // Có yêu cầu đăng ký site mới

  // ========== PILGRIM NOTIFICATIONS ==========
  | "planner_invite" // Được mời tham gia kế hoạch
  | "planner_joined" // Có người tham gia kế hoạch
  | "planner_kicked" // Bị mời ra khỏi kế hoạch
  | "planner_deposit_refunded" // Hoàn cọc kế hoạch
  | "planner_member_left" // Thành viên rời kế hoạch
  | "planner_first_checkin" // Có người check-in đầu tiên tại điểm
  | "planner_item_missed" // Bị đánh dấu vắng khi trưởng đoàn chốt
  | "planner_item_skipped" // Điểm bị bỏ qua (còn điểm sau)
  | "planner_item_skipped_last" // Điểm cuối bị bỏ qua
  | "planner_item_added" // Thêm địa điểm vào lịch
  | "planner_started" // Kế hoạch bắt đầu
  | "planner_schedule_changed" // Thay đổi lịch / điểm tiếp theo
  | "favorite_site_update" // Site yêu thích có cập nhật
  | "friend_request" // Nhận lời mời kết bạn
  | "friend_accepted" // Lời mời kết bạn được chấp nhận
  | "planner_friend_invite" // Bạn bè mời vào planner
  | "post_liked" // Có người thích bài viết
  | "post_commented" // Có người bình luận bài viết
  | "post_comment_replied" // Có người trả lời bình luận

  // SOS
  | "sos_created" // SOS vừa được tạo
  | "sos_assigned_to_guide" // SOS được giao cho hướng dẫn viên
  | "sos_planner_alert" // Cảnh báo SOS từ planner
  | "sos_assigned" // SOS được tiếp nhận
  | "sos_resolved"

  // Review notifications
  | "new_site_review"
  | "review_replied"; // Có phản hồi đánh giá

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
const isReviewNotificationType = (type: string): boolean => {
  const normalized = type.toLowerCase();
  return normalized.includes("review") || normalized.includes("rating");
};

export const isLocalGuideNotification = (type: string): boolean => {
  return (
    [
      "local_guide_created",
      "local_guide_disabled",
      "local_guide_removed",
      "shift_assigned",
      "shift_rejected",
      "shift_submitted",
      "site_update_submitted",
      "site_approved",
      "site_rejected",
      "site_hidden",
      "media_approved",
      "media_rejected",
      "media_submitted",
      "event_approved",
      "event_rejected",
      "event_submitted",
      "schedule_approved",
      "schedule_rejected",
      "schedule_submitted",
      "nearby_place_approved",
      "nearby_place_rejected",
      "nearby_place_submitted",
      "narrative_approved",
      "narrative_rejected",
      "sos_created",
      "sos_assigned_to_guide",
      "verification_submitted",
      "site_registration_submitted",
      "content_deleted",
      "content_warning",
      "new_site_review",
      "review_replied",
    ].includes(type) || isReviewNotificationType(type)
  );
};

/**
 * Check if notification is for Pilgrim
 */
export const isPilgrimNotification = (type: string): boolean => {
  return [
    "planner_invite",
    "planner_joined",
    "planner_kicked",
    "planner_deposit_refunded",
    "planner_member_left",
    "planner_first_checkin",
    "planner_item_missed",
    "planner_item_skipped",
    "planner_item_skipped_last",
    "planner_item_added",
    "planner_started",
    "planner_schedule_changed",
    "favorite_site_update",
    "friend_request",
    "friend_accepted",
    "planner_friend_invite",
    "post_liked",
    "post_commented",
    "post_comment_replied",
    "sos_created",
    "sos_planner_alert",
    "sos_assigned",
    "sos_resolved",
  ].includes(type);
};

/**
 * Check if notification is approval-related
 */
export const isApprovalNotification = (type: string): boolean => {
  return type.endsWith("_approved") || type.endsWith("_rejected");
};

/**
 * Check if notification is positive (approved, success)
 */
export const isPositiveNotification = (type: string): boolean => {
  return [
    "local_guide_created",
    "shift_assigned",
    "media_approved",
    "event_approved",
    "schedule_approved",
    "nearby_place_approved",
    "narrative_approved",
    "planner_joined",
    "friend_accepted",
    "sos_resolved",
  ].includes(type);
};

/**
 * Check if notification is negative (rejected, disabled)
 */
export const isNegativeNotification = (type: string): boolean => {
  return [
    "local_guide_disabled",
    "local_guide_removed",
    "shift_rejected",
    "media_rejected",
    "event_rejected",
    "schedule_rejected",
    "nearby_place_rejected",
    "site_hidden",
    "content_deleted",
    "content_warning",
    "planner_kicked",
    "planner_item_missed",
  ].includes(type);
};

/**
 * Get notification category
 */
export const getNotificationCategory = (
  type: string,
):
  | "account"
  | "shift"
  | "content"
  | "planner"
  | "social"
  | "sos"
  | "review"
  | "general" => {
  if (isReviewNotificationType(type)) {
    return "review";
  }
  if (
    [
      "local_guide_created",
      "local_guide_disabled",
      "local_guide_removed",
      "verification_submitted",
      "site_registration_submitted",
    ].includes(type)
  ) {
    return "account";
  }
  if (["shift_assigned", "shift_rejected", "shift_submitted"].includes(type)) {
    return "shift";
  }
  if (
    isApprovalNotification(type) ||
    [
      "site_update_submitted",
      "site_hidden",
      "media_submitted",
      "event_submitted",
      "schedule_submitted",
      "nearby_place_submitted",
      "content_deleted",
      "content_warning",
    ].includes(type)
  ) {
    return "content";
  }
  if (
    [
      "planner_invite",
      "planner_joined",
      "planner_kicked",
      "planner_deposit_refunded",
      "planner_member_left",
      "planner_first_checkin",
      "planner_item_missed",
      "planner_item_skipped",
      "planner_item_skipped_last",
      "planner_item_added",
      "planner_started",
      "planner_schedule_changed",
      "favorite_site_update",
    ].includes(type)
  ) {
    return "planner";
  }
  if (
    [
      "post_liked",
      "post_commented",
      "post_comment_replied",
      "friend_request",
      "friend_accepted",
      "planner_friend_invite",
    ].includes(type)
  ) {
    return "social";
  }
  if (
    [
      "sos_created",
      "sos_assigned_to_guide",
      "sos_planner_alert",
      "sos_assigned",
      "sos_resolved",
    ].includes(type)
  ) {
    return "sos";
  }
  return "general";
};

/**
 * Get notification icon name (for UI)
 */
export const getNotificationIcon = (type: string): string => {
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
    case "social":
      if (type === "post_liked") return "heart";
      if (type === "post_commented") return "chatbubble";
      if (type === "post_comment_replied") return "chatbubbles";
      if (type === "friend_request") return "person-add";
      if (type === "friend_accepted") return "people";
      if (type === "planner_friend_invite") return "people-circle";
      return "chatbubble";
    case "review":
      return "star";
    case "sos":
      return "alert-circle";
    case "general":
      return "notifications";
    default:
      return "notifications";
  }
};

/**
 * Get notification color (for UI)
 */
export const getNotificationColor = (type: string): string => {
  if (type === "post_liked") {
    return "#E91E63";
  }
  if (type === "post_commented" || type === "post_comment_replied") {
    return "#5C6BC0";
  }
  if (type === "friend_request") {
    return "#3F51B5";
  }
  if (type === "friend_accepted") {
    return "#4CAF50";
  }
  if (type === "planner_friend_invite") {
    return "#009688";
  }
  if (type === "sos_created" || type === "sos_planner_alert") {
    return "#F44336";
  }
  if (type === "sos_assigned" || type === "sos_assigned_to_guide") {
    return "#FF9800";
  }
  if (getNotificationCategory(type) === "review") {
    return "#D4AF37";
  }
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
