/**
 * Guide Types - SOS
 * Type definitions for Guide SOS feature
 *
 * SOSStatus and SOSEntity are defined in pilgrim/sos.types.ts (shared types).
 * They are re-exported here for guide-side convenience.
 * Guide-specific types (params, responses) are also defined here.
 */

// Re-export shared SOS types for guide consumers
export type { SOSEntity, SOSStatus } from "../pilgrim/sos.types";

export interface GuideSOSListParams {
    page?: number;
    limit?: number;
    status?: import("../pilgrim/sos.types").SOSStatus;
    show_all?: boolean;
}

export interface GetGuideSOSListResponse {
    sosRequests: import("../pilgrim/sos.types").SOSEntity[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

export interface ResolveSOSRequest {
    notes?: string;
}
