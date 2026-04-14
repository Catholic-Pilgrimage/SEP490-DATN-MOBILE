/**
 * Pilgrim Planner API — khớp nhóm route `/api/planners` + `/api/checkins/me`.
 *
 * Bảng tài liệu "Planners - Pilgrim" (CRUD + items + status + lock + progress):
 * - POST/GET /planners, GET/PUT/DELETE /planners/:id  → createPlan, getPlans, getPlanDetail, updatePlan, deletePlan
 * - POST/PUT/DELETE …/items, …/items/:itemId          → addPlanItem, updatePlanItem, deletePlanItem
 * - PATCH …/status                                     → updatePlannerStatus (UI: nên gọi khi bắt đầu/kết thúc hành trình)
 * - PATCH …/lock                                       → updatePlannerLock
 * - GET …/progress                                     → getPlannerProgress (đã dùng trong SharePlanModal)
 * - Không dùng từ app: POST /planners/deposit-webhook (PayOS → backend).
 * - Planner Share: invite + members + invites; removePlanMember (SharePlanModal); cancelPlannerDeposit (PlanInvitePreview, chờ cọc); getPlannerTransactions (PlanDetailScreen → Sao kê quỹ nhóm).
 * - Không gọi từ app: deposit-webhook (PayOS → BE).
 * - POST …/items/reorder — reorderPlannerItems (đổi thứ tự điểm trong ngày, BE tính lại giờ).
 */

import { ApiResponse, PaginationParams } from "../../../types/api.types";
import {
  AddPlanItemRequest,
  AddPlanItemResponse,
  CheckInEntity,
  CheckInItemRequest,
  CheckInItemResponse,
  CreatePlanRequest,
  GetInvitesResponse,
  GetMembersResponse,
  GetPlanMessagesResponse,
  GetPlansResponse,
  InviteParticipantRequest,
  MarkVisitedConfirmationResponse,
  PlanCalendarSyncData,
  PlanEntity,
  PlanInvite,
  PlanItem,
  PlannerMessage,
  PlannerMyInvite,
  PlannerProgressResponse,
  PlannerTransactionsResponse,
  PlanOwner,
  PlanParticipant,
  ReorderPlannerItemsRequest,
  RespondInviteRequest,
  RespondInviteResponse,
  SendPlanMessageRequest,
  SwapPlannerItemsRequest,
  UpdatePlanItemRequest,
  UpdatePlannerItemStatusRequest,
  UpdatePlannerLockRequest,
  UpdatePlannerStatusRequest,
  UpdatePlanRequest,
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

type InvitePreviewApiPayload =
  | PlanInvite
  | { invite: Record<string, unknown>; planner?: Record<string, unknown> };

function isNestedInvitePreview(
  d: unknown,
): d is { invite: Record<string, unknown>; planner?: Record<string, unknown> } {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  const inv = o.invite;
  return typeof inv === "object" && inv !== null && !Array.isArray(inv);
}

function coerceInviteStatus(raw: unknown): PlanInvite["status"] {
  if (
    raw === "pending" ||
    raw === "accepted" ||
    raw === "rejected" ||
    raw === "expired" ||
    raw === "awaiting_payment"
  ) {
    return raw;
  }
  return "pending";
}

function mapPlannerFromInvitePreview(
  pl: Record<string, unknown>,
): NonNullable<PlanInvite["planner"]> {
  const ownerRaw = pl.owner;
  let owner: PlanOwner | undefined;
  if (typeof ownerRaw === "object" && ownerRaw !== null) {
    const or = ownerRaw as Record<string, unknown>;
    owner = {
      id: String(or.id ?? ""),
      full_name: String(or.full_name ?? ""),
      email: String(or.email ?? ""),
      avatar_url: String(or.avatar_url ?? ""),
    };
  }
  const itemsRaw = pl.items_by_day;
  let items_by_day: Record<string, PlanItem[]> | undefined;
  if (
    typeof itemsRaw === "object" &&
    itemsRaw !== null &&
    !Array.isArray(itemsRaw)
  ) {
    items_by_day = itemsRaw as Record<string, PlanItem[]>;
  }

  return {
    id: String(pl.id ?? ""),
    name: String(pl.name ?? ""),
    estimated_days:
      typeof pl.estimated_days === "number" ? pl.estimated_days : undefined,
    number_of_days:
      typeof pl.number_of_days === "number" ? pl.number_of_days : undefined,
    number_of_people:
      typeof pl.number_of_people === "number" ? pl.number_of_people : undefined,
    transportation:
      typeof pl.transportation === "string" ? pl.transportation : undefined,
    status: typeof pl.status === "string" ? pl.status : undefined,
    start_date: typeof pl.start_date === "string" ? pl.start_date : undefined,
    end_date: typeof pl.end_date === "string" ? pl.end_date : undefined,
    owner,
    items_by_day,
  };
}

function normalizeInvitePreviewPayload(
  token: string,
  d: InvitePreviewApiPayload,
): PlanInvite {
  if (isNestedInvitePreview(d)) {
    const inv = d.invite;
    const plRaw = d.planner;
    const planner =
      plRaw && typeof plRaw === "object" && !Array.isArray(plRaw)
        ? mapPlannerFromInvitePreview(plRaw as Record<string, unknown>)
        : undefined;
    return {
      id: String(inv.id ?? ""),
      planner_id: String(planner?.id ?? inv["planner_id"] ?? ""),
      token: String(inv.token ?? token),
      email: String(inv.email ?? ""),
      inviter_id: inv.inviter_id != null ? String(inv.inviter_id) : undefined,
      role: inv.role === "viewer" ? "viewer" : "viewer",
      invite_type:
        inv.invite_type === "friend"
          ? "friend"
          : inv.invite_type === "external"
            ? "external"
            : undefined,
      status: coerceInviteStatus(inv.status),
      created_at: String(inv.created_at ?? ""),
      expires_at: inv.expires_at != null ? String(inv.expires_at) : undefined,
      planner,
    };
  }
  const flat = d as PlanInvite;
  return {
    ...flat,
    token: flat.token?.trim() ? flat.token : token,
    status: coerceInviteStatus(flat.status),
  };
}

export const getPlans = async (
  params?: PaginationParams & {
    role?: "owner" | "member";
    status?: "planning" | "locked" | "ongoing" | "completed" | "cancelled";
  },
): Promise<ApiResponse<GetPlansResponse>> => {
  const response = await apiClient.get<ApiResponse<GetPlansResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.LIST,
    { params },
  );
  return response.data;
};

export const getMyInvites = async (): Promise<
  ApiResponse<PlannerMyInvite[]>
> => {
  const response = await apiClient.get<ApiResponse<PlannerMyInvite[]>>(
    PILGRIM_ENDPOINTS.PLANNER.MY_INVITES,
  );
  return response.data;
};

export const getPlanDetail = async (
  id: string,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.get<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.DETAIL(id),
  );
  const body = response.data;
  if (body == null) {
    return {
      success: false,
      message: "",
      data: undefined,
    };
  }
  return body;
};

export const getPlanCalendarSync = async (
  planId: string,
): Promise<ApiResponse<PlanCalendarSyncData>> => {
  const response = await apiClient.get<ApiResponse<PlanCalendarSyncData>>(
    PILGRIM_ENDPOINTS.PLANNER.CALENDAR_SYNC(planId),
  );
  return response.data;
};

export const createPlan = async (
  data: CreatePlanRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.post<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.CREATE,
    data,
  );
  return response.data;
};

export const updatePlan = async (
  id: string,
  data: UpdatePlanRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.put<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.UPDATE(id),
    data,
  );
  return response.data;
};

export const updatePlannerStatus = async (
  planId: string,
  data: UpdatePlannerStatusRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.patch<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.PLANNER_STATUS(planId),
    data,
  );
  return response.data;
};

export const updatePlannerLock = async (
  planId: string,
  data: UpdatePlannerLockRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.patch<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.PLANNER_LOCK(planId),
    { is_locked: data.locked },
  );
  return response.data;
};

/** POST /api/planners/:id/share — chỉ journey completed, owner */
export const sharePlannerToCommunity = async (
  planId: string,
): Promise<ApiResponse<{ id?: string }>> => {
  const response = await apiClient.post<ApiResponse<{ id?: string }>>(
    PILGRIM_ENDPOINTS.PLANNER.SHARE(planId),
  );
  return response.data;
};

/** POST /api/planners/:id/clone — clone journey */
export const clonePlanner = async (
  planId: string,
  data?: CreatePlanRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.post<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.CLONE(planId),
    data,
  );
  return response.data;
};

export const updatePlannerItemStatus = async (
  planId: string,
  itemId: string,
  data: UpdatePlannerItemStatusRequest,
): Promise<ApiResponse<PlanItem | MarkVisitedConfirmationResponse>> => {
  const response = await apiClient.patch<
    ApiResponse<PlanItem | MarkVisitedConfirmationResponse>
  >(PILGRIM_ENDPOINTS.PLANNER.ITEM_STATUS(planId, itemId), data);
  return response.data;
};

export const reorderPlannerItems = async (
  planId: string,
  data: ReorderPlannerItemsRequest,
): Promise<ApiResponse<{ items: PlanItem[] }>> => {
  const response = await apiClient.post<ApiResponse<{ items: PlanItem[] }>>(
    PILGRIM_ENDPOINTS.PLANNER.REORDER_ITEMS(planId),
    data,
  );
  return response.data;
};

export const swapPlannerItems = async (
  planId: string,
  data: SwapPlannerItemsRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.patch<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.SWAP_ITEMS(planId),
    data,
  );
  return response.data;
};

export const getPlannerProgress = async (
  planId: string,
): Promise<ApiResponse<PlannerProgressResponse>> => {
  const response = await apiClient.get<ApiResponse<PlannerProgressResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.PROGRESS(planId),
  );
  return response.data;
};

export const getPlannerTransactions = async (
  planId: string,
  params?: PaginationParams,
): Promise<ApiResponse<PlannerTransactionsResponse>> => {
  const response = await apiClient.get<
    ApiResponse<PlannerTransactionsResponse>
  >(PILGRIM_ENDPOINTS.PLANNER.TRANSACTIONS(planId), { params });
  return response.data;
};

/** User đang có lời mời awaiting_payment (email khớp) — hủy link PayOS / reset hoặc reject */
export const cancelPlannerDeposit = async (
  planId: string,
  body: { reject: boolean },
): Promise<ApiResponse<{ message?: string }>> => {
  const response = await apiClient.post<ApiResponse<{ message?: string }>>(
    PILGRIM_ENDPOINTS.PLANNER.CANCEL_DEPOSIT(planId),
    body,
  );
  return response.data;
};

export const deletePlan = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE(id),
  );
  return response.data;
};

export const addPlanItem = async (
  planId: string,
  data: AddPlanItemRequest,
): Promise<ApiResponse<AddPlanItemResponse>> => {
  const response = await apiClient.post<ApiResponse<AddPlanItemResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.ADD_ITEM(planId),
    data,
  );
  return response.data;
};

export const updatePlanItem = async (
  planId: string,
  itemId: string,
  data: UpdatePlanItemRequest,
): Promise<ApiResponse<PlanItem>> => {
  const response = await apiClient.put<ApiResponse<PlanItem>>(
    PILGRIM_ENDPOINTS.PLANNER.UPDATE_ITEM(planId, itemId),
    data,
  );
  return response.data;
};

export const clearPlanItems = async (
  planId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.CLEAR_ITEMS(planId),
  );
  return response.data;
};

export const deletePlanItem = async (
  planId: string,
  itemId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE_ITEM(planId, itemId),
  );
  return response.data;
};

export const inviteParticipant = async (
  planId: string,
  data: InviteParticipantRequest,
): Promise<ApiResponse<PlanParticipant>> => {
  const response = await apiClient.post<ApiResponse<PlanParticipant>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE(planId),
    data,
  );
  return response.data;
};

export const inviteFriend = async (
  planId: string,
  friend_id: string,
): Promise<ApiResponse<PlanParticipant>> => {
  const response = await apiClient.post<ApiResponse<PlanParticipant>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE_FRIEND(planId),
    { friend_id },
  );
  return response.data;
};

export const getPlanByInviteToken = async (
  token: string,
): Promise<ApiResponse<PlanInvite>> => {
  const response = await apiClient.get<ApiResponse<InvitePreviewApiPayload>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE_BY_TOKEN(token),
  );
  const body = response.data;
  if (body == null) {
    return {
      success: false,
      message: "",
      data: undefined,
    };
  }
  const raw = body.data;
  if (raw == null) {
    return { ...body, data: undefined };
  }
  return {
    ...body,
    data: normalizeInvitePreviewPayload(token, raw),
  };
};

export const respondToInvite = async (
  token: string,
  data: RespondInviteRequest,
): Promise<ApiResponse<RespondInviteResponse | void>> => {
  const response = await apiClient.post<
    ApiResponse<RespondInviteResponse | void>
  >(PILGRIM_ENDPOINTS.PLANNER.INVITE_BY_TOKEN(token), data);
  return response.data;
};

export const getPlanInvites = async (
  planId: string,
): Promise<ApiResponse<GetInvitesResponse>> => {
  const response = await apiClient.get<
    ApiResponse<PlanInvite[] | GetInvitesResponse>
  >(PILGRIM_ENDPOINTS.PLANNER.INVITES(planId));
  const body = response.data;
  const raw = body.data;
  const invites = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "invites" in raw
      ? (raw as GetInvitesResponse).invites
      : [];
  return { ...body, data: { invites } };
};

export const getPlanMembers = async (
  planId: string,
): Promise<ApiResponse<GetMembersResponse>> => {
  const response = await apiClient.get<ApiResponse<GetMembersResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.MEMBERS(planId),
  );
  return response.data;
};

export const removePlanMember = async (
  planId: string,
  memberId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.REMOVE_MEMBER(planId, memberId),
  );
  return response.data;
};

export const getPlanMessages = async (
  planId: string,
  params?: PaginationParams,
): Promise<ApiResponse<GetPlanMessagesResponse>> => {
  const response = await apiClient.get<ApiResponse<GetPlanMessagesResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.MESSAGES(planId),
    { params },
  );
  return response.data;
};

export const sendPlanMessage = async (
  planId: string,
  data: SendPlanMessageRequest,
): Promise<ApiResponse<PlannerMessage>> => {
  if (data.message_type === "image" && data.imageUri) {
    const formData = new FormData();
    formData.append("message_type", "image");
    
    if (data.content) {
      formData.append("content", data.content);
    } else {
      formData.append("content", "");
    }

    const uriParts = data.imageUri.split(".");
    const fileExt = uriParts[uriParts.length - 1] || "jpg";
    formData.append("image", {
      uri: data.imageUri,
      name: `chat_img_${Date.now()}.${fileExt}`,
      type: `image/${fileExt.toLowerCase() === "png" ? "png" : "jpeg"}`,
    } as any);

    const response = await apiClient.post<ApiResponse<PlannerMessage>>(
      PILGRIM_ENDPOINTS.PLANNER.MESSAGES(planId),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }

  // Fallback for text
  const payload = {
    message_type: data.message_type,
    content: data.content || "",
  };

  const response = await apiClient.post<ApiResponse<PlannerMessage>>(
    PILGRIM_ENDPOINTS.PLANNER.MESSAGES(planId),
    payload,
  );
  return response.data;
};

export const deletePlanMessage = async (
  planId: string,
  messageId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE_MESSAGE(planId, messageId),
  );
  return response.data;
};

export const getMyCheckIns = async (
  params?: PaginationParams,
): Promise<ApiResponse<CheckInEntity[]>> => {
  const response = await apiClient.get<ApiResponse<CheckInEntity[]>>(
    PILGRIM_ENDPOINTS.PLANNER.CHECKINS_ME,
    { params },
  );
  return response.data;
};

export const checkInPlanItem = async (
  planId: string,
  itemId: string,
  data: CheckInItemRequest,
): Promise<ApiResponse<CheckInItemResponse>> => {
  const formData = new FormData();

  // Photo file (required by BE)
  const uriParts = data.photoUri.split(".");
  const fileExt = uriParts[uriParts.length - 1] || "jpg";
  formData.append("photo", {
    uri: data.photoUri,
    name: `checkin_${Date.now()}.${fileExt}`,
    type: `image/${fileExt === "png" ? "png" : "jpeg"}`,
  } as any);

  // Coordinates
  if (data.latitude !== undefined) {
    formData.append("latitude", String(data.latitude));
  }
  if (data.longitude !== undefined) {
    formData.append("longitude", String(data.longitude));
  }
  if (data.checkin_latitude !== undefined) {
    formData.append("checkin_latitude", String(data.checkin_latitude));
  }
  if (data.checkin_longitude !== undefined) {
    formData.append("checkin_longitude", String(data.checkin_longitude));
  }

  // Optional note
  if (data.note) {
    formData.append("note", data.note);
  }

  const response = await apiClient.post<ApiResponse<CheckInItemResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.CHECKIN_ITEM(planId, itemId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const getOfflineData = async (
  planId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await apiClient.get<ApiResponse<unknown>>(
    PILGRIM_ENDPOINTS.PLANNER.OFFLINE_DATA(planId),
  );
  return response.data;
};

export const syncOfflineActions = async (
  data: unknown,
): Promise<ApiResponse<unknown>> => {
  const response = await apiClient.post<ApiResponse<unknown>>(
    PILGRIM_ENDPOINTS.PLANNER.SYNC_OFFLINE_ACTIONS,
    data,
  );
  return response.data;
};

const pilgrimPlannerApi = {
  getPlans,
  getMyInvites,
  getPlanDetail,
  getPlanCalendarSync,
  createPlan,
  updatePlan,
  updatePlannerStatus,
  updatePlannerLock,
  sharePlannerToCommunity,
  clonePlanner,
  updatePlannerItemStatus,
  getPlannerProgress,
  getPlannerTransactions,
  cancelPlannerDeposit,
  deletePlan,
  inviteParticipant,
  inviteFriend,
  getPlanByInviteToken,
  respondToInvite,
  getPlanInvites,
  getPlanMembers,
  removePlanMember,
  addPlanItem,
  clearPlanItems,
  updatePlanItem,
  reorderPlannerItems,
  swapPlannerItems,
  deletePlanItem,
  getPlanMessages,
  sendPlanMessage,
  deletePlanMessage,
  getMyCheckIns,
  checkInPlanItem,
  getOfflineData,
  syncOfflineActions,
};

export default pilgrimPlannerApi;
