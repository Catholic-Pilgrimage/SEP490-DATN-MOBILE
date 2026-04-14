import { ApiResponse, PaginationParams } from "../../../types/api.types";
import {
    FriendshipListResponse,
    FriendshipSearchResponse,
    RespondFriendRequestResponse,
    SendFriendRequestResponse,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

/**
 * Friendship API Service
 * Handles friend requests, responding to requests, listing friends, and unfriending.
 */
export const getFriendships = async (
  params?: PaginationParams & { status?: "accepted" | "pending" },
): Promise<ApiResponse<FriendshipListResponse>> => {
  const response = await apiClient.get<ApiResponse<FriendshipListResponse>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.LIST,
    { params },
  );
  return response.data;
};

/**
 * Search user by email and return current friendship status
 */
export const searchUserByEmail = async (
  email: string,
): Promise<ApiResponse<FriendshipSearchResponse>> => {
  const response = await apiClient.get<ApiResponse<any>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.SEARCH,
    { params: { email } },
  );

  const payload = response.data;
  const raw = payload?.data;

  if (!raw) {
    return payload as ApiResponse<FriendshipSearchResponse>;
  }

  const user = raw.user ?? raw;
  const rawStatus = raw.friendship_status ?? user.friendship_status;
  const normalizedStatus =
    typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : null;

  const normalized: FriendshipSearchResponse = {
    id: String(user.id ?? ""),
    full_name: String(user.full_name ?? user.name ?? ""),
    email: String(user.email ?? email),
    avatar_url: user.avatar_url ?? undefined,
    friendship_status:
      normalizedStatus === "pending" ||
      normalizedStatus === "accepted" ||
      normalizedStatus === "rejected" ||
      normalizedStatus === "blocked"
        ? normalizedStatus
        : null,
  };

  return {
    ...payload,
    data: normalized,
  };
};

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = async (
  addresseeId: string,
): Promise<ApiResponse<SendFriendRequestResponse>> => {
  const response = await apiClient.post<ApiResponse<SendFriendRequestResponse>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.REQUEST,
    { addressee_id: addresseeId },
  );
  return response.data;
};

/**
 * Accept or reject a friend request
 * @param friendshipId The ID of the friendship record
 * @param action 'accept' or 'reject'
 */
export const respondToFriendRequest = async (
  friendshipId: string,
  action: "accept" | "reject",
): Promise<ApiResponse<RespondFriendRequestResponse>> => {
  const response = await apiClient.post<
    ApiResponse<RespondFriendRequestResponse>
  >(PILGRIM_ENDPOINTS.FRIENDSHIP.RESPOND(friendshipId), { action });
  return response.data;
};

/**
 * Remove a friend or cancel a friend request
 */
export const removeFriend = async (
  friendId: string,
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.REMOVE(friendId),
  );
  return response.data;
};

const friendshipApi = {
  getFriendships,
  searchUserByEmail,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
};

export default friendshipApi;
