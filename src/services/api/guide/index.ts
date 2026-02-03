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

// Dashboard API (Statistics, Site Schedule, SOS, Notifications)
export * from "./dashboardHomeApi";
export { default as dashboardApi } from "./dashboardHomeApi";
// Backward compatibility aliases
export { default as guideDashboardApi } from "./dashboardHomeApi";
export { default as dashboardHomeApi } from "./dashboardHomeApi";

// Mass Schedule API (Lịch lễ)
export * from "./massScheduleApi";
export { default as massScheduleApi } from "./massScheduleApi";

// Combined Guide API (for backward compatibility)
import dashboardApi from "./dashboardHomeApi";
import guideEventApi from "./eventApi";
import massScheduleApi from "./massScheduleApi";
import guideMediaApi from "./mediaApi";
import guideSiteApi from "./siteApi";

const guideApis = {
  site: guideSiteApi,
  media: guideMediaApi,
  event: guideEventApi,
  dashboard: dashboardApi,
  massSchedule: massScheduleApi,
};

export default guideApis;
