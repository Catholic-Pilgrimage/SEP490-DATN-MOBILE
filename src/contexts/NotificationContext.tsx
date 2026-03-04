/**
 * NotificationContext
 * Global shared state for notifications — ensures unreadCount and list
 * are consistent across all screens/components that call useNotifications().
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Toast from "react-native-toast-message";
import type { Notification as NotificationData } from "../services/api/shared/notificationApi";
import notificationApi from "../services/api/shared/notificationApi";
import notificationService from "../services/notification/notificationService";
import { useAuth } from "./AuthContext";

interface NotificationContextValue {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  fetchNotifications: (refresh?: boolean) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

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
          setNotifications((prev) => [...prev, ...items]);
        }

        setUnreadCount(response.data.unread_count || 0);
        setHasMore(items.length === 20);
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

  const loadMoreNotifications = () => fetchNotifications(false);

  // Ref to avoid stale closure in listeners
  const fetchRef = useRef(() => fetchNotifications(true));
  useEffect(() => {
    fetchRef.current = () => fetchNotifications(true);
  });

  const markAsRead = async (id: string) => {
    // Optimistic update first
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationApi.markAsRead(id);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const res = await notificationApi.markAllAsRead();
      Toast.show({ type: "success", text1: res.message });
    } catch (err: any) {
      console.error("Error marking all as read:", err);
      fetchNotifications(true);
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message ?? "Không thể cập nhật",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    const deletedNotif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (deletedNotif && !deletedNotif.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    try {
      const res = await notificationApi.deleteNotification(id);
      Toast.show({ type: "success", text1: res.message });
    } catch (err: any) {
      console.error("Error deleting notification:", err);
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message ?? "Xóa thất bại",
      });
    }
  };

  const deleteAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      const res = await notificationApi.deleteAllNotifications();
      Toast.show({ type: "success", text1: res.message });
    } catch (err: any) {
      console.error("Error deleting all notifications:", err);
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message ?? "Xóa thất bại",
      });
    }
  };

  const deleteReadNotifications = async () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
    try {
      const res = await notificationApi.deleteReadNotifications();
      Toast.show({ type: "success", text1: res.message });
    } catch (err: any) {
      console.error("Error deleting read notifications:", err);
      Toast.show({
        type: "error",
        text1: err?.response?.data?.message ?? "Xóa thất bại",
      });
    }
  };

  // Fetch on mount and whenever auth state changes (login/logout/restore)
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);
    } else {
      // Clear notifications on logout
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // Push notification listeners
  useEffect(() => {
    const receivedSubscription =
      notificationService.addNotificationReceivedListener(
        (_notification: any) => {
          fetchRef.current();
        },
      );

    const responseSubscription =
      notificationService.addNotificationResponseListener((_response: any) => {
        fetchRef.current();
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        error,
        showModal,
        openModal,
        closeModal,
        fetchNotifications,
        loadMoreNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        deleteReadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }
  return ctx;
};
