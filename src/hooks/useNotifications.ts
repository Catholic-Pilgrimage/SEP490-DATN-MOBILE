/**
 * useNotifications Hook
 * Manages notification state and operations
 */

import { useEffect, useState } from "react";
import type {
    Notification as NotificationData
} from "../services/api/shared/notificationApi";
import notificationApi from "../services/api/shared/notificationApi";
import notificationService from "../services/notification/notificationService";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = async (unreadOnly = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationApi.getNotifications({
        page: 1,
        limit: 20,
        unread_only: unreadOnly,
      });

      const items = response.data?.items || [];
      setNotifications(items);
      setUnreadCount(items.filter((n: NotificationData) => !n.isRead).length);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark notification as read
   */
  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  /**
   * Delete notification
   */
  const deleteNotification = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const deletedNotif = notifications.find((n) => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  /**
   * Delete all notifications
   */
  const deleteAllNotifications = async () => {
    try {
      await notificationApi.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    }
  };

  /**
   * Setup notification listeners
   */
  useEffect(() => {
    // When notification received (foreground)
    const receivedSubscription =
      notificationService.addNotificationReceivedListener(
        (notification: any) => {
          console.log("Notification received:", notification);
          // Refresh notifications
          fetchNotifications();
          // Update badge
          notificationService.setBadgeCount(unreadCount + 1);
        },
      );

    // When user taps notification
    const responseSubscription =
      notificationService.addNotificationResponseListener((response: any) => {
        console.log("Notification tapped:", response);
        // Handle navigation based on notification data
        const data = response.notification.request.content.data;
        // TODO: Navigate to appropriate screen based on data
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};

export default useNotifications;
