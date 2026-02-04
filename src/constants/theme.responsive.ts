/**
 * Responsive Theme Constants
 * 
 * Provides responsive typography, spacing, and layout values
 * that automatically scale based on screen size.
 * 
 * @example
 * ```tsx
 * import { useResponsiveTheme } from '../constants/theme.responsive';
 * 
 * const MyComponent = () => {
 *   const theme = useResponsiveTheme();
 *   
 *   return (
 *     <View style={{ padding: theme.spacing.md }}>
 *       <Text style={{ fontSize: theme.typography.h1 }}>Title</Text>
 *     </View>
 *   );
 * };
 * ```
 */

import { useMemo } from 'react';
import { useResponsive } from '../hooks/useResponsive';

// Base spacing values (will be scaled)
const BASE_SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Base typography sizes (will be scaled)
const BASE_TYPOGRAPHY = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  label: 10,
  tiny: 8,
} as const;

// Base icon sizes (will be scaled)
const BASE_ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 48,
} as const;

// Base border radius (will be scaled)
const BASE_BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// Base button heights (will be scaled)
const BASE_BUTTON_HEIGHTS = {
  sm: 36,
  md: 44,
  lg: 52,
  xl: 60,
} as const;

// Base avatar sizes (will be scaled)
const BASE_AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  xxl: 96,
} as const;

// Base input heights (will be scaled)
const BASE_INPUT_HEIGHTS = {
  sm: 40,
  md: 48,
  lg: 56,
} as const;

/**
 * Hook that provides responsive theme values
 */
export const useResponsiveTheme = () => {
  const { spacing, fontSize, iconSize, borderRadius } = useResponsive();

  const theme = useMemo(() => ({
    // Scaled spacing values
    spacing: {
      xxs: spacing(BASE_SPACING.xxs),
      xs: spacing(BASE_SPACING.xs),
      sm: spacing(BASE_SPACING.sm),
      md: spacing(BASE_SPACING.md),
      lg: spacing(BASE_SPACING.lg),
      xl: spacing(BASE_SPACING.xl),
      xxl: spacing(BASE_SPACING.xxl),
      xxxl: spacing(BASE_SPACING.xxxl),
    },

    // Scaled typography sizes
    typography: {
      h1: fontSize(BASE_TYPOGRAPHY.h1),
      h2: fontSize(BASE_TYPOGRAPHY.h2),
      h3: fontSize(BASE_TYPOGRAPHY.h3),
      h4: fontSize(BASE_TYPOGRAPHY.h4),
      h5: fontSize(BASE_TYPOGRAPHY.h5),
      body: fontSize(BASE_TYPOGRAPHY.body),
      bodySmall: fontSize(BASE_TYPOGRAPHY.bodySmall),
      caption: fontSize(BASE_TYPOGRAPHY.caption),
      label: fontSize(BASE_TYPOGRAPHY.label),
      tiny: fontSize(BASE_TYPOGRAPHY.tiny),
    },

    // Scaled icon sizes
    iconSizes: {
      xs: iconSize(BASE_ICON_SIZES.xs),
      sm: iconSize(BASE_ICON_SIZES.sm),
      md: iconSize(BASE_ICON_SIZES.md),
      lg: iconSize(BASE_ICON_SIZES.lg),
      xl: iconSize(BASE_ICON_SIZES.xl),
      xxl: iconSize(BASE_ICON_SIZES.xxl),
      xxxl: iconSize(BASE_ICON_SIZES.xxxl),
    },

    // Scaled border radius
    borderRadius: {
      none: BASE_BORDER_RADIUS.none,
      xs: borderRadius(BASE_BORDER_RADIUS.xs),
      sm: borderRadius(BASE_BORDER_RADIUS.sm),
      md: borderRadius(BASE_BORDER_RADIUS.md),
      lg: borderRadius(BASE_BORDER_RADIUS.lg),
      xl: borderRadius(BASE_BORDER_RADIUS.xl),
      xxl: borderRadius(BASE_BORDER_RADIUS.xxl),
      full: BASE_BORDER_RADIUS.full,
    },

    // Scaled button heights
    buttonHeights: {
      sm: spacing(BASE_BUTTON_HEIGHTS.sm),
      md: spacing(BASE_BUTTON_HEIGHTS.md),
      lg: spacing(BASE_BUTTON_HEIGHTS.lg),
      xl: spacing(BASE_BUTTON_HEIGHTS.xl),
    },

    // Scaled avatar sizes
    avatarSizes: {
      xs: spacing(BASE_AVATAR_SIZES.xs),
      sm: spacing(BASE_AVATAR_SIZES.sm),
      md: spacing(BASE_AVATAR_SIZES.md),
      lg: spacing(BASE_AVATAR_SIZES.lg),
      xl: spacing(BASE_AVATAR_SIZES.xl),
      xxl: spacing(BASE_AVATAR_SIZES.xxl),
    },

    // Scaled input heights
    inputHeights: {
      sm: spacing(BASE_INPUT_HEIGHTS.sm),
      md: spacing(BASE_INPUT_HEIGHTS.md),
      lg: spacing(BASE_INPUT_HEIGHTS.lg),
    },
  }), [spacing, fontSize, iconSize, borderRadius]);

  return theme;
};

// Export base values for reference
export const BASE_THEME = {
  spacing: BASE_SPACING,
  typography: BASE_TYPOGRAPHY,
  iconSizes: BASE_ICON_SIZES,
  borderRadius: BASE_BORDER_RADIUS,
  buttonHeights: BASE_BUTTON_HEIGHTS,
  avatarSizes: BASE_AVATAR_SIZES,
  inputHeights: BASE_INPUT_HEIGHTS,
};

export default useResponsiveTheme;
