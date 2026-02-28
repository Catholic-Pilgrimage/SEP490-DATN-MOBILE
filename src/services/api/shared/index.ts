/**
 * Shared API Index
 * Central export for shared API services
 *
 * Usage:
 * import { authApi, userApi, notificationApi } from '@/services/api/shared';
 */

// Auth API
export { default as authApi } from "./authApi";

// User API
export { default as userApi } from "./userApi";

// Notification API
export { default as notificationApi } from "./notificationApi";

// Post API
export { default as postApi } from "./postApi";

// Combined Shared API
import authApi from "./authApi";
import notificationApi from "./notificationApi";
import userApi from "./userApi";

import postApi from "./postApi";

const sharedApis = {
  auth: authApi,
  user: userApi,
  notification: notificationApi,
  post: postApi,
};

export default sharedApis;
