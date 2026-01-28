// API configuration

export const API_CONFIG = {
  // Base URL for the API
  // Render free tier has cold start - first request may take 30-60 seconds
  BASE_URL: 'https://sep490-datn-backend.onrender.com',
  
  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH_TOKEN: '/api/auth/refresh-token',
      PROFILE: '/api/auth/profile',
      CHANGE_PASSWORD: '/api/auth/change-password',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
    },
  },

  // Request timeout in milliseconds (60s for Render cold start)
  TIMEOUT: 60000,

  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },

  // Headers
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
  },
};

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Server có thể đang khởi động, vui lòng thử lại sau 30 giây.',
  TIMEOUT_ERROR: 'Yêu cầu đã hết thời gian. Server có thể đang bận, vui lòng thử lại.',
  SERVER_ERROR: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đã bị khóa.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định.',
};
