/**
 * Report Types
 * Type definitions for content reporting feature
 */

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "inappropriate"
  | "false_information"
  | "scam"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "rejected" | "cancelled";

export type ReportTargetType = "post" | "comment" | "user";

export interface ReportEntity {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReportRequest {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
}

export interface GetMyReportsResponse {
  reports: ReportEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
