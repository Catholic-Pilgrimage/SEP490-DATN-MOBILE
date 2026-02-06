/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for all API calls
 * Organized by feature/module for easy maintenance
 */

// Base API paths
const API_BASE = "/api";

/**
 * Authentication endpoints
 * Used by both Pilgrim and Local Guide roles
 */
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE}/auth/login`,
  REGISTER: `${API_BASE}/auth/register`,
  LOGOUT: `${API_BASE}/auth/logout`,
  REFRESH_TOKEN: `${API_BASE}/auth/refresh-token`,
  PROFILE: `${API_BASE}/auth/profile`,
  CHANGE_PASSWORD: `${API_BASE}/auth/change-password`,
  FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
  VERIFY_EMAIL: `${API_BASE}/auth/verify-email`,
  RESEND_OTP: `${API_BASE}/auth/resend-otp`,
} as const;

/**
 * User endpoints
 * Profile management, settings - shared between roles
 */
export const USER_ENDPOINTS = {
  GET_PROFILE: `${API_BASE}/users/profile`,
  UPDATE_PROFILE: `${API_BASE}/users/profile`,
  UPDATE_AVATAR: `${API_BASE}/users/avatar`,
  GET_SETTINGS: `${API_BASE}/users/settings`,
  UPDATE_SETTINGS: `${API_BASE}/users/settings`,
  DELETE_ACCOUNT: `${API_BASE}/users/account`,
} as const;

/**
 * Pilgrim-specific endpoints
 */
export const PILGRIM_ENDPOINTS = {
  // Sites - Viewing pilgrimage sites
  SITES: {
    LIST: `${API_BASE}/sites`,
    DETAIL: (id: string) => `${API_BASE}/sites/${id}`,
    SEARCH: `${API_BASE}/sites/search`,
    BY_REGION: (regionId: string) => `${API_BASE}/sites/region/${regionId}`,
    NEARBY: `${API_BASE}/sites/nearby`,
    FAVORITES: `${API_BASE}/sites/favorites`,
    ADD_FAVORITE: (id: string) => `${API_BASE}/sites/${id}/favorite`,
    REMOVE_FAVORITE: (id: string) => `${API_BASE}/sites/${id}/favorite`,
    REVIEWS: (id: string) => `${API_BASE}/sites/${id}/reviews`,
    ADD_REVIEW: (id: string) => `${API_BASE}/sites/${id}/reviews`,
    MEDIA: (id: string) => `${API_BASE}/sites/${id}/media`,
    MASS_SCHEDULES: (id: string) => `${API_BASE}/sites/${id}/mass-schedules`,
    EVENTS: (id: string) => `${API_BASE}/sites/${id}/events`,
    NEARBY_PLACES: (id: string) => `${API_BASE}/sites/${id}/nearby-places`,
  },

  // Planner - Trip planning
  PLANNER: {
    LIST: `${API_BASE}/plans`,
    CREATE: `${API_BASE}/plans`,
    DETAIL: (id: string) => `${API_BASE}/plans/${id}`,
    UPDATE: (id: string) => `${API_BASE}/plans/${id}`,
    DELETE: (id: string) => `${API_BASE}/plans/${id}`,
    AI_SUGGEST: `${API_BASE}/plans/ai-suggest`,
    INVITE: (id: string) => `${API_BASE}/plans/${id}/invite`,
    PARTICIPANTS: (id: string) => `${API_BASE}/plans/${id}/participants`,
  },

  // Journal - Spiritual journals
  JOURNAL: {
    LIST: `${API_BASE}/journals`,
    CREATE: `${API_BASE}/journals`,
    DETAIL: (id: string) => `${API_BASE}/journals/${id}`,
    UPDATE: (id: string) => `${API_BASE}/journals/${id}`,
    DELETE: (id: string) => `${API_BASE}/journals/${id}`,
    SHARE: (id: string) => `${API_BASE}/journals/${id}/share`,
  },

  // Community - Social features for pilgrims
  COMMUNITY: {
    // Posts
    POSTS: `${API_BASE}/community/posts`,
    POST_DETAIL: (id: string) => `${API_BASE}/community/posts/${id}`,
    CREATE_POST: `${API_BASE}/community/posts`,
    LIKE_POST: (id: string) => `${API_BASE}/community/posts/${id}/like`,
    COMMENTS: (postId: string) =>
      `${API_BASE}/community/posts/${postId}/comments`,
    ADD_COMMENT: (postId: string) =>
      `${API_BASE}/community/posts/${postId}/comments`,

    // Testimonies
    TESTIMONIES: `${API_BASE}/community/testimonies`,
    CREATE_TESTIMONY: `${API_BASE}/community/testimonies`,

    // Groups
    GROUPS: `${API_BASE}/community/groups`,
    GROUP_DETAIL: (id: string) => `${API_BASE}/community/groups/${id}`,
    JOIN_GROUP: (id: string) => `${API_BASE}/community/groups/${id}/join`,
    LEAVE_GROUP: (id: string) => `${API_BASE}/community/groups/${id}/leave`,
  },

  // Explore - Discovery features
  EXPLORE: {
    FEATURED: `${API_BASE}/explore/featured`,
    TRENDING: `${API_BASE}/explore/trending`,
    RECOMMENDED: `${API_BASE}/explore/recommended`,
    EVENTS: `${API_BASE}/explore/events`,
  },
} as const;

/**
 * Local Guide-specific endpoints
 */
export const GUIDE_ENDPOINTS = {
  // Dashboard - Statistics and overview
  DASHBOARD: {
    OVERVIEW: `${API_BASE}/guide/dashboard`,
    STATISTICS: `${API_BASE}/guide/dashboard/statistics`,
    RECENT_ACTIVITIES: `${API_BASE}/guide/dashboard/activities`,
    EARNINGS: `${API_BASE}/guide/dashboard/earnings`,
  },

  // Local Guide Site - Get assigned site info
  LOCAL_GUIDE_SITE: `${API_BASE}/local-guide/site`,

  // Local Guide Site Schedule - Weekly schedule for assigned site
  LOCAL_GUIDE_SITE_SCHEDULE: `${API_BASE}/local-guide/site-schedule`,

  // Local Guide Mass Schedule - Lịch lễ management
  LOCAL_GUIDE_MASS_SCHEDULES: {
    LIST: `${API_BASE}/local-guide/schedules`,
    CREATE: `${API_BASE}/local-guide/schedules`,
    UPDATE: (id: string) => `${API_BASE}/local-guide/schedules/${id}`,
    DELETE: (id: string) => `${API_BASE}/local-guide/schedules/${id}`,
    RESTORE: (id: string) => `${API_BASE}/local-guide/schedules/${id}/restore`,
  },

  // @deprecated Use LOCAL_GUIDE_MASS_SCHEDULES instead
  LOCAL_GUIDE_SCHEDULES: `${API_BASE}/local-guide/schedules`,

  // SOS Support - Pending support requests
  SOS: {
    LIST: `${API_BASE}/sos/site/list`,
    DETAIL: (id: string) => `${API_BASE}/sos/site/${id}`,
    UPDATE: (id: string) => `${API_BASE}/sos/site/${id}`,
  },

  // Local Guide Media - Media management for assigned site
  LOCAL_GUIDE_MEDIA: {
    LIST: `${API_BASE}/local-guide/media`,
    UPLOAD: `${API_BASE}/local-guide/media`,
    UPDATE: (id: string) => `${API_BASE}/local-guide/media/${id}`,
    DELETE: (id: string) => `${API_BASE}/local-guide/media/${id}`,
    RESTORE: (id: string) => `${API_BASE}/local-guide/media/${id}/restore`,
  },

  // Local Guide Events - Event management for assigned site
  LOCAL_GUIDE_EVENTS: {
    LIST: `${API_BASE}/local-guide/events`,
    CREATE: `${API_BASE}/local-guide/events`,
    UPDATE: (id: string) => `${API_BASE}/local-guide/events/${id}`,
    DELETE: (id: string) => `${API_BASE}/local-guide/events/${id}`,
    RESTORE: (id: string) => `${API_BASE}/local-guide/events/${id}/restore`,
  },

  // My Sites - Site management
  MY_SITES: {
    LIST: `${API_BASE}/guide/sites`,
    CREATE: `${API_BASE}/guide/sites`,
    DETAIL: (id: string) => `${API_BASE}/guide/sites/${id}`,
    UPDATE: (id: string) => `${API_BASE}/guide/sites/${id}`,
    DELETE: (id: string) => `${API_BASE}/guide/sites/${id}`,
    UPLOAD_IMAGES: (id: string) => `${API_BASE}/guide/sites/${id}/images`,
    DELETE_IMAGE: (siteId: string, imageId: string) =>
      `${API_BASE}/guide/sites/${siteId}/images/${imageId}`,
    UPDATE_STATUS: (id: string) => `${API_BASE}/guide/sites/${id}/status`,
  },

  // Schedule - Calendar and appointments
  SCHEDULE: {
    LIST: `${API_BASE}/guide/schedule`,
    CREATE: `${API_BASE}/guide/schedule`,
    DETAIL: (id: string) => `${API_BASE}/guide/schedule/${id}`,
    UPDATE: (id: string) => `${API_BASE}/guide/schedule/${id}`,
    DELETE: (id: string) => `${API_BASE}/guide/schedule/${id}`,
    AVAILABILITY: `${API_BASE}/guide/schedule/availability`,
    SET_AVAILABILITY: `${API_BASE}/guide/schedule/availability`,
  },

  // Interactions - Communication with pilgrims
  INTERACTIONS: {
    LIST: `${API_BASE}/guide/interactions`,
    MESSAGES: `${API_BASE}/guide/interactions/messages`,
    MESSAGE_DETAIL: (id: string) =>
      `${API_BASE}/guide/interactions/messages/${id}`,
    SEND_MESSAGE: `${API_BASE}/guide/interactions/messages`,
    BOOKINGS: `${API_BASE}/guide/interactions/bookings`,
    BOOKING_DETAIL: (id: string) =>
      `${API_BASE}/guide/interactions/bookings/${id}`,
    CONFIRM_BOOKING: (id: string) =>
      `${API_BASE}/guide/interactions/bookings/${id}/confirm`,
    CANCEL_BOOKING: (id: string) =>
      `${API_BASE}/guide/interactions/bookings/${id}/cancel`,
    REVIEWS: `${API_BASE}/guide/interactions/reviews`,
    RESPOND_REVIEW: (id: string) =>
      `${API_BASE}/guide/interactions/reviews/${id}/respond`,
  },

  // News - Manage site news/updates
  NEWS: {
    LIST: `${API_BASE}/guide/news`,
    CREATE: `${API_BASE}/guide/news`,
    DETAIL: (id: string) => `${API_BASE}/guide/news/${id}`,
    UPDATE: (id: string) => `${API_BASE}/guide/news/${id}`,
    DELETE: (id: string) => `${API_BASE}/guide/news/${id}`,
  },

  // AI Tools - Content generation
  AI_TOOLS: {
    GENERATE_DESCRIPTION: `${API_BASE}/guide/ai/generate-description`,
    IMPROVE_CONTENT: `${API_BASE}/guide/ai/improve-content`,
    TRANSLATE: `${API_BASE}/guide/ai/translate`,
    SUGGEST_TAGS: `${API_BASE}/guide/ai/suggest-tags`,
  },

  // Support
  SUPPORT: {
    TICKETS: `${API_BASE}/guide/support/tickets`,
    CREATE_TICKET: `${API_BASE}/guide/support/tickets`,
    TICKET_DETAIL: (id: string) => `${API_BASE}/guide/support/tickets/${id}`,
    ADD_MESSAGE: (id: string) =>
      `${API_BASE}/guide/support/tickets/${id}/messages`,
    FAQ: `${API_BASE}/guide/support/faq`,
  },
} as const;

/**
 * Shared endpoints
 * Used by both roles
 */
export const SHARED_ENDPOINTS = {
  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE}/notifications`,
    MARK_READ: (id: string) => `${API_BASE}/notifications/${id}/read`,
    MARK_ALL_READ: `${API_BASE}/notifications/read-all`,
    DELETE: (id: string) => `${API_BASE}/notifications/${id}`,
    DELETE_ALL: `${API_BASE}/notifications`,
    SETTINGS: `${API_BASE}/notifications/settings`,
    UPDATE_SETTINGS: `${API_BASE}/notifications/settings`,
    REGISTER_TOKEN: `${API_BASE}/notifications/token`,
    REVOKE_TOKEN: `${API_BASE}/notifications/token`,
  },

  // Regions
  REGIONS: {
    LIST: `${API_BASE}/regions`,
    DETAIL: (id: string) => `${API_BASE}/regions/${id}`,
  },

  // Upload
  UPLOAD: {
    IMAGE: `${API_BASE}/upload/image`,
    IMAGES: `${API_BASE}/upload/images`,
  },
} as const;

/**
 * All endpoints combined for backward compatibility
 */
export const ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USER: USER_ENDPOINTS,
  PILGRIM: PILGRIM_ENDPOINTS,
  GUIDE: GUIDE_ENDPOINTS,
  SHARED: SHARED_ENDPOINTS,
} as const;

export default ENDPOINTS;
