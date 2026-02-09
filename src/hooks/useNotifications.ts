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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch notifications from API
   */
  /**
   * Fetch notifications from API
   */
  const fetchNotifications = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setPage(1);
      } else {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
      }

      setError(null);

      const currentPage = refresh ? 1 : page + 1;

      // Add delay when loading more to show spinner clearly
      if (!refresh) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const response = await notificationApi.getNotifications({
        page: currentPage,
        limit: 20,
      });

      if (response.success && response.data) {
        const dtos = response.data.notifications || [];
        const items = dtos.map(notificationApi.mapNotificationDtoToModel);

        if (refresh) {
          setNotifications(items);
        } else {
          setNotifications(prev => [...prev, ...items]);
        }

        setUnreadCount(response.data.unread_count || 0);
        setHasMore(items.length === 20); // If < limit, no more pages
        setPage(currentPage);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch notifications",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const refreshNotifications = () => fetchNotifications(true);
  const loadMoreNotifications = () => fetchNotifications(false);

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
      setUnreadCount(0); // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      await notificationApi.markAllAsRead();
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Revert if failed (optional, but for now simple log is enough or could re-fetch)
      fetchNotifications(true);
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
    loadingMore,
    hasMore,
    error,
    fetchNotifications: refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};

export default useNotifications;
