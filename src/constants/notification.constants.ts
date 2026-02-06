/**
 * Notification Constants
 * Default messages and configurations for each notification type
 */

import { NotificationType } from "../services/api/shared/notificationApi";

/**
 * Default notification titles (Vietnamese)
 */
export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  // ========== LOCAL GUIDE NOTIFICATIONS ==========
  local_guide_created: "Chúc mừng!",
  local_guide_disabled: "Tài khoản bị tạm khóa",
  local_guide_removed: "Thông báo quan trọng",

  // Shift
  shift_assigned: "Lịch trực được duyệt",
  shift_rejected: "Lịch trực bị từ chối",

  // Content approval
  media_approved: "Media được duyệt",
  media_rejected: "Media bị từ chối",
  event_approved: "Sự kiện được duyệt",
  event_rejected: "Sự kiện bị từ chối",
  schedule_approved: "Lịch lễ được duyệt",
  schedule_rejected: "Lịch lễ bị từ chối",
  nearby_place_approved: "Địa điểm được duyệt",
  nearby_place_rejected: "Địa điểm bị từ chối",

  // ========== PILGRIM NOTIFICATIONS ==========
  planner_invite: "Lời mời tham gia",
  planner_joined: "Thành viên mới",
  favorite_site_update: "Cập nhật mới",

  // SOS
  sos_assigned: "Yêu cầu hỗ trợ",
  sos_resolved: "Hỗ trợ hoàn thành",
};

/**
 * Default notification messages (Vietnamese)
 */
export const NOTIFICATION_MESSAGES: Record<NotificationType, string> = {
  // ========== LOCAL GUIDE NOTIFICATIONS ==========
  local_guide_created: "Bạn đã được thêm vào đội ngũ Local Guide!",
  local_guide_disabled: "Tài khoản Local Guide của bạn đã bị tạm khóa.",
  local_guide_removed: "Bạn đã bị xóa khỏi đội ngũ Local Guide.",

  // Shift
  shift_assigned: "Lịch trực của bạn đã được duyệt.",
  shift_rejected: "Lịch trực của bạn đã bị từ chối.",

  // Content approval
  media_approved: "Media của bạn đã được phê duyệt.",
  media_rejected: "Media của bạn đã bị từ chối.",
  event_approved: "Sự kiện của bạn đã được phê duyệt.",
  event_rejected: "Sự kiện của bạn đã bị từ chối.",
  schedule_approved: "Lịch lễ của bạn đã được phê duyệt.",
  schedule_rejected: "Lịch lễ của bạn đã bị từ chối.",
  nearby_place_approved: "Địa điểm lân cận của bạn đã được phê duyệt.",
  nearby_place_rejected: "Địa điểm lân cận của bạn đã bị từ chối.",

  // ========== PILGRIM NOTIFICATIONS ==========
  planner_invite: "Bạn được mời tham gia một kế hoạch hành hương.",
  planner_joined: "Có người vừa tham gia kế hoạch của bạn.",
  favorite_site_update: "Địa điểm yêu thích của bạn có cập nhật mới.",

  // SOS
  sos_assigned: "Bạn có một yêu cầu hỗ trợ mới cần xử lý.",
  sos_resolved: "Yêu cầu hỗ trợ của bạn đã được giải quyết.",
};

/**
 * Navigation routes for each notification type
 */
export const NOTIFICATION_ROUTES: Partial<Record<NotificationType, string>> = {
  // Local Guide
  shift_assigned: "GuideSchedule",
  shift_rejected: "GuideSchedule",
  media_approved: "GuideMedia",
  media_rejected: "GuideMedia",
  event_approved: "GuideEvents",
  event_rejected: "GuideEvents",
  schedule_approved: "GuideMassSchedules",
  schedule_rejected: "GuideMassSchedules",
  nearby_place_approved: "GuideNearbyPlaces",
  nearby_place_rejected: "GuideNearbyPlaces",

  // Pilgrim
  planner_invite: "PlannerDetail",
  planner_joined: "PlannerDetail",
  favorite_site_update: "SiteDetail",
  sos_assigned: "SOSDetail",
  sos_resolved: "SOSDetail",
};

/**
 * Notification priority levels
 */
export const NOTIFICATION_PRIORITY = {
  HIGH: [
    "local_guide_disabled",
    "local_guide_removed",
    "sos_assigned",
  ] as NotificationType[],
  MEDIUM: [
    "shift_assigned",
    "shift_rejected",
    "planner_invite",
    "sos_resolved",
  ] as NotificationType[],
  LOW: [
    "media_approved",
    "event_approved",
    "schedule_approved",
    "nearby_place_approved",
    "planner_joined",
    "favorite_site_update",
  ] as NotificationType[],
};

/**
 * Check notification priority
 */
export const getNotificationPriority = (
  type: NotificationType,
): "high" | "medium" | "low" => {
  if (NOTIFICATION_PRIORITY.HIGH.includes(type)) return "high";
  if (NOTIFICATION_PRIORITY.MEDIUM.includes(type)) return "medium";
  return "low";
};

/**
 * Should play sound for notification
 */
export const shouldPlaySound = (type: NotificationType): boolean => {
  return (
    NOTIFICATION_PRIORITY.HIGH.includes(type) ||
    NOTIFICATION_PRIORITY.MEDIUM.includes(type)
  );
};

/**
 * Should vibrate for notification
 */
export const shouldVibrate = (type: NotificationType): boolean => {
  return NOTIFICATION_PRIORITY.HIGH.includes(type);
};

export default {
  NOTIFICATION_TITLES,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ROUTES,
  NOTIFICATION_PRIORITY,
  getNotificationPriority,
  shouldPlaySound,
  shouldVibrate,
};
