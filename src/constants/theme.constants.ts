// Sacred Journey - Pilgrim App Design System (Enhanced)
export const COLORS = {
  // Primary Colors - Deep Navy (Elegance, Trust, Spirituality)
  primary: '#1A2845', // Rich navy blue
  primaryLight: '#2C3E58',
  primaryDark: '#0F1828',
  primaryGradientStart: '#1A2845',
  primaryGradientEnd: '#2C3E58',
  
  // Accent Colors - Warm Gold (Divine Light, Sacred)
  accent: '#C9A572', // Elegant warm gold
  accentLight: '#DFC09A',
  accentDark: '#A88A5E',
  accentChampagne: '#F8F3ED',
  accentMetallic: '#C9A572',
  accentSubtle: '#FCF9F5', // Soft parchment
  
  // Spiritual Colors
  holy: '#8B7355', // Bronze/incense
  divine: '#DBC4A2', // Light gold
  sacred: '#6A5ACD', // Violet (Mary's color)
  sacredLight: '#E6E3FF',
  
  // Alert Colors - Refined
  danger: '#DC4C4C', // Softer red
  dangerLight: '#FFF5F5',
  warning: '#E67E22',
  warningLight: '#FFF8F0',
  success: '#52C41A',
  successLight: '#F6FFED',
  info: '#1890FF',
  infoLight: '#E6F7FF',
  
  // Neutral Colors - Pure & Sacred
  white: '#FFFFFF',
  black: '#000000',
  background: '#FAFBFC', // Soft white background
  backgroundDark: '#F5F7FA',
  backgroundSoft: '#FCFDFE',
  backgroundCard: '#FFFFFF', // Pure white cards
  parchment: '#FAF7F2', // Vintage paper
  
  // Text Colors - Clear Hierarchy
  textPrimary: '#1A2845', // Match primary for consistency
  textSecondary: '#6B7A8F', // Softer slate
  textTertiary: '#9AA5B1',
  textLight: '#C5CDD5',
  textWhite: '#FFFFFF',
  textAccent: '#C9A572',
  textHoly: '#8B7355', // Bronze spiritual
  
  // Border & Divider - Ultra Subtle
  border: '#F0EDE5',
  borderLight: '#F7F5F0',
  borderMedium: '#E5E1D8',
  divider: '#EEEBE3',
  
  // Surface Elevations (for depth)
  surface0: '#FDFBF7', // Base
  surface1: '#FFFEF9', // Slightly elevated
  surface2: '#FFFFFF', // More elevated
  
  // Overlay - Refined
  overlay: 'rgba(26, 42, 70, 0.4)',
  overlayLight: 'rgba(26, 42, 70, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  overlayGold: 'rgba(201, 169, 97, 0.08)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 25,
  full: 9999,
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    // For iOS - San Francisco Pro
    // For Android - Google Sans / Roboto
    display: 'System', // For headings
    body: 'System', // For body text
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    huge: 32,
    display: 40, // For hero titles
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#1A2845',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  small: {
    shadowColor: '#1A2845',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1A2845',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  large: {
    shadowColor: '#1A2845',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
};

export const SIZES = {
  headerHeight: 180,
  tabBarHeight: 60,
  searchBarHeight: 50,
  filterChipHeight: 36,
  cardImageHeight: 150,
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  SIZES,
};
