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

// Report API
export { default as reportApi } from "./reportApi";

// Combined Shared API
import authApi from "./authApi";
import notificationApi from "./notificationApi";
import userApi from "./userApi";

import postApi from "./postApi";
import reportApi from "./reportApi";

const sharedApis = {
  auth: authApi,
  user: userApi,
  notification: notificationApi,
  post: postApi,
  report: reportApi,
};

export default sharedApis;
