/**
 * useResponsive Hook
 * 
 * A comprehensive hook for responsive design that updates dynamically
 * when screen dimensions change (rotation, window resize, etc.)
 * 
 * @example
 * ```tsx
 * const { wp, hp, fontSize, spacing, screen, responsive } = useResponsive();
 * 
 * <View style={{ padding: spacing(16), width: wp(50) }}>
 *   <Text style={{ fontSize: fontSize(16) }}>Hello</Text>
 * </View>
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 12/13/14 as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Screen size type
export type ScreenSize = 'small' | 'medium' | 'large' | 'tablet';

// Responsive values type
export interface ResponsiveValues<T> {
  small?: T;
  medium?: T;
  large?: T;
  tablet?: T;
  default: T;
}

// Screen info type
export interface ScreenInfo {
  width: number;
  height: number;
  size: ScreenSize;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  pixelRatio: number;
}

/**
 * useResponsive Hook
 * Provides responsive utilities that update on dimension changes
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  // Calculate screen size category
  const screenSize = useMemo((): ScreenSize => {
    if (width < 375) return 'small';
    if (width < 414) return 'medium';
    if (width < 768) return 'large';
    return 'tablet';
  }, [width]);

  // Screen info object
  const screen = useMemo((): ScreenInfo => ({
    width,
    height,
    size: screenSize,
    isSmall: screenSize === 'small',
    isMedium: screenSize === 'medium',
    isLarge: screenSize === 'large',
    isTablet: screenSize === 'tablet',
    isPortrait: height > width,
    isLandscape: width > height,
    pixelRatio: PixelRatio.get(),
  }), [width, height, screenSize]);

  // Width percentage
  const wp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((width * percentage) / 100);
  }, [width]);

  // Height percentage
  const hp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((height * percentage) / 100);
  }, [height]);

  // Scale based on width
  const scale = useCallback((size: number): number => {
    const scaleRatio = width / BASE_WIDTH;
    return PixelRatio.roundToNearestPixel(size * scaleRatio);
  }, [width]);

  // Moderate scale - less aggressive
  const moderateScale = useCallback((size: number, factor: number = 0.5): number => {
    const scaleRatio = width / BASE_WIDTH;
    return PixelRatio.roundToNearestPixel(size + (scaleRatio - 1) * size * factor);
  }, [width]);

  // Vertical scale
  const verticalScale = useCallback((size: number): number => {
    const scaleRatio = height / BASE_HEIGHT;
    return PixelRatio.roundToNearestPixel(size * scaleRatio);
  }, [height]);

  // Font size (moderate scale with 0.3 factor)
  const fontSize = useCallback((size: number): number => {
    return moderateScale(size, 0.3);
  }, [moderateScale]);

  // Spacing (moderate scale with 0.4 factor)
  const spacing = useCallback((size: number): number => {
    return moderateScale(size, 0.4);
  }, [moderateScale]);

  // Icon size (moderate scale with 0.3 factor)
  const iconSize = useCallback((size: number): number => {
    return moderateScale(size, 0.3);
  }, [moderateScale]);

  // Border radius (moderate scale with 0.2 factor)
  const borderRadius = useCallback((size: number): number => {
    return moderateScale(size, 0.2);
  }, [moderateScale]);

  // Get card width for grid layout
  const getCardWidth = useCallback((columns: number = 2, gap: number = 16): number => {
    const totalGap = gap * (columns + 1);
    return (width - totalGap) / columns;
  }, [width]);

  // Responsive value selector
  const responsive = useCallback(<T,>(values: ResponsiveValues<T>): T => {
    return values[screenSize] ?? values.default;
  }, [screenSize]);

  // Create responsive style object
  const createResponsiveStyle = useCallback(<T extends Record<string, any>>(
    styleCreator: (utils: {
      wp: typeof wp;
      hp: typeof hp;
      fontSize: typeof fontSize;
      spacing: typeof spacing;
      iconSize: typeof iconSize;
      scale: typeof scale;
      screen: ScreenInfo;
      responsive: typeof responsive;
    }) => T
  ): T => {
    return styleCreator({
      wp,
      hp,
      fontSize,
      spacing,
      iconSize,
      scale,
      screen,
      responsive,
    });
  }, [wp, hp, fontSize, spacing, iconSize, scale, screen, responsive]);

  return {
    // Screen info
    screen,
    screenSize,
    
    // Scaling functions
    wp,
    hp,
    scale,
    moderateScale,
    verticalScale,
    
    // Semantic scaling
    fontSize,
    spacing,
    iconSize,
    borderRadius,
    
    // Layout helpers
    getCardWidth,
    
    // Responsive selector
    responsive,
    
    // Style creator
    createResponsiveStyle,
  };
};

export default useResponsive;
