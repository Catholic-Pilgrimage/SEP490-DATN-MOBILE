/**
 * API Services Index
 */

// Core
export { default as apiClient } from './apiClient';
export {
    AUTH_ENDPOINTS, ENDPOINTS,
    default as endpoints, GUIDE_ENDPOINTS, PILGRIM_ENDPOINTS, SHARED_ENDPOINTS, USER_ENDPOINTS
} from './endpoints';

// Shared APIs
export { authApi, notificationApi, default as sharedApis, userApi } from './shared';

// Guide APIs
export { default as guideApis, guideDashboardApi, guideMediaApi, guideSiteApi } from './guide';

// Pilgrim APIs
export {
    default as pilgrimApis, pilgrimCommunityApi, pilgrimJournalApi, pilgrimPlannerApi, pilgrimSiteApi
} from './pilgrim';

// Types
export type {
    ApiError, ApiResponse, PaginatedResponse,
    Pagination,
    PaginationParams,
    SearchParams
} from '../../types/api.types';

