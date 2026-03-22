// Local Guide app constants
// Color scheme and design tokens for the Guide app - Sacred Journey Theme

export const GUIDE_COLORS = {
  // Primary colors - Warm Gold (Divine Light)
  primary: "#ECB613",
  primaryDark: "#C99D0F",
  primaryLight: "#F5D45A",
  primaryMuted: "rgba(236, 182, 19, 0.1)",
  primaryBorder: "rgba(236, 182, 19, 0.2)",
  primaryBorderLight: "rgba(236, 182, 19, 0.1)",

  // Background colors - Light Parchment theme
  background: "#F8F8F6",
  /** Nền kem — transition mềm từ ảnh / form đồng bộ (media detail, tạo sự kiện/media) */
  creamBg: "#F5EDE3",
  /** Panel kem chồng lên hero ảnh */
  creamPanel: "#FDF8F0",
  /** Chữ chính trên nền kem */
  creamInk: "#3D2E26",
  /** Nhãn phụ (vd. «Chú thích») */
  creamLabel: "#8B7355",
  /** Gợi ý / meta nhạt trên kem */
  creamMuted: "#A09078",
  /** Thanh kéo bottom sheet */
  creamHandle: "#C4A882",
  /** Viền / tách lớp trên kem */
  creamBorder: "rgba(61, 46, 38, 0.1)",
  /** Ô input / thẻ nổi trên kem */
  creamElevated: "#FFFCF7",
  backgroundDark: "#221D10",
  backgroundSecondary: "rgba(255, 255, 255, 0.6)",
  backgroundTertiary: "#FFFFFF",

  // Surface colors
  surface: "#FFFFFF",
  surfaceElevated: "rgba(255, 255, 255, 0.6)",
  surfaceDark: "rgba(255, 255, 255, 0.05)",

  // Text colors
  textPrimary: "#2D2A26",
  textSecondary: "#897F61",
  textMuted: "#897F61",
  textOnPrimary: "#FFFFFF",
  textDark: "#2D2A26",
  textLight: "#FFFFFF",

  // Status colors
  success: "#22C55E",
  successLight: "#DCFCE7",
  successDark: "#16A34A",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#DBEAFE",

  // SOS specific - High visibility red
  sos: "#DC2626",
  sosLight: "#FEF2F2",
  sosBorder: "#FCA5A5",
  sosBg: "rgba(220, 38, 38, 0.1)",

  // Border colors
  border: "rgba(236, 182, 19, 0.2)",
  borderLight: "rgba(236, 182, 19, 0.1)",
  borderFocus: "#ECB613",
  divider: "rgba(236, 182, 19, 0.2)",

  // Shadow
  shadowColor: "#000000",

  // Status indicators
  online: "#22C55E",
  offline: "#9CA3AF",
  busy: "#F59E0B",

  // Shift status
  shiftActive: "#22C55E",
  shiftInactive: "#9CA3AF",
  shiftUpcoming: "#3B82F6",

  // Gray scale
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray800: "#1F2937",
};

export const GUIDE_TYPOGRAPHY = {
  // Font family
  fontFamily: "System",
  fontFamilySerif: "System", // For display text - can be customized

  // Font weights
  fontWeightLight: "300" as const,
  fontWeightRegular: "400" as const,
  fontWeightMedium: "500" as const,
  fontWeightSemiBold: "600" as const,
  fontWeightBold: "700" as const,
  fontWeightExtraBold: "800" as const,

  // Font sizes
  fontSizeXS: 10,
  fontSizeSM: 12,
  fontSizeMD: 14,
  fontSizeLG: 16,
  fontSizeXL: 18,
  fontSizeXXL: 20,
  fontSizeHeading: 24,
  fontSizeDisplay: 28,
  fontSizeHero: 32,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.4,
  lineHeightRelaxed: 1.6,
};

export const GUIDE_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const GUIDE_BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const GUIDE_SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Bottom navigation config
export const GUIDE_NAV_ITEMS = [
  {
    name: "Dashboard",
    label: "Home",
    icon: "home",
    iconFilled: "home",
  },
  {
    name: "MySite",
    label: "My Site",
    icon: "church",
    iconFilled: "church",
  },
  {
    name: "Schedule",
    label: "Schedule",
    icon: "calendar-today",
    iconFilled: "calendar-today",
  },
  {
    name: "Messages",
    label: "Messages",
    icon: "chat-bubble-outline",
    iconFilled: "chat-bubble",
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    iconFilled: "person",
  },
] as const;

// Quick action items
export const GUIDE_QUICK_ACTIONS = [
  {
    id: "create-event",
    label: "Tạo\nSự kiện",
    icon: "event",
    color: GUIDE_COLORS.primary,
    bgColor: GUIDE_COLORS.primaryMuted,
  },
  {
    id: "update-mass",
    label: "Cập nhật\nGiờ lễ",
    icon: "church",
    color: GUIDE_COLORS.primary,
    bgColor: GUIDE_COLORS.primaryMuted,
  },
  {
    id: "upload-media",
    label: "Tải lên\nHình ảnh",
    icon: "add-a-photo",
    color: GUIDE_COLORS.primary,
    bgColor: GUIDE_COLORS.primaryMuted,
  },
  {
    id: "report-sos",
    label: "Báo cáo\nSOS",
    icon: "notification-important",
    color: GUIDE_COLORS.sos,
    bgColor: GUIDE_COLORS.sosLight,
    variant: "danger",
  },
] as const;
