/**
 * Sacred Theme Constants
 * Premium, Spiritual color palette for pilgrimage app
 * 
 * Design Philosophy:
 * - Monochrome/Analogous colors (Gold, Cream, Earth tones)
 * - No neon/vibrant colors
 * - Cathedral-inspired aesthetics
 */

export const SACRED_COLORS = {
  // ===== PRIMARY GOLD FAMILY =====
  gold: '#C9A572',           // Primary accent - Elegant warm gold
  goldDark: '#A88A5E',       // Darker gold for pressed states
  goldLight: '#DFC09A',      // Light gold for highlights
  goldShimmer: '#E8D5B0',    // For shimmer effects
  goldMuted: '#B8A070',      // Muted gold for secondary elements
  
  // ===== EARTH TONES (Analogous) =====
  bronze: '#8B7355',         // Bronze/incense - Holy color
  bronzeLight: '#A8917A',
  sienna: '#A0522D',         // Earthy sienna
  terracotta: '#CC5500',     // Warm terracotta (subtle)
  walnut: '#5D4037',         // Deep walnut brown
  
  // ===== CREAM/IVORY FAMILY =====
  cream: '#FDF8F0',          // Primary background
  creamDark: '#F5EFE3',      // Slightly darker cream
  ivory: '#FFFEF9',          // Pure ivory
  parchment: '#FAF7F2',      // Vintage paper feel
  linen: '#FCF9F5',          // Soft linen white
  alabaster: '#EDEAE3',      // Alabaster stone color
  
  // ===== DARK/CHARCOAL FAMILY =====
  charcoal: '#1A1A1A',       // Primary dark text
  charcoalLight: '#2D2D2D',  // Lighter charcoal
  slate: '#4A4A4A',          // Medium dark
  graphite: '#6B6B6B',       // Subtle text
  
  // ===== SACRED ACCENT COLORS (Muted) =====
  wine: '#722F37',           // Deep wine red (cathedral)
  wineLight: 'rgba(114, 47, 55, 0.08)',
  burgundy: '#800020',       // Burgundy accent
  navy: '#1A2845',           // Deep navy (spirituality)
  navyLight: '#2C3E58',
  violet: '#5B4E8C',         // Mary's violet (muted)
  violetLight: 'rgba(91, 78, 140, 0.08)',
  
  // ===== FUNCTIONAL COLORS (Muted versions) =====
  success: '#4A7C59',        // Muted forest green
  successLight: 'rgba(74, 124, 89, 0.1)',
  successBg: '#E8F0EB',
  
  danger: '#8B3A3A',         // Muted crimson
  dangerLight: 'rgba(139, 58, 58, 0.1)',
  dangerBg: '#F5EBEB',
  
  warning: '#A67C52',        // Muted amber/bronze
  warningLight: 'rgba(166, 124, 82, 0.1)',
  warningBg: '#F5F0E8',
  
  info: '#4A6B8A',           // Muted steel blue
  infoLight: 'rgba(74, 107, 138, 0.1)',
  infoBg: '#EBF0F5',
  
  // ===== LIVE/REALTIME INDICATOR =====
  live: '#6B8E6B',           // Muted sage green for live
  liveGlow: 'rgba(107, 142, 107, 0.3)',
  
  // ===== OVERLAY & GLASS EFFECTS =====
  overlay: 'rgba(26, 26, 26, 0.4)',
  overlayLight: 'rgba(26, 26, 26, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  glassWhite: 'rgba(255, 255, 255, 0.85)',
  glassCream: 'rgba(253, 248, 240, 0.9)',
  glassGold: 'rgba(201, 165, 114, 0.08)',
  
  // ===== BORDER COLORS =====
  border: '#E5E1D8',
  borderLight: '#F0EDE5',
  borderGold: 'rgba(201, 165, 114, 0.3)',
  
  // ===== GRADIENT PRESETS =====
  gradients: {
    goldVertical: ['#C9A572', '#A88A5E'],
    goldHorizontal: ['#DFC09A', '#C9A572'],
    cream: ['#FFFEF9', '#FDF8F0'],
    warmOverlay: ['rgba(201, 165, 114, 0.1)', 'rgba(201, 165, 114, 0)'],
    darkOverlay: ['transparent', 'rgba(26, 26, 26, 0.7)'],
    heroDarken: ['transparent', 'rgba(26, 26, 26, 0.5)', 'rgba(26, 26, 26, 0.8)'],
    sacredLight: ['rgba(255, 254, 249, 0)', 'rgba(255, 254, 249, 0.8)'],
  },
};

export const SACRED_TYPOGRAPHY = {
  // Font families (will use system fonts with specific weights)
  fontFamily: {
    display: 'System',      // For large headings
    heading: 'System',      // For section titles
    body: 'System',         // For body text
    caption: 'System',      // For small text
  },
  
  // Sacred-optimized font sizes
  fontSize: {
    micro: 9,
    tiny: 10,
    caption: 11,
    small: 12,
    body: 14,
    subtitle: 15,
    title: 16,
    heading: 18,
    subheading: 20,
    display: 24,
    hero: 32,
    giant: 40,
  },
  
  // Letter spacing for sacred feel
  letterSpacing: {
    compressed: -0.5,
    tight: -0.25,
    normal: 0,
    relaxed: 0.5,
    wide: 1.0,        // For section labels
    heading: 1.5,     // For uppercase headings
    sacred: 2.0,      // For CATEGORY labels
    expansive: 3.0,   // For special emphasis
  },
  
  // Line heights
  lineHeight: {
    tight: 1.15,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

export const SACRED_SHADOWS = {
  subtle: {
    shadowColor: SACRED_COLORS.charcoal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  soft: {
    shadowColor: SACRED_COLORS.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: SACRED_COLORS.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: SACRED_COLORS.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  floating: {
    shadowColor: SACRED_COLORS.charcoal,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  // Gold glow for premium elements
  goldGlow: {
    shadowColor: SACRED_COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  // Inner glow effect simulation
  innerGlow: {
    shadowColor: SACRED_COLORS.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
  },
};

export const SACRED_SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

export const SACRED_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const SACRED_ANIMATION = {
  // Timing configurations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    relaxed: 800,
    gentle: 1000,
    breathing: 2000,
  },
  // Spring configs for React Native Animated
  spring: {
    gentle: { tension: 40, friction: 7 },
    bouncy: { tension: 100, friction: 5 },
    stiff: { tension: 200, friction: 15 },
    wobbly: { tension: 50, friction: 4 },
  },
  // Shimmer loop interval
  shimmerInterval: 5000, // 5 seconds between shimmer loops
  // Pulse animation for live indicators
  pulseScale: { min: 1, max: 1.4 },
  pulseDuration: 800,
};

export default {
  SACRED_COLORS,
  SACRED_TYPOGRAPHY,
  SACRED_SHADOWS,
  SACRED_SPACING,
  SACRED_RADIUS,
  SACRED_ANIMATION,
};
