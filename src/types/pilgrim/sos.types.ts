/**
 * Pilgrim Types - SOS
 * Type definitions for Pilgrim SOS feature
 */

export type SOSStatus = "pending" | "accepted" | "resolved" | "cancelled";

export interface SOSEntity {
  id: string;
  code: string;
  user_id: string;
  site_id: string;
  latitude: number;
  longitude: number;
  message: string;
  contact_phone: string;
  status: SOSStatus;
  assigned_to?: string;
  assigned_at?: string;
  // Some backend payloads use `note` instead of `notes`.
  note?: string;
  notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  site?: {
    id: string;
    name: string;
    address: string;
    province: string;
  };
  pilgrim?: {
    id: string;
    full_name: string;
    phone: string;
    avatar_url: string;
  };
  assignedGuide?: {
    id: string;
    full_name: string;
    phone: string;
    avatar_url: string;
  };
}

export interface CreateSOSRequest {
  site_id: string;
  message: string;
  latitude: number;
  longitude: number;
}

export interface GetSOSListResponse {
  sosRequests: SOSEntity[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface SOSListParams {
  page?: number;
  limit?: number;
  status?: SOSStatus;
}
