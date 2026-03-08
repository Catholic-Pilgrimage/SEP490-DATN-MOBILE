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
export {
    default as dashboardHomeApi,
    default as guideDashboardApi
} from "./dashboardHomeApi";

// Mass Schedule API (Lịch lễ)
export * from "./massScheduleApi";
export { default as massScheduleApi } from "./massScheduleApi";

// SOS API
export * from "./sosApi";
export { default as guideSOSApi } from "./sosApi";

// Shift Submission API
export * from "./shiftSubmissionApi";
export { default as shiftSubmissionApi } from "./shiftSubmissionApi";

// Nearby Places API
export * from "./nearbyPlacesApi";
export { default as guideNearbyPlacesApi } from "./nearbyPlacesApi";

// Combined Guide API (for backward compatibility)
import dashboardApi from "./dashboardHomeApi";
import guideEventApi from "./eventApi";
import massScheduleApi from "./massScheduleApi";
import guideMediaApi from "./mediaApi";
import shiftSubmissionApi from "./shiftSubmissionApi";
import guideSiteApi from "./siteApi";
import guideSOSApi from "./sosApi";

const guideApis = {
  site: guideSiteApi,
  media: guideMediaApi,
  event: guideEventApi,
  dashboard: dashboardApi,
  massSchedule: massScheduleApi,
  shiftSubmission: shiftSubmissionApi,
  sos: guideSOSApi,
};

export default guideApis;
