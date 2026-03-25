/**
 * Pilgrim Planner API — /api/planners, /api/checkins/me
 *
 * Không dùng từ app: POST /api/planners/deposit-webhook (PayOS → backend).
 * Các route không tồn tại trên BE hiện tại đã được gỡ khỏi client: ai-suggest, participants, reorder.
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
  PlanCalendarSyncData,
  PlanEntity,
  PlanInvite,
  PlanItem,
  PlannerMessage,
  PlannerProgressResponse,
  PlannerTransactionsResponse,
  PlanOwner,
  PlanParticipant,
  RespondInviteRequest,
  RespondInviteResponse,
  SendPlanMessageRequest,
  UpdatePlanItemRequest,
  UpdatePlannerItemStatusRequest,
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
  params?: PaginationParams,
): Promise<ApiResponse<GetPlansResponse>> => {
  const response = await apiClient.get<ApiResponse<GetPlansResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.LIST,
    { params },
  );
  return response.data;
};

export const getPlanDetail = async (
  id: string,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.get<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.DETAIL(id),
  );
  return response.data;
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

export const updatePlannerItemStatus = async (
  planId: string,
  itemId: string,
  data: UpdatePlannerItemStatusRequest,
): Promise<ApiResponse<PlanItem>> => {
  const response = await apiClient.patch<ApiResponse<PlanItem>>(
    PILGRIM_ENDPOINTS.PLANNER.ITEM_STATUS(planId, itemId),
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

export const getPlanByInviteToken = async (
  token: string,
): Promise<ApiResponse<PlanInvite>> => {
  const response = await apiClient.get<ApiResponse<InvitePreviewApiPayload>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE_BY_TOKEN(token),
  );
  const body = response.data;
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
  const response = await apiClient.post<ApiResponse<PlannerMessage>>(
    PILGRIM_ENDPOINTS.PLANNER.MESSAGES(planId),
    data,
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
  const response = await apiClient.post<ApiResponse<CheckInItemResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.CHECKIN_ITEM(planId, itemId),
    data,
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
  getPlanDetail,
  getPlanCalendarSync,
  createPlan,
  updatePlan,
  updatePlannerStatus,
  updatePlannerItemStatus,
  getPlannerProgress,
  getPlannerTransactions,
  cancelPlannerDeposit,
  deletePlan,
  inviteParticipant,
  getPlanByInviteToken,
  respondToInvite,
  getPlanInvites,
  getPlanMembers,
  removePlanMember,
  addPlanItem,
  updatePlanItem,
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
