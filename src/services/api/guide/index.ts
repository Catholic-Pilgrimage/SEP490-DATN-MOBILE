/**
 * Guide API Index
 * Central export for all Local Guide API services
 *
 * Usage:
 * import { guideSiteApi, guideMediaApi, guideEventApi } from '@/services/api/guide';
 *
 * // Or import specific functions
 * import { getAssignedSite } from '@/services/api/guide/siteApi';
 * import { getEvents, createEvent } from '@/services/api/guide/eventApi';
 */

// Site API
export * from "./siteApi";
export { default as guideSiteApi } from "./siteApi";

// Media API
export * from "./mediaApi";
export { default as guideMediaApi } from "./mediaApi";

// Event API
export * from "./eventApi";
export { default as guideEventApi } from "./eventApi";

// Dashboard API
export * from "./dashboardApi";
export { default as guideDashboardApi } from "./dashboardApi";

// Combined Guide API (for backward compatibility)
import guideDashboardApi from "./dashboardApi";
import guideEventApi from "./eventApi";
import guideMediaApi from "./mediaApi";
import guideSiteApi from "./siteApi";

const guideApis = {
  site: guideSiteApi,
  media: guideMediaApi,
  event: guideEventApi,
  dashboard: guideDashboardApi,
};

export default guideApis;
