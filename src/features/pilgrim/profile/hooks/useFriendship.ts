import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";
import { pilgrimFriendshipApi } from "../../../../services/api/pilgrim";
import {
  FriendshipListItem,
  FriendshipStatus,
} from "../../../../types/pilgrim";

export const useFriendship = () => {
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
            text1: action === "accept" ? "Đã chấp nhận" : "Đã từ chối",
            text2: "Cập nhật mối quan hệ thành công",
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
          text1: "Thao tác thất bại",
          text2: "Vui lòng thử lại sau",
        });
        return false;
      }
    },
    [fetchFriends, fetchPendingRequests]
  );

  const removeFriend = useCallback(
    async (friendId: string, name: string) => {
      try {
        const res = await pilgrimFriendshipApi.removeFriend(friendId);
        if (res.success) {
          Toast.show({
            type: "success",
            text1: "Đã hủy kết bạn",
            text2: `Đã xóa ${name} khỏi danh sách bạn bè`,
          });
          await fetchFriends();
          return true;
        }
        return false;
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Không thể hủy kết bạn",
          text2: "Vui lòng thử lại sau",
        });
        return false;
      }
    },
    [fetchFriends]
  );

  const sendRequest = useCallback(async (addresseeId: string) => {
    try {
      const res = await pilgrimFriendshipApi.sendFriendRequest(addresseeId);
      if (res.success) {
        Toast.show({
          type: "success",
          text1: "Đã gửi yêu cầu",
          text2: "Lời mời kết bạn đã được gửi đi",
        });
        return true;
      }
      return false;
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Gửi yêu cầu thất bại",
        text2: "Vui lòng kiểm tra lại",
      });
      return false;
    }
  }, []);

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
