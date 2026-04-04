import { ApiResponse, PaginationParams } from "../../../types/api.types";
import {
  FriendshipListItem,
  FriendshipListResponse,
  FriendshipStatus,
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
  params?: PaginationParams & { status?: "accepted" | "pending" }
): Promise<ApiResponse<FriendshipListResponse>> => {
  const response = await apiClient.get<ApiResponse<FriendshipListResponse>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.LIST,
    { params }
  );
  return response.data;
};

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = async (
  addresseeId: string
): Promise<ApiResponse<SendFriendRequestResponse>> => {
  const response = await apiClient.post<ApiResponse<SendFriendRequestResponse>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.REQUEST,
    { addressee_id: addresseeId }
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
  action: "accept" | "reject"
): Promise<ApiResponse<RespondFriendRequestResponse>> => {
  const response = await apiClient.post<ApiResponse<RespondFriendRequestResponse>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.RESPOND(friendshipId),
    { action }
  );
  return response.data;
};

/**
 * Remove a friend or cancel a friend request
 */
export const removeFriend = async (
  friendId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    PILGRIM_ENDPOINTS.FRIENDSHIP.REMOVE(friendId)
  );
  return response.data;
};

const friendshipApi = {
  getFriendships,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
};

export default friendshipApi;
