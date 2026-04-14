export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";
export type FriendshipSearchStatus = FriendshipStatus | null;

export interface FriendUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface FriendshipSearchResponse extends FriendUser {
  friendship_status: FriendshipSearchStatus;
}

export interface FriendshipListItem {
  friendship_id: string;
  status: FriendshipStatus;
  user: FriendUser;
  created_at: string;
  updated_at: string;
}

export interface FriendshipListResponse {
  items: FriendshipListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface SendFriendRequestData {
  addressee_id: string;
}

export interface RespondFriendRequestData {
  action: "accept" | "reject";
}

export interface SendFriendRequestResponse {
  id: string;
  status: FriendshipStatus;
  message?: string;
  addressee?: {
    id: string;
    full_name: string;
  };
}

export interface RespondFriendRequestResponse {
  id: string;
  status: FriendshipStatus;
  requester: {
    id: string;
    full_name: string;
  };
  addressee: {
    id: string;
    full_name: string;
  };
}
