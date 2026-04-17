/**
 * Verification Types
 * Used by Guests and Pilgrims to become a Local Guide
 */

export interface ReactNativeFile {
    uri: string;
    name: string;
    type: string;
}

export interface GuestVerificationRequestPayload {
    applicant_email: string;
    applicant_name: string;
    applicant_phone?: string;
    site_name: string;
    site_address?: string;
    site_province: string;
    site_type?: string;
    site_region?: string;
    certificate?: ReactNativeFile;
    introduction?: string;
}

export interface PilgrimVerificationRequestPayload {
    site_name: string;
    site_address?: string;
    site_province: string;
    site_type?: string;
    site_region?: string;
    certificate?: ReactNativeFile;
    introduction?: string;
}

export interface GuestVerificationResponse {
    id: string;
    code: string;
    applicant_email: string;
    applicant_name: string;
    site_name: string;
    status: string;
}

export interface PilgrimVerificationResponse {
    id: string;
    code: string;
    site_name: string;
    site_address: string;
    site_province: string;
    site_type: string;
    site_region: string;
    site_cover_image?: string | null;
    certificate_url: string;
    introduction: string;
    status: string;
    rejection_reason: string;
    verified_at: string;
    created_at: string;
    applicant: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string;
    };
}

export interface GuestTransitionRequestPayload {
    applicant_email: string;
    applicant_name: string;
    applicant_phone?: string;
    existing_site_id: string;
    transition_reason: string;
    certificate?: ReactNativeFile;
    introduction?: string;
}

export interface PilgrimTransitionRequestPayload {
    existing_site_id: string;
    transition_reason: string;
    certificate?: ReactNativeFile;
    introduction?: string;
}

export interface TransitionResponse {
    id: string;
    code: string;
    existing_site_id: string;
    transition_reason: string;
    status: string;
}

export type ClaimType = 'transition' | 'unassigned';

export interface ClaimableSite {
    id: string;
    code: string;
    name: string;
    address: string;
    province: string;
    region: string;
    type: string;
    cover_image: string | null;
    current_manager: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    } | null;
    claim_type: ClaimType;
}

export interface ClaimableSitesResponse {
    data: ClaimableSite[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}
