import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { pilgrimFriendshipApi } from "../../../../services/api/pilgrim";
import {
  FriendshipListItem,
  FriendshipSearchResponse,
} from "../../../../types/pilgrim";

export const useFriendship = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendshipListItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipListItem[]>(
    [],
  );
  const [totalFriends, setTotalFriends] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  const extractErrorMessage = (error: any, fallback: string) => {
    return error?.response?.data?.message || error?.message || fallback;
  };

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
          action,
        );
        if (res.success) {
          Toast.show({
            type: "success",
            text1:
              action === "accept"
                ? t("friends.acceptSuccess")
                : t("friends.rejectSuccess"),
            text2:
              res.message ||
              t("friends.respondSuccessMsg", {
                defaultValue: "Cập nhật mối quan hệ thành công",
              }),
          });
          // Refresh lists
          await fetchPendingRequests();
          if (action === "accept") await fetchFriends();
          return true;
        }

        Toast.show({
          type: "error",
          text1: t("friends.respondError"),
          text2: res.message || t("friends.respondErrorMsg"),
        });
        return false;
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: t("friends.respondError"),
          text2: extractErrorMessage(error, t("friends.respondErrorMsg")),
        });
        return false;
      }
    },
    [fetchFriends, fetchPendingRequests, t],
  );

  const removeFriend = useCallback(
    async (friendId: string, name: string) => {
      try {
        const res = await pilgrimFriendshipApi.removeFriend(friendId);
        if (res.success) {
          Toast.show({
            type: "success",
            text1: t("friends.removeSuccess"),
            text2: res.message || t("friends.removeSuccessMsg", { name }),
          });
          await fetchFriends();
          return true;
        }

        Toast.show({
          type: "error",
          text1: t("friends.removeError"),
          text2: res.message || t("friends.respondErrorMsg"),
        });
        return false;
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: t("friends.removeError"),
          text2: extractErrorMessage(error, t("friends.respondErrorMsg")),
        });
        return false;
      }
    },
    [fetchFriends, t],
  );

  const sendRequest = useCallback(
    async (addresseeId: string) => {
      try {
        const res = await pilgrimFriendshipApi.sendFriendRequest(addresseeId);
        if (res.success) {
          Toast.show({
            type: "success",
            text1: t("friends.requestSent"),
            text2: res.message || t("friends.requestSentMsg"),
          });
          return true;
        }

        Toast.show({
          type: "error",
          text1: t("friends.requestError"),
          text2: res.message || t("friends.requestErrorMsg"),
        });
        return false;
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: t("friends.requestError"),
          text2: extractErrorMessage(error, t("friends.requestErrorMsg")),
        });
        return false;
      }
    },
    [t],
  );

  const searchUserByEmail = useCallback(
    async (email: string): Promise<FriendshipSearchResponse | null> => {
      try {
        const res = await pilgrimFriendshipApi.searchUserByEmail(email);
        if (res.success && res.data?.id) {
          return res.data;
        }

        Toast.show({
          type: "info",
          text1: t("friends.userNotFound", {
            defaultValue: "Không tìm thấy người dùng",
          }),
          text2:
            res.message ||
            t("friends.userNotFoundMsg", {
              defaultValue: "Không tìm thấy tài khoản với email này.",
            }),
        });
        return null;
      } catch (error: any) {
        const fallback = t("friends.searchErrorMsg", {
          defaultValue: "Không thể tìm kiếm người dùng lúc này.",
        });
        const message = extractErrorMessage(error, fallback);
        const normalizedMessage = String(message).toLowerCase();
        const isNotFoundError =
          normalizedMessage.includes("not found") ||
          normalizedMessage.includes("không tìm thấy") ||
          normalizedMessage.includes("404");

        Toast.show({
          type: isNotFoundError ? "info" : "error",
          text1: isNotFoundError
            ? t("friends.userNotFound", {
                defaultValue: "Không tìm thấy người dùng",
              })
            : t("friends.searchError", {
                defaultValue: "Tìm kiếm thất bại",
              }),
          text2: isNotFoundError
            ? t("friends.userNotFoundMsg", {
                defaultValue: "Không tìm thấy tài khoản với email này.",
              })
            : message,
        });
        return null;
      }
    },
    [t],
  );

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
    searchUserByEmail,
  };
};
