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
 */

import {
  ApiResponse,
  PaginationParams,
} from "../../../types/api.types";
import {
  AddPlanItemRequest,
  AddPlanItemResponse,
  AISuggestionRequest,
  CreatePlanRequest,
  GetPlansResponse,
  InviteParticipantRequest,
  PlanEntity,
  PlanParticipant, // Keeping old type for now if needed, or remove if unused in updated functions
  ReorderPlanItemsRequest,
  ReorderPlanItemsResponse,
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
 * Get plan participants
 */
export const getParticipants = async (
  planId: string,
): Promise<ApiResponse<PlanParticipant[]>> => {
  const response = await apiClient.get<ApiResponse<PlanParticipant[]>>(
    PILGRIM_ENDPOINTS.PLANNER.PARTICIPANTS(planId),
  );
  return response.data;
};

// ============================================
// EXPORT
// ============================================

const pilgrimPlannerApi = {
  getPlans,
  getPlanDetail,
  createPlan,
  updatePlan,
  deletePlan,
  getAISuggestions,
  inviteParticipant,
  getParticipants,
  addPlanItem,
  deletePlanItem,
  reorderPlanItems,
};

export default pilgrimPlannerApi;
