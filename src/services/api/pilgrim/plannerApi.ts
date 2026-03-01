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

import {
  ApiResponse,
  PaginationParams,
} from "../../../types/api.types";
import {
  AddPlanItemRequest,
  AddPlanItemResponse,
  AISuggestionRequest,
  CheckInItemRequest,
  CheckInItemResponse,
  CreatePlanRequest,
  GetCheckInsResponse,
  GetPlanMessagesResponse,
  GetPlansResponse,
  InviteParticipantRequest,
  PlanEntity,
  PlannerMessage,
  PlanParticipant, // Keeping old type for now if needed, or remove if unused in updated functions
  ReorderPlanItemsRequest,
  ReorderPlanItemsResponse,
  SendPlanMessageRequest,
  UpdatePlanRequest,
  UploadMessageImageResponse
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
 * Upload image for plan message (chat)
 */
export const uploadPlanMessageImage = async (
  planId: string,
  imageFile: any, // Expecting { uri, name, type } or similar
): Promise<ApiResponse<UploadMessageImageResponse>> => {
  const formData = new FormData();
  formData.append("image", {
    uri: imageFile.uri,
    name: imageFile.name || "image.jpg",
    type: imageFile.type || "image/jpeg",
  } as any);

  const response = await apiClient.post<ApiResponse<UploadMessageImageResponse>>(
    PILGRIM_ENDPOINTS.PLANNER.UPLOAD_MESSAGE_IMAGE(planId),
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: (data, headers) => {
        return formData; // Crucial for some axios adapters to not mess up FormData
      },
    }
  );
  return response.data;
};

/**
 * Get my check-ins
 */
export const getMyCheckIns = async (
  params?: PaginationParams,
): Promise<ApiResponse<GetCheckInsResponse>> => {
  const response = await apiClient.get<ApiResponse<GetCheckInsResponse>>(
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
  createPlan,
  updatePlan,
  deletePlan,
  getAISuggestions,
  inviteParticipant,
  getParticipants,
  addPlanItem,
  deletePlanItem,
  reorderPlanItems,
  getPlanMessages,
  sendPlanMessage,
  deletePlanMessage,
  uploadPlanMessageImage,
  getMyCheckIns,
  checkInPlanItem,
};

export default pilgrimPlannerApi;
