/**
 * ResponsiveText Component
 * 
 * A Text component that automatically scales font size based on screen dimensions.
 * Supports all standard Text props plus responsive-specific props.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ResponsiveText size={16}>Hello World</ResponsiveText>
 * 
 * // With variant
 * <ResponsiveText variant="h1">Heading</ResponsiveText>
 * 
 * // With responsive sizes
 * <ResponsiveText 
 *   size={{ small: 14, medium: 16, large: 18, tablet: 22, default: 16 }}
 * >
 *   Responsive Text
 * </ResponsiveText>
 * ```
 */

import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { useResponsive, ResponsiveValues } from '../../hooks/useResponsive';

// Text variants with predefined sizes
export type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'body' 
  | 'bodySmall' 
  | 'caption' 
  | 'label' 
  | 'button';

// Variant configurations
const VARIANT_CONFIG: Record<TextVariant, { size: number; weight: TextStyle['fontWeight']; lineHeightRatio: number }> = {
  h1: { size: 32, weight: '800', lineHeightRatio: 1.2 },
  h2: { size: 28, weight: '700', lineHeightRatio: 1.25 },
  h3: { size: 24, weight: '700', lineHeightRatio: 1.3 },
  h4: { size: 20, weight: '600', lineHeightRatio: 1.35 },
  h5: { size: 18, weight: '600', lineHeightRatio: 1.4 },
  body: { size: 16, weight: '400', lineHeightRatio: 1.5 },
  bodySmall: { size: 14, weight: '400', lineHeightRatio: 1.5 },
  caption: { size: 12, weight: '400', lineHeightRatio: 1.4 },
  label: { size: 10, weight: '600', lineHeightRatio: 1.3 },
  button: { size: 16, weight: '600', lineHeightRatio: 1.2 },
};

interface ResponsiveTextProps extends Omit<TextProps, 'style'> {
  /** Font size - number or responsive object */
  size?: number | ResponsiveValues<number>;
  /** Text variant preset */
  variant?: TextVariant;
  /** Font weight override */
  weight?: TextStyle['fontWeight'];
  /** Text color */
  color?: string;
  /** Text alignment */
  align?: TextStyle['textAlign'];
  /** Line height override */
  lineHeight?: number;
  /** Letter spacing */
  letterSpacing?: number;
  /** Additional styles */
  style?: TextStyle | TextStyle[];
  /** Children */
  children: React.ReactNode;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  size,
  variant,
  weight,
  color,
  align,
  lineHeight,
  letterSpacing,
  style,
  children,
  ...textProps
}) => {
  const { fontSize, responsive } = useResponsive();

  // Calculate font size
  let calculatedSize: number;
  
  if (variant) {
    calculatedSize = fontSize(VARIANT_CONFIG[variant].size);
  } else if (typeof size === 'object') {
    calculatedSize = fontSize(responsive(size));
  } else {
    calculatedSize = fontSize(size ?? 16);
  }

  // Get variant config if using variant
  const variantConfig = variant ? VARIANT_CONFIG[variant] : null;

  // Build text style
  const textStyle: TextStyle = {
    fontSize: calculatedSize,
    fontWeight: weight ?? variantConfig?.weight ?? '400',
    lineHeight: lineHeight ?? calculatedSize * (variantConfig?.lineHeightRatio ?? 1.5),
    ...(color && { color }),
    ...(align && { textAlign: align }),
    ...(letterSpacing !== undefined && { letterSpacing }),
  };

  // Merge with custom styles
  const mergedStyle = StyleSheet.flatten([textStyle, style]);

  return (
    <Text style={mergedStyle} {...textProps}>
      {children}
    </Text>
  );
};

// Convenience components for common variants
export const H1: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="h1" {...props} />
);

export const H2: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="h2" {...props} />
);

export const H3: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="h3" {...props} />
);

export const H4: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="h4" {...props} />
);

export const H5: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="h5" {...props} />
);

export const BodyText: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="body" {...props} />
);

export const Caption: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="caption" {...props} />
);

export const Label: React.FC<Omit<ResponsiveTextProps, 'variant'>> = (props) => (
  <ResponsiveText variant="label" {...props} />
);

export default ResponsiveText;
