import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";

/**
 * Hook that polls for unread chat messages in a planner group chat.
 * Polls every 10 seconds when online.
 * Returns the unread count and a function to reset it (e.g., when opening chat).
 */
export const useChatUnreadCount = (
  planId: string,
  userId: string | undefined,
  isOffline: boolean,
) => {
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const readUnreadCount = async () => {
      if (!planId || !userId || isOffline) return;

      try {
        const chatReadStorageKey = `planner_chat_last_read_${planId}_${userId || "guest"}`;
        const [messagesRes, lastReadRaw] = await Promise.all([
          pilgrimPlannerApi.getPlanMessages(planId, { page: 1, limit: 30 }),
          AsyncStorage.getItem(chatReadStorageKey),
        ]);

        const data: any = messagesRes?.data ?? (messagesRes as any);
        const messages: any[] = Array.isArray(data?.messages)
          ? data.messages
          : [];
        const lastReadAt = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;

        const isOwnMessage = (msg: any) => {
          const uid = String(userId);
          return (
            String(msg?.user_id ?? "") === uid ||
            String(msg?.sender?.id ?? "") === uid ||
            String(msg?.user?.id ?? "") === uid
          );
        };

        const unread = messages.filter((msg) => {
          if (isOwnMessage(msg)) return false;
          const createdAt = msg?.created_at || msg?.createdAt;
          const ts = createdAt ? new Date(createdAt).getTime() : 0;
          return ts > lastReadAt;
        }).length;

        setUnreadChatCount(unread);
      } catch {
        // Ignore polling errors (e.g., no permission in some invite states).
      }
    };

    void readUnreadCount();
    const timer = setInterval(() => {
      void readUnreadCount();
    }, 10000);

    return () => clearInterval(timer);
  }, [planId, userId, isOffline]);

  /** Call when the user opens the chat screen to mark all as read. */
  const markAsRead = async () => {
    const chatReadStorageKey = `planner_chat_last_read_${planId}_${userId || "guest"}`;
    await AsyncStorage.setItem(chatReadStorageKey, new Date().toISOString());
    setUnreadChatCount(0);
  };

  return { unreadChatCount, markAsRead };
};
