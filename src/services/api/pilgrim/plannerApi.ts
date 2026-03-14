/**
 * Pilgrim Planner API
 * Handles trip planning for Pilgrims
 *
 * Endpoints:
 * - GET    /api/plans              - List plans
 * - POST   /api/plans              - Create plan
 * - GET    /api/plans/:id          - Get plan detail
 * - PUT    /api/plans/:id          - Update plan
 * - DELETE /api/plans/:id          - Delete plan
 * - POST   /api/plans/ai-suggest   - Get AI suggestions
 * - POST   /api/plans/:id/invite   - Invite participant
 * - GET    /api/plans/:id/participants - Get participants
 * - GET    /api/checkins/me        - Get my check-ins
 * - POST   /api/planner-items/:id/checkin - Check-in at planner item
 */

import { ApiResponse, PaginationParams } from "../../../types/api.types";
import {
  AddPlanItemRequest,
  AddPlanItemResponse,
  AISuggestionRequest,
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
  PlanParticipant, // Keeping old type for now if needed, or remove if unused in updated functions
  ReorderPlanItemsRequest,
  ReorderPlanItemsResponse,
  RespondInviteRequest,
  SendPlanMessageRequest,
  UpdatePlanItemRequest,
  UpdatePlanRequest
} from "../../../types/pilgrim";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of plans
 */
export const getPlans = async (
  params?: PaginationParams,
): Promise<ApiResponse<GetPlansResponse>> => {
  const response = await apiClient.get<ApiResponse<GetPlansResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.LIST,
    { params },
  );
  return response.data;
};

/**
 * Get plan detail
 */
export const getPlanDetail = async (
  id: string,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.get<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.DETAIL(id),
  );
  return response.data;
};

/**
 * Get calendar sync payload for a plan
 */
export const getPlanCalendarSync = async (
  planId: string,
): Promise<ApiResponse<PlanCalendarSyncData>> => {
  const response = await apiClient.get<ApiResponse<PlanCalendarSyncData>>(
    PILGRIM_ENDPOINTS.PLANNER.CALENDAR_SYNC(planId),
  );
  return response.data;
};

/**
 * Create new plan
 */
export const createPlan = async (
  data: CreatePlanRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.post<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.CREATE,
    data,
  );
  return response.data;
};

/**
 * Update plan
 */
export const updatePlan = async (
  id: string,
  data: UpdatePlanRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.patch<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.UPDATE(id),
    data,
  );
  return response.data;
};

/**
 * Delete plan
 */
export const deletePlan = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE(id),
  );
  return response.data;
};

/**
 * Add item to plan
 */
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

/**
 * Update an item in plan
 */
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

/**
 * Delete item from plan
 */
export const deletePlanItem = async (
  planId: string,
  itemId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE_ITEM(planId, itemId),
  );
  return response.data;
};

/**
 * Reorder items in plan
 */
export const reorderPlanItems = async (
  planId: string,
  data: ReorderPlanItemsRequest,
): Promise<ApiResponse<ReorderPlanItemsResponse>> => {
  const response = await apiClient.patch<ApiResponse<ReorderPlanItemsResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.REORDER_ITEMS(planId),
    data,
  );
  return response.data;
};

/**
 * Get AI trip suggestions
 */
export const getAISuggestions = async (
  data: AISuggestionRequest,
): Promise<ApiResponse<PlanEntity>> => {
  const response = await apiClient.post<ApiResponse<PlanEntity>>(
    PILGRIM_ENDPOINTS.PLANNER.AI_SUGGEST,
    data,
  );
  return response.data;
};

/**
 * Invite participant to plan
 */
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

/**
 * Get plan participants (legacy - kept for backward compat)
 */
export const getParticipants = async (
  planId: string,
): Promise<ApiResponse<PlanParticipant[]>> => {
  const response = await apiClient.get<ApiResponse<PlanParticipant[]>>(
    PILGRIM_ENDPOINTS.PLANNER.PARTICIPANTS(planId),
  );
  return response.data;
};

/**
 * Preview plan via invite token (no auth required)
 * GET /api/planners/invite/{token}
 */
export const getPlanByInviteToken = async (
  token: string,
): Promise<ApiResponse<PlanInvite>> => {
  const response = await apiClient.get<ApiResponse<PlanInvite>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE_BY_TOKEN(token),
  );
  return response.data;
};

/**
 * Respond to invite (accept/reject)
 * POST /api/planners/invite/{token}
 */
export const respondToInvite = async (
  token: string,
  data: RespondInviteRequest,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITE_BY_TOKEN(token),
    data,
  );
  return response.data;
};

/**
 * Get list of invites for a plan
 * GET /api/planners/{id}/invites
 */
export const getPlanInvites = async (
  planId: string,
): Promise<ApiResponse<GetInvitesResponse>> => {
  const response = await apiClient.get<ApiResponse<GetInvitesResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.INVITES(planId),
  );
  return response.data;
};

/**
 * Get members of a plan
 * GET /api/planners/{id}/members
 */
export const getPlanMembers = async (
  planId: string,
): Promise<ApiResponse<GetMembersResponse>> => {
  const response = await apiClient.get<ApiResponse<GetMembersResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.MEMBERS(planId),
  );
  return response.data;
};

/**
 * Remove a member from a plan
 * DELETE /api/planners/{id}/members/{memberId}
 */
export const removePlanMember = async (
  planId: string,
  memberId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.REMOVE_MEMBER(planId, memberId),
  );
  return response.data;
};

/**
 * Get plan messages (chat)
 */
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

/**
 * Send message to plan (chat)
 */
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

/**
 * Delete message from plan (chat)
 */
export const deletePlanMessage = async (
  planId: string,
  messageId: string,
): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete<ApiResponse<void>>(
    PILGRIM_ENDPOINTS.PLANNER.DELETE_MESSAGE(planId, messageId),
  );
  return response.data;
};

/**
 * Get my check-ins
 * API returns array directly in data field, not wrapped in check_ins key
 */
export const getMyCheckIns = async (
  params?: PaginationParams,
): Promise<ApiResponse<CheckInEntity[]>> => {
  const response = await apiClient.get<ApiResponse<CheckInEntity[]>>(
    PILGRIM_ENDPOINTS.PLANNER.CHECKINS_ME,
    { params },
  );
  return response.data;
};

/**
 * Check-in at a planner item
 */
export const checkInPlanItem = async (
  itemId: string,
  data: CheckInItemRequest,
): Promise<ApiResponse<CheckInItemResponse>> => {
  const response = await apiClient.post<ApiResponse<CheckInItemResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.CHECKIN_ITEM(itemId),
    data,
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimPlannerApi = {
  getPlans,
  getPlanDetail,
  getPlanCalendarSync,
  createPlan,
  updatePlan,
  deletePlan,
  getAISuggestions,
  inviteParticipant,
  getParticipants,
  getPlanByInviteToken,
  respondToInvite,
  getPlanInvites,
  getPlanMembers,
  removePlanMember,
  addPlanItem,
  updatePlanItem,
  deletePlanItem,
  reorderPlanItems,
  getPlanMessages,
  sendPlanMessage,
  deletePlanMessage,
  getMyCheckIns,
  checkInPlanItem,
};

export default pilgrimPlannerApi;
