import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FRIENDSHIP_KEYS } from "../constants/queryKeys";
import * as friendshipApi from "../services/api/pilgrim/friendshipApi";

/**
 * Hook for friendship-related operations
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addresseeId: string) =>
      friendshipApi.sendFriendRequest(addresseeId),
    onSuccess: () => {
      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      friendshipId,
      action,
    }: {
      friendshipId: string;
      action: "accept" | "reject";
    }) => friendshipApi.respondToFriendRequest(friendshipId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: string) => friendshipApi.removeFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
    },
  });
}

export function useFriendshipsList(status?: "accepted" | "pending") {
  return useQuery({
    queryKey: FRIENDSHIP_KEYS.list({ status }),
    queryFn: () => friendshipApi.getFriendships({ status, limit: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Determine actual friendship status for a given user ID
 * by checking local lists of friends and pending requests.
 * Uses /api/friendships as the source of truth.
 */
export function useUserFriendshipStatus(userId?: string) {
  const { data: acceptedData, isLoading: loadingAccepted } =
    useFriendshipsList("accepted");
  const { data: pendingData, isLoading: loadingPending } =
    useFriendshipsList("pending");

  const isLoading = loadingAccepted || loadingPending;

  if (!userId) return null;
  if (isLoading) return undefined;

  // Search in accepted list
  const isFriend = acceptedData?.data?.items?.some(
    (f: any) => String(f.user?.id) === String(userId),
  );
  if (isFriend) return "accepted";

  // Search in pending list (requests received by current user)
  const isPendingReceived = pendingData?.data?.items?.some(
    (f: any) => String(f.user?.id) === String(userId),
  );
  if (isPendingReceived) return "pending_received";

  return "none";
}
