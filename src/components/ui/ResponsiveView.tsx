/**
 * ResponsiveView Component
 * 
 * A View component with built-in responsive padding, margin, and dimensions.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ResponsiveView padding={16} margin={8}>
 *   <Text>Content</Text>
 * </ResponsiveView>
 * 
 * // With responsive padding
 * <ResponsiveView 
 *   padding={{ small: 12, medium: 16, large: 20, tablet: 24, default: 16 }}
 * >
 *   <Text>Responsive Padding</Text>
 * </ResponsiveView>
 * 
 * // Card-like container
 * <ResponsiveView card padding={16} borderRadius={12}>
 *   <Text>Card Content</Text>
 * </ResponsiveView>
 * ```
 */

import React from 'react';
import { View, ViewProps, ViewStyle, StyleSheet, Platform, DimensionValue } from 'react-native';
import { useResponsive, ResponsiveValues } from '../../hooks/useResponsive';

type SpacingValue = number | ResponsiveValues<number>;

interface ResponsiveViewProps extends Omit<ViewProps, 'style'> {
  // Padding
  padding?: SpacingValue;
  paddingHorizontal?: SpacingValue;
  paddingVertical?: SpacingValue;
  paddingTop?: SpacingValue;
  paddingBottom?: SpacingValue;
  paddingLeft?: SpacingValue;
  paddingRight?: SpacingValue;
  
  // Margin
  margin?: SpacingValue;
  marginHorizontal?: SpacingValue;
  marginVertical?: SpacingValue;
  marginTop?: SpacingValue;
  marginBottom?: SpacingValue;
  marginLeft?: SpacingValue;
  marginRight?: SpacingValue;
  
  // Dimensions
  width?: SpacingValue | string;
  height?: SpacingValue | string;
  minWidth?: SpacingValue;
  minHeight?: SpacingValue;
  maxWidth?: SpacingValue;
  maxHeight?: SpacingValue;
  
  // Border radius
  borderRadius?: SpacingValue;
  
  // Gap (for flex containers)
  gap?: SpacingValue;
  rowGap?: SpacingValue;
  columnGap?: SpacingValue;
  
  // Flex shortcuts
  flex?: number;
  row?: boolean;
  center?: boolean;
  centerX?: boolean;
  centerY?: boolean;
  wrap?: boolean;
  spaceBetween?: boolean;
  spaceAround?: boolean;
  spaceEvenly?: boolean;
  
  // Card preset
  card?: boolean;
  cardColor?: string;
  
  // Background
  backgroundColor?: string;
  
  // Additional styles
  style?: ViewStyle | ViewStyle[];
  
  // Children
  children?: React.ReactNode;
}

export const ResponsiveView: React.FC<ResponsiveViewProps> = ({
  // Padding
  padding,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  
  // Margin
  margin,
  marginHorizontal,
  marginVertical,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  
  // Dimensions
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  
  // Border radius
  borderRadius,
  
  // Gap
  gap,
  rowGap,
  columnGap,
  
  // Flex
  flex,
  row,
  center,
  centerX,
  centerY,
  wrap,
  spaceBetween,
  spaceAround,
  spaceEvenly,
  
  // Card
  card,
  cardColor = '#FFFFFF',
  
  // Background
  backgroundColor,
  
  // Style
  style,
  
  // Children
  children,
  
  ...viewProps
}) => {
  const { spacing, borderRadius: br, responsive } = useResponsive();

  // Helper to resolve spacing value
  const resolveSpacing = (value: SpacingValue | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'object') {
      return spacing(responsive(value));
    }
    return spacing(value);
  };

  // Helper to resolve dimension value
  const resolveDimension = (value: SpacingValue | string | undefined): DimensionValue | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value as DimensionValue;
    if (typeof value === 'object') {
      return spacing(responsive(value));
    }
    return spacing(value);
  };

  // Build view style
  const viewStyle: ViewStyle = {
    // Padding
    ...(padding !== undefined && { padding: resolveSpacing(padding) }),
    ...(paddingHorizontal !== undefined && { paddingHorizontal: resolveSpacing(paddingHorizontal) }),
    ...(paddingVertical !== undefined && { paddingVertical: resolveSpacing(paddingVertical) }),
    ...(paddingTop !== undefined && { paddingTop: resolveSpacing(paddingTop) }),
    ...(paddingBottom !== undefined && { paddingBottom: resolveSpacing(paddingBottom) }),
    ...(paddingLeft !== undefined && { paddingLeft: resolveSpacing(paddingLeft) }),
    ...(paddingRight !== undefined && { paddingRight: resolveSpacing(paddingRight) }),
    
    // Margin
    ...(margin !== undefined && { margin: resolveSpacing(margin) }),
    ...(marginHorizontal !== undefined && { marginHorizontal: resolveSpacing(marginHorizontal) }),
    ...(marginVertical !== undefined && { marginVertical: resolveSpacing(marginVertical) }),
    ...(marginTop !== undefined && { marginTop: resolveSpacing(marginTop) }),
    ...(marginBottom !== undefined && { marginBottom: resolveSpacing(marginBottom) }),
    ...(marginLeft !== undefined && { marginLeft: resolveSpacing(marginLeft) }),
    ...(marginRight !== undefined && { marginRight: resolveSpacing(marginRight) }),
    
    // Dimensions
    ...(width !== undefined && { width: resolveDimension(width) }),
    ...(height !== undefined && { height: resolveDimension(height) }),
    ...(minWidth !== undefined && { minWidth: resolveSpacing(minWidth) }),
    ...(minHeight !== undefined && { minHeight: resolveSpacing(minHeight) }),
    ...(maxWidth !== undefined && { maxWidth: resolveSpacing(maxWidth) }),
    ...(maxHeight !== undefined && { maxHeight: resolveSpacing(maxHeight) }),
    
    // Border radius
    ...(borderRadius !== undefined && { borderRadius: br(typeof borderRadius === 'object' ? responsive(borderRadius) : borderRadius) }),
    
    // Gap
    ...(gap !== undefined && { gap: resolveSpacing(gap) }),
    ...(rowGap !== undefined && { rowGap: resolveSpacing(rowGap) }),
    ...(columnGap !== undefined && { columnGap: resolveSpacing(columnGap) }),
    
    // Flex
    ...(flex !== undefined && { flex }),
    ...(row && { flexDirection: 'row' as const }),
    ...(center && { justifyContent: 'center' as const, alignItems: 'center' as const }),
    ...(centerX && { alignItems: 'center' as const }),
    ...(centerY && { justifyContent: 'center' as const }),
    ...(wrap && { flexWrap: 'wrap' as const }),
    ...(spaceBetween && { justifyContent: 'space-between' as const }),
    ...(spaceAround && { justifyContent: 'space-around' as const }),
    ...(spaceEvenly && { justifyContent: 'space-evenly' as const }),
    
    // Background
    ...(backgroundColor && { backgroundColor }),
  };

  // Card styles
  const cardStyles: ViewStyle = card ? {
    backgroundColor: cardColor,
    borderRadius: br(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  } : {};

  // Merge styles
  const mergedStyle = StyleSheet.flatten([cardStyles, viewStyle, style]);

  return (
    <View style={mergedStyle} {...viewProps}>
      {children}
    </View>
  );
};

// Convenience components
export const Row: React.FC<Omit<ResponsiveViewProps, 'row'>> = (props) => (
  <ResponsiveView row {...props} />
);

export const Column: React.FC<ResponsiveViewProps> = (props) => (
  <ResponsiveView {...props} />
);

export const Center: React.FC<Omit<ResponsiveViewProps, 'center'>> = (props) => (
  <ResponsiveView center {...props} />
);

export const Card: React.FC<Omit<ResponsiveViewProps, 'card'>> = (props) => (
  <ResponsiveView card padding={16} {...props} />
);

export const Spacer: React.FC<{ size?: SpacingValue; flex?: number }> = ({ size, flex }) => {
  const { spacing, responsive } = useResponsive();
  
  if (flex) {
    return <View style={{ flex }} />;
  }
  
  const resolvedSize = size 
    ? typeof size === 'object' 
      ? spacing(responsive(size)) 
      : spacing(size)
    : spacing(8);
    
  return <View style={{ width: resolvedSize, height: resolvedSize }} />;
};

export default ResponsiveView;
