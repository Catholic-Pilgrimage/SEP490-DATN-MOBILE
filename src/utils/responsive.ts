import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 12/13/14 as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Screen size categories
 */
export const getScreenSize = () => {
  if (SCREEN_WIDTH < 375) return 'small'; // iPhone SE, small phones
  if (SCREEN_WIDTH < 414) return 'medium'; // iPhone 12/13/14
  if (SCREEN_WIDTH < 768) return 'large'; // iPhone Pro Max, large phones
  return 'tablet'; // iPad and tablets
};

/**
 * Responsive width based on screen size
 */
export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

/**
 * Responsive height based on screen size
 */
export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

/**
 * Scale size based on screen width
 */
export const scale = (size: number): number => {
  const scaleRatio = SCREEN_WIDTH / BASE_WIDTH;
  return PixelRatio.roundToNearestPixel(size * scaleRatio);
};

/**
 * Moderate scale - less aggressive scaling
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleRatio = SCREEN_WIDTH / BASE_WIDTH;
  return PixelRatio.roundToNearestPixel(size + (scaleRatio - 1) * size * factor);
};

/**
 * Vertical scale based on screen height
 */
export const verticalScale = (size: number): number => {
  const scaleRatio = SCREEN_HEIGHT / BASE_HEIGHT;
  return PixelRatio.roundToNearestPixel(size * scaleRatio);
};

/**
 * Get responsive font size
 */
export const getFontSize = (size: number): number => {
  return moderateScale(size, 0.3);
};

/**
 * Get responsive spacing
 */
export const getSpacing = (size: number): number => {
  return moderateScale(size, 0.4);
};

/**
 * Check if screen is small
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if screen is tablet
 */
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Get card width for grid layout
 */
export const getCardWidth = (columns: number = 2, spacing: number = 16): number => {
  const totalSpacing = spacing * (columns + 1);
  return (SCREEN_WIDTH - totalSpacing) / columns;
};

/**
 * Get responsive values based on screen size
 */
export const responsive = <T,>(values: {
  small?: T;
  medium?: T;
  large?: T;
  tablet?: T;
  default: T;
}): T => {
  const screenSize = getScreenSize();
  return values[screenSize] || values.default;
};

/**
 * Screen dimensions
 */
export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen(),
  isTablet: isTablet(),
  size: getScreenSize(),
};

export default {
  wp,
  hp,
  scale,
  moderateScale,
  verticalScale,
  getFontSize,
  getSpacing,
  getCardWidth,
  responsive,
  isSmallScreen,
  isTablet,
  SCREEN,
};
