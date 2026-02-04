/**
 * ResponsiveImage Component
 * 
 * Image component with responsive dimensions and aspect ratio support.
 * 
 * @example
 * ```tsx
 * // Fixed responsive size
 * <ResponsiveImage source={{ uri: 'url' }} width={100} height={100} />
 * 
 * // Aspect ratio based
 * <ResponsiveImage source={{ uri: 'url' }} width="100%" aspectRatio={16/9} />
 * 
 * // Avatar style
 * <ResponsiveImage source={{ uri: 'url' }} avatar size="lg" />
 * ```
 */

import React from 'react';
import { Image, ImageProps, ImageStyle, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { useResponsive, ResponsiveValues } from '../../hooks/useResponsive';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  xxl: 96,
};

interface ResponsiveImageProps extends Omit<ImageProps, 'style' | 'width' | 'height' | 'borderRadius'> {
  /** Width - number (scaled), string (%), or responsive object */
  width?: number | string | ResponsiveValues<number>;
  /** Height - number (scaled), string (%), or responsive object */
  height?: number | string | ResponsiveValues<number>;
  /** Aspect ratio (width/height) */
  aspectRatio?: number;
  /** Border radius */
  borderRadius?: number | ResponsiveValues<number>;
  /** Avatar mode - circular with predefined sizes */
  avatar?: boolean;
  /** Avatar size preset */
  size?: AvatarSize;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Image style */
  style?: ImageStyle;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  width,
  height,
  aspectRatio,
  borderRadius,
  avatar,
  size = 'md',
  containerStyle,
  style,
  ...imageProps
}) => {
  const { spacing, borderRadius: br, responsive } = useResponsive();

  // Resolve dimension value
  const resolveDimension = (value: number | string | ResponsiveValues<number> | undefined): DimensionValue | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value as DimensionValue;
    if (typeof value === 'object' && 'default' in value) {
      return spacing(responsive(value));
    }
    return spacing(value as number);
  };

  // Avatar mode
  if (avatar) {
    const avatarSize = spacing(AVATAR_SIZES[size]);
    
    return (
      <View style={[{ overflow: 'hidden' }, containerStyle]}>
        <Image
          {...imageProps}
          style={[
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
            style,
          ]}
        />
      </View>
    );
  }

  // Standard mode
  const resolvedWidth = resolveDimension(width);
  const resolvedHeight = resolveDimension(height);
  const resolvedBorderRadius = borderRadius !== undefined
    ? typeof borderRadius === 'object'
      ? br(responsive(borderRadius))
      : br(borderRadius)
    : undefined;

  const imageStyle: ImageStyle = {
    ...(resolvedWidth !== undefined && { width: resolvedWidth }),
    ...(resolvedHeight !== undefined && { height: resolvedHeight }),
    ...(aspectRatio !== undefined && { aspectRatio }),
    ...(resolvedBorderRadius !== undefined && { borderRadius: resolvedBorderRadius }),
  };

  return (
    <View style={containerStyle}>
      <Image
        {...imageProps}
        style={[imageStyle, style]}
      />
    </View>
  );
};

// Avatar convenience component
export const Avatar: React.FC<Omit<ResponsiveImageProps, 'avatar'> & { size?: AvatarSize }> = (props) => (
  <ResponsiveImage avatar {...props} />
);

export default ResponsiveImage;
