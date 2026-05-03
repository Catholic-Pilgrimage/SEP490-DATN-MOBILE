/**
 * Pilgrim Types - Planner
 * Type definitions for Pilgrim Trip Planner feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type PlanStatus =
  | "draft"
  | "planning"
  | "locked"
  | "ongoing"
  | "completed"
  | "cancelled";

export type TransportationType =
  | "motorbike"
  | "car"
  | "bus"
  | "train"
  | "plane"
  | "walk"
  | "other";

// ============================================
// SUB-ENTITIES
// ============================================

export interface PlanOwner {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
}

export interface PlanItem {
  id: string;
  uuid?: string;
  planner_id?: string;
  site_id?: string;
  event_id?: string;
  /** Trạng thái điểm đến từ BE: planned | in_progress | visited | skipped | ... */
  status?: string;
  /** BE trả về `leg_number` (ngày thứ mấy trong chuyến, bắt đầu 1). */
  leg_number?: number;
  /** Dùng nội bộ app / offline; khi đọc từ API ưu tiên đồng bộ với `leg_number`. */
  day_number?: number;
  order_index?: number;
  note?: string;
  nearby_amenity_ids?: string[]; // UUIDs of nearby places saved to this item
  site: {
    id?: string;
    name: string;
    image?: string;
    address?: string;
    cover_image?: string;
    latitude?: number;
    longitude?: number;
    /** Dùng cho ràng buộc bổn mạng nhóm (đồng bộ với Site.patron_saint). */
    patron_saint?: string;
  };
  arrival_time?: string;
  departure_time?: string;
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: text (e.g., "1 hour", "2 hours 30 minutes")
  /** Tính từ điểm dừng trước trong cùng ngày (BE / client enrich). */
  travel_time_minutes?: number;
  travel_distance_km?: number;
}

export interface PlanParticipant {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

export interface PlanMember {
  // PlannerMember có composite PK: (planner_id, user_id) — không có id riêng
  planner_id: string;
  user_id: string;
  role: "viewer";
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface PlanInvite {
  id: string;
  planner_id: string;
  token: string;
  email: string;
  inviter_id?: string;
  role: "viewer";
  invite_type?: "friend" | "external";
  status: "pending" | "accepted" | "rejected" | "expired" | "awaiting_payment";
  created_at: string;
  expires_at?: string;
  planner?: {
    id: string;
    name: string;
    estimated_days?: number;
    number_of_days?: number;
    number_of_people?: number;
    transportation?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    deposit_amount?: number;
    penalty_percentage?: number;
    item_count?: number;
    owner?: PlanOwner;
    /** GET /planners/invite/:token — formatPlannerWithItems */
    items_by_day?: Record<string, PlanItem[]>;
  };
}

// ============================================
// MY INVITES (pending / awaiting_payment)
// ============================================

export type PlannerInviteType = "friend" | "external";
export type PlannerInvitePendingStatus = "pending" | "awaiting_payment";

export interface PlannerInviteInviterSummary {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface PlannerInvitePlannerSummary {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  number_of_people?: number;
  transportation?: string;
  deposit_amount?: number;
  penalty_percentage?: number;
  is_locked?: boolean;
  created_at?: string;
  updated_at?: string;
  /** Một số endpoint trả kèm lịch — dùng để đếm điểm dừng trên card mời. */
  items_by_day?: Record<string, PlanItem[]>;
  item_count?: number;
}

export interface PlannerMyInvite {
  id: string;
  token: string;
  invite_type: PlannerInviteType;
  status: PlannerInvitePendingStatus;
  expires_at?: string;
  created_at?: string;
  planner?: PlannerInvitePlannerSummary;
  inviter?: PlannerInviteInviterSummary;
}

export interface RespondInviteRequest {
  action: "accept" | "reject";
}

/** Dữ liệu tùy chọn khi POST /planners/invite/:token (ví dụ redirect thanh toán cọc) */
export interface RespondInviteResponse {
  checkout_url?: string;
  payment_url?: string;
  message?: string;
  /** BE: đã trừ cọc từ ví, không cần PayOS */
  paid_from_wallet?: boolean;
  deposit_required?: boolean;
  order_code?: number;
  amount?: number;
}

/** Hàng trả về từ GET /planners/:id/members (owner + thành viên, flatten user) */
export interface PlannerMemberApiRow {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  joined_at?: string;
  deposit_status?: string;
  join_status?: string;
  /** Lời mời bạn bè: không cọc; dùng khi rời nhóm / copy hoàn cọc */
  invite_type?: PlannerInviteType;
}

export interface GetMembersResponse {
  total_slots?: number;
  current_members?: number;
  available_slots?: number;
  members: PlannerMemberApiRow[];
}

export interface GetInvitesResponse {
  invites: PlanInvite[];
}
export interface PlanCalendarSyncOwner {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}
export interface PlanCalendarSyncPlanner {
  id: string;
  name: string;
  estimated_days?: number;
  number_of_people?: number;
  transportation?: TransportationType | string;
  owner?: PlanCalendarSyncOwner;
}
export interface PlanCalendarSyncAlarm {
  relativeOffset: number;
  method?: string;
}
export interface PlanCalendarSyncCoordinates {
  latitude: number;
  longitude: number;
}
export interface PlanCalendarSyncMetadata {
  planner_id: string;
  planner_item_id: string;
  site_id?: string;
  site_code?: string;
  day_number?: number;
  order_index?: number;
  coordinates?: PlanCalendarSyncCoordinates;
  [key: string]: unknown;
}
export interface PlanCalendarSyncEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  notes?: string | { start?: string; end?: string; [key: string]: any };
  alarms?: PlanCalendarSyncAlarm[];
  timeZone?: string;
  metadata?: PlanCalendarSyncMetadata;
}
export interface PlanCalendarSyncInstructions {
  timezone?: string;
  alarm_offsets?: number[];
  recommended_calendar_name?: string;
}
export interface PlanCalendarSyncData {
  planner: PlanCalendarSyncPlanner;
  events: PlanCalendarSyncEvent[];
  total_events: number;
  sync_instructions?: PlanCalendarSyncInstructions;
}
// ============================================
// API RESPONSE ENTITIES
// ============================================

// Matches GET /api/planners item
export interface PlanEntity {
  id: string;
  user_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  number_of_days?: number;
  estimated_days?: number;
  number_of_people: number;
  transportation: string;
  status: string;
  share_token: string;
  qr_code_url: string;
  owner?: PlanOwner;
  created_at: string;
  updated_at: string;

  // Detailed fields (optional in list)
  items?: PlanItem[];
  items_by_day?: Record<string, PlanItem[]>;
  item_count?: number;
  is_public?: boolean; // inferred from usage
  /** Kế hoạch nhóm: cọc thành viên (VND) */
  deposit_amount?: number;
  penalty_percentage?: number;
  /** Số người tối thiểu cần có để chốt kế hoạch (nhóm). ≤ number_of_people */
  min_people_required?: number;
  /** Khớp cột `is_locked` trên BE (nhóm, giai đoạn lập kế hoạch) */
  is_locked?: boolean;
  /** Thời điểm khoá chỉnh sửa (edit lock). Nhóm only. */
  edit_lock_at?: string | null;
  /** Thời điểm hệ thống tự chốt kế hoạch (status lock). */
  planner_lock_at?: string | null;
  /** ID của hành trình tiếp nối (nếu đã tạo từ hành trình này) */
  continuation_id?: string;
  /** ID của hành trình gốc (nếu hành trình này là tiếp nối của hành trình khác) */
  continued_from_id?: string;
  /** Thời điểm lần mời đầu tiên (dùng để tính thời gian thảo luận). */
  first_invite_at?: string | null;
  /** Thời điểm sớm nhất có thể đặt edit_lock_at (sau 12h thảo luận). */
  edit_lock_available_at?: string | null;
  /** Có thể đặt edit_lock_at hay không (backend đã tính sẵn). */
  can_set_edit_lock_at?: boolean;
  /** Sau POST /planners/:id/share — BE có thể trả để ẩn CTA chia sẻ lại */
  shared_to_community?: boolean;

  /** Lý do hủy — BE trả khi status = cancelled (emergency-stop) */
  cancelled_reason?: string | null;

  viewer_join_status?: "owner" | "joined" | "dropped_out" | "kicked" | null;
  viewer_deposit_status?: string | null;
  is_read_only?: boolean;
}

export interface GetPlansResponse {
  planners: PlanEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddPlanItemResponse {
  item: PlanItem;
}

export interface MessageSender {
  id: string;
  full_name: string;
  avatar_url: string;
}

export interface PlannerMessage {
  id: string;
  message_type: "text" | "image" | "system";
  content: string;
  image_url: string | null;
  sender: MessageSender | null;
  created_at: string;
  planner_id?: string;
  user_id?: string;
  user?: MessageSender;
}

export interface GetPlanMessagesResponse {
  messages: PlannerMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UploadMessageImageResponse {
  image_url: string;
}

// ============================================
// API REQUEST TYPES
// ============================================

/** POST /api/planners — khớp BE (validator + Planner model) */
export interface CreatePlanRequest {
  name: string;
  number_of_people: number;
  /** motorbike | car | bus */
  transportation?: string;
  /** YYYY-MM-DD, từ ngày mai (BE) */
  start_date?: string;
  end_date?: string;
  deposit_amount?: number;
  penalty_percentage?: number;
  min_people_required?: number;
}

export interface UpdatePlanRequest {
  name?: string;
  number_of_people?: number;
  transportation?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  deposit_amount?: number;
  penalty_percentage?: number;
  min_people_required?: number;
  /** Thời điểm khoá chỉnh sửa (nhóm). null = huỷ, ISO string = đặt trước. */
  edit_lock_at?: string | null;
}

/** Body POST /api/planners/:id/items — BE validate `leg_number` (không dùng `day_number`). */
export interface AddPlanItemRequest {
  site_id: string;
  leg_number: number;
  event_id?: string;
  note?: string;
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: text (e.g., "1 hour", "30 minutes", "2 hours 30 minutes")
  travel_time_minutes?: number;
}

export interface UpdatePlanItemRequest {
  day_number?: number;
  leg_number?: number;
  order_index?: number;
  note?: string;
  nearby_amenity_ids?: string[]; // UUIDs of nearby places to associate with this item
  estimated_time?: string; // Format: "HH:MM" (e.g., "09:00", "14:30")
  rest_duration?: string; // Format: "30 minutes", "1 hour", "2 hours 30 minutes"
  travel_time_minutes?: number;
}

export interface InviteParticipantRequest {
  email: string; // BE dùng email (PlannerInvite.email allowNull: false)
  role: "viewer"; // BE chỉ validate isIn: [['viewer']]
}

export interface SendPlanMessageRequest {
  message_type: "text" | "image";
  content?: string;
  image_url?: string;
  imageUri?: string;
}

// ============================================
// CHECK-IN TYPES
// ============================================

export interface CheckInEntity {
  id: string;
  planner_item_id: string;
  user_id: string;
  site_id: string;
  checked_in_at: string;
  /** Một số endpoint trả `checkin_date` thay cho `checked_in_at` */
  checkin_date?: string;
  /** Trạng thái check-in: 'checked_in' | 'missed' | ... — lọc chỉ lấy 'checked_in' */
  status?: string;
  note?: string;
  /** Ảnh check-in đơn (BE progress/history) */
  photo_url?: string;
  photos?: string[];
  site?: {
    id: string;
    name: string;
    image?: string;
    cover_image?: string;
    address?: string;
  };
  planner?: {
    id: string;
    name: string;
  };
}

export interface GetCheckInsResponse {
  check_ins?: CheckInEntity[]; // Legacy format (optional)
  // OR can be directly an array when used with ApiResponse<CheckInEntity[]>
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** BE CheckinController: nhận multipart/form-data với field `photo` (ảnh bắt buộc). */
export interface CheckInItemRequest {
  latitude?: number;
  longitude?: number;
  checkin_latitude?: number;
  checkin_longitude?: number;
  /** Local file URI from ImagePicker — sẽ được gửi qua FormData field 'photo' */
  photoUri: string;
  note?: string;
}

export interface CheckInItemResponse {
  check_in: CheckInEntity;
}

/** PATCH /planners/:id/status — khớp SEP490-DATN-BACKEND PlannerService.updatePlannerStatus */
export interface UpdatePlannerStatusRequest {
  status: "locked" | "ongoing" | "completed" | "cancelled";
}

/** POST /planners/:id/emergency-stop — [Trưởng đoàn] dừng khẩn cấp hành trình đang ongoing */
export interface EmergencyStopRequest {
  cancelled_reason: string;
}

/** PATCH /api/planners/:id/lock */
export interface UpdatePlannerLockRequest {
  locked: boolean;
}

/** POST /api/planners/:id/days/:dayNumber/close */
export interface ClosePlannerDayResponse {
  planner_id: string;
  closed_day: number;
  next_day_to_close: number;
  has_next_day: boolean;
}

/**
 * PATCH /planners/:id/items/:itemId/status — CheckinController.updateItemStatus
 * visited: có thể cần bước 2 với confirm_missed + skip_reason khi BE trả requires_confirmation
 */
export type UpdatePlannerItemStatusRequest =
  | {
      status: "visited";
      skip_reason?: string;
      requires_confirmation?: boolean;
      confirm_missed?: boolean;
      confirmed?: boolean;
    }
  | { status: "skipped"; skip_reason: string };

/** Khi chốt visited mà còn thành viên chưa check-in — BE trả để client xác nhận lần 2 */
export interface MarkVisitedConfirmationResponse {
  requires_confirmation: true;
  site?: { id: string; name: string };
  stats?: { checked_in: number; missed: number };
  missing_members?: Array<{
    user_id: string;
    full_name: string;
    avatar_url?: string;
  }>;
  skip_reason_required?: boolean;
}

/** POST /planners/:id/items/reorder — leg_number = ngày (leg), item_ids = thứ tự mới */
export interface ReorderPlannerItemsRequest {
  leg_number: number;
  item_ids: string[];
}

/** PATCH /planners/:id/items/swap */
export interface SwapPlannerAffectedDayItem {
  id: string;
  estimated_time: string;
  travel_time_minutes: number;
}

/** PATCH /planners/:id/items/swap */
export interface SwapPlannerAffectedDay {
  leg_number: number;
  items: SwapPlannerAffectedDayItem[];
}

/** PATCH /planners/:id/items/swap */
export interface SwapPlannerItemsRequest {
  item_id_a: string;
  item_id_b: string;
  affected_days: SwapPlannerAffectedDay[];
}

export interface PlannerProgressMember {
  user_id: string;
  total_items: number;
  checked_in: number;
  skipped_by_planner: number;
  missed: number;
  completed: number;
  percent: number;
  history?: Array<{
    planner_item_id: string;
    status: string;
    checkin_date?: string;
    photo_url?: string;
    skipped_at?: string;
    skip_reason?: string;
  }>;
}

export interface PlannerProgressResponse {
  planner_status: string;
  total_items: number;
  total_members: number;
  member_progress: PlannerProgressMember[];
}

export interface PlannerTransactionsSummary {
  total_fund_locked?: number;
  total_penalty_pending?: number;
  total_penalty_received?: number;
  total_refunded?: number;
}

export interface PlannerTransactionEntry {
  id?: string;
  type?: string;
  amount?: number;
  label?: string;
  status?: string;
  created_at?: string;
  meta?: {
    planner_id?: string | null;
    target_user_id?: string | null;
    order_code?: string | null;
  };
  wallet?: {
    user?: {
      id?: string;
      full_name?: string;
      email?: string;
      avatar_url?: string;
    };
  };
}

export interface PlannerTransactionsResponse {
  summary?: PlannerTransactionsSummary;
  transactions?: PlannerTransactionEntry[];
  total?: number;
  totalPages?: number;
  currentPage?: number;
}

// ============================================
// UI / LEGACY TYPES
// ============================================

export interface PlanSummary {
  id: string;
  title: string;
  estimatedDays?: number;
  status: PlanStatus;
  stopCount: number;
  coverImage?: string;
  participantCount: number;
  isShared?: boolean;
  transportation?: TransportationType[];
  /** YYYY-MM-DD từ API */
  startDate?: string;
  endDate?: string;
}
