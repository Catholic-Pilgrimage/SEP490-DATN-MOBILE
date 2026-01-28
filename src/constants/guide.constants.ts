// Local Guide app constants
// Color scheme and design tokens for the Guide app (more minimalist than Pilgrim app)

export const GUIDE_COLORS = {
  // Primary colors - Gold/Bronze tones
  primary: '#C69C6D',
  primaryDark: '#A67C4E',
  primaryLight: '#D4B08C',
  
  // Background colors - More white for cleaner look
  background: '#FFFFFF',
  backgroundSecondary: '#FFF9F0',
  backgroundTertiary: '#F5F5F5',
  
  // Surface colors
  surface: '#FFFFFF',
  surfaceElevated: '#FEFEFE',
  
  // Text colors
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',
  
  // Status colors
  success: '#28A745',
  successLight: '#D4EDDA',
  warning: '#FFC107',
  warningLight: '#FFF3CD',
  error: '#DC3545',
  errorLight: '#F8D7DA',
  info: '#17A2B8',
  infoLight: '#D1ECF1',
  
  // SOS specific - High visibility
  sos: '#FF4444',
  sosLight: '#FFE5E5',
  sosBorder: '#FF0000',
  
  // Border colors
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  borderFocus: '#C69C6D',
  
  // Shadow
  shadowColor: '#000000',
  
  // Status indicators
  online: '#28A745',
  offline: '#999999',
  busy: '#FFC107',
  
  // Shift status
  shiftActive: '#28A745',
  shiftInactive: '#999999',
  shiftUpcoming: '#17A2B8',
};

export const GUIDE_TYPOGRAPHY = {
  // Font weights
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
  
  // Font sizes
  fontSizeXS: 11,
  fontSizeSM: 13,
  fontSizeMD: 15,
  fontSizeLG: 17,
  fontSizeXL: 20,
  fontSizeXXL: 24,
  fontSizeHeading: 28,
  fontSizeDisplay: 32,
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const GUIDE_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const GUIDE_BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const GUIDE_SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: GUIDE_COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Bottom navigation config
export const GUIDE_NAV_ITEMS = [
  {
    name: 'Dashboard',
    label: 'Tổng quan',
    icon: 'dashboard',
  },
  {
    name: 'MySite',
    label: 'Quản lý',
    icon: 'church',
  },
  {
    name: 'Support',
    label: 'Hỗ trợ',
    icon: 'headset-mic',
  },
  {
    name: 'Schedule',
    label: 'Ca trực',
    icon: 'calendar-today',
  },
] as const;
