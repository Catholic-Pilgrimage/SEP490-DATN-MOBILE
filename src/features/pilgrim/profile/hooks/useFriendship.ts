import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { pilgrimFriendshipApi } from "../../../../services/api/pilgrim";
import {
  FriendshipListItem,
  FriendshipStatus,
} from "../../../../types/pilgrim";

export const useFriendship = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendshipListItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipListItem[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  const fetchFriends = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await pilgrimFriendshipApi.getFriendships({
        status: "accepted",
        page,
        limit,
      });
      if (res.success && res.data) {
        setFriends(res.data.items);
        setTotalFriends(res.data.total);
      }
    } catch (error) {
      console.error("Fetch friends error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await pilgrimFriendshipApi.getFriendships({
        status: "pending",
        page,
        limit,
      });
      if (res.success && res.data) {
        setPendingRequests(res.data.items);
        setTotalPending(res.data.total);
      }
    } catch (error) {
      console.error("Fetch pending requests error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const respondToRequest = useCallback(
    async (friendshipId: string, action: "accept" | "reject") => {
      try {
        const res = await pilgrimFriendshipApi.respondToFriendRequest(
          friendshipId,
          action
        );
        if (res.success) {
          Toast.show({
            type: "success",
            text1: action === "accept" ? t("friends.acceptSuccess") : t("friends.rejectSuccess"),
            text2: t("friends.respondSuccessMsg", { defaultValue: "Cập nhật mối quan hệ thành công" }),
          });
          // Refresh lists
          await fetchPendingRequests();
          if (action === "accept") await fetchFriends();
          return true;
        }
        return false;
      } catch (error) {
        Toast.show({
          type: "error",
          text1: t("friends.respondError"),
          text2: t("friends.respondErrorMsg"),
        });
        return false;
      }
    },
    [fetchFriends, fetchPendingRequests, t]
  );

  const removeFriend = useCallback(
    async (friendId: string, name: string) => {
      try {
        const res = await pilgrimFriendshipApi.removeFriend(friendId);
        if (res.success) {
          Toast.show({
            type: "success",
            text1: t("friends.removeSuccess"),
            text2: t("friends.removeSuccessMsg", { name }),
          });
          await fetchFriends();
          return true;
        }
        return false;
      } catch (error) {
        Toast.show({
          type: "error",
          text1: t("friends.removeError"),
          text2: t("friends.respondErrorMsg"),
        });
        return false;
      }
    },
    [fetchFriends, t]
  );

  const sendRequest = useCallback(async (addresseeId: string) => {
    try {
      const res = await pilgrimFriendshipApi.sendFriendRequest(addresseeId);
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("friends.requestSent"),
          text2: t("friends.requestSentMsg"),
        });
        return true;
      }
      return false;
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t("friends.requestError"),
        text2: t("friends.requestErrorMsg"),
      });
      return false;
    }
  }, [t]);

  return {
    loading,
    friends,
    pendingRequests,
    totalFriends,
    totalPending,
    fetchFriends,
    fetchPendingRequests,
    respondToRequest,
    removeFriend,
    sendRequest,
  };
};
