/**
 * API Services Index
 *
 * Central export for all API services organized by role/domain
 *
 * Structure:
 * ├── core/           - API client, interceptors, utilities
 * ├── shared/         - Auth, User, Notification (used by all roles)
 * ├── guide/          - Local Guide specific APIs
 * └── pilgrim/        - Pilgrim specific APIs
 *
 * Usage Examples:
 *
 * // Import specific API
 * import { guideMediaApi } from '@/services/api';
 * await guideMediaApi.getMedia();
 *
 * // Import by role
 * import { guideApis, pilgrimApis } from '@/services/api';
 * await guideApis.media.getMedia();
 * await pilgrimApis.site.getSites();
 *
 * // Import shared APIs
 * import { authApi, userApi } from '@/services/api';
 * await authApi.login(credentials);
 */

// ============================================
// CORE
// ============================================
export { default as apiClient } from "./apiClient";
export {
    AUTH_ENDPOINTS, ENDPOINTS, GUIDE_ENDPOINTS,
    PILGRIM_ENDPOINTS,
    SHARED_ENDPOINTS, USER_ENDPOINTS, default as endpoints
} from "./endpoints";

// ============================================
// SHARED APIs (Auth, User, Notification)
// ============================================
export { authApi, notificationApi, default as sharedApis, userApi } from "./shared";

// ============================================
// GUIDE APIs
// ============================================
export { default as guideApis, guideDashboardApi, guideMediaApi, guideSiteApi } from "./guide";

// ============================================
// PILGRIM APIs
// ============================================
export {
    default as pilgrimApis, pilgrimCommunityApi, pilgrimJournalApi,
    pilgrimPlannerApi, pilgrimSiteApi
} from "./pilgrim";

// ============================================
// TYPES RE-EXPORT
// ============================================
export type {
    ApiError, ApiResponse, PaginatedResponse,
    Pagination,
    PaginationParams,
    SearchParams
} from "../../types/api.types";

