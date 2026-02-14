/**
 * Guide Types - Shift Submission
 * Type definitions for Local Guide Shift Submission feature
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type ShiftSubmissionStatus = "pending" | "approved" | "rejected";

export type ShiftSubmissionType = "new" | "update"; // Assuming 'update' based on context, though example showed 'new'

// ============================================
// ENTITY TYPES
// ============================================

export interface Shift {
    id: string;
    submission_id: string;
    day_of_week: number;
    start_time: string; // HH:mm:ss
    end_time: string; // HH:mm:ss
    created_at: string;
}

export interface ShiftSubmission {
    id: string;
    guide_id: string;
    site_id: string;
    code: string;
    week_start_date: string; // YYYY-MM-DD
    submission_type: ShiftSubmissionType | string;
    change_reason: string | null;
    previous_submission_id: string | null;
    status: ShiftSubmissionStatus;
    total_shifts: number;
    rejection_reason: string | null;
    approved_by: string | null;
    approved_at: string | null;
    is_active: boolean;
    created_at: string;
    shifts?: Shift[];
}

// ============================================
// REQUEST TYPES
// ============================================

export interface CreateShiftRequest {
    day_of_week: number;
    start_time: string; // HH:mm
    end_time: string; // HH:mm
}

export interface CreateShiftSubmissionRequest {
    week_start_date: string; // YYYY-MM-DD
    shifts: CreateShiftRequest[];
    previous_submission_id?: string;
    change_reason?: string;
}

export interface GetShiftSubmissionsParams {
    status?: ShiftSubmissionStatus;
    week_start_date?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface CreateShiftSubmissionResponse {
    success: boolean;
    message: string;
    data: {
        submission: ShiftSubmission;
        shifts: Shift[];
    };
}

export interface GetShiftSubmissionsResponse {
    success: boolean;
    data: ShiftSubmission[];
}
