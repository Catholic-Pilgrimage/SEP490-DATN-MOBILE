/**
 * ResponsiveIcon Component
 * 
 * Icon wrapper that automatically scales based on screen size.
 * Supports multiple icon libraries.
 * 
 * @example
 * ```tsx
 * <ResponsiveIcon name="home" size={24} color="#000" />
 * <ResponsiveIcon name="settings" library="ionicons" size="lg" />
 * ```
 */

import React from 'react';
import { MaterialIcons, Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';

type IconLibrary = 'material' | 'ionicons' | 'feather' | 'fontawesome';
type SizePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZE_PRESETS: Record<SizePreset, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
};

interface ResponsiveIconProps {
  name: string;
  size?: number | SizePreset;
  color?: string;
  library?: IconLibrary;
  style?: any;
}

export const ResponsiveIcon: React.FC<ResponsiveIconProps> = ({
  name,
  size = 'md',
  color = '#000000',
  library = 'material',
  style,
}) => {
  const { iconSize } = useResponsive();

  // Resolve size
  const resolvedSize = typeof size === 'string' 
    ? iconSize(SIZE_PRESETS[size]) 
    : iconSize(size);

  // Render based on library
  switch (library) {
    case 'ionicons':
      return (
        <Ionicons 
          name={name as any} 
          size={resolvedSize} 
          color={color} 
          style={style}
        />
      );
    case 'feather':
      return (
        <Feather 
          name={name as any} 
          size={resolvedSize} 
          color={color} 
          style={style}
        />
      );
    case 'fontawesome':
      return (
        <FontAwesome5 
          name={name as any} 
          size={resolvedSize} 
          color={color} 
          style={style}
        />
      );
    case 'material':
    default:
      return (
        <MaterialIcons 
          name={name as any} 
          size={resolvedSize} 
          color={color} 
          style={style}
        />
      );
  }
};

// Convenience exports for specific libraries
export const MaterialIcon: React.FC<Omit<ResponsiveIconProps, 'library'>> = (props) => (
  <ResponsiveIcon library="material" {...props} />
);

export const IonIcon: React.FC<Omit<ResponsiveIconProps, 'library'>> = (props) => (
  <ResponsiveIcon library="ionicons" {...props} />
);

export const FeatherIcon: React.FC<Omit<ResponsiveIconProps, 'library'>> = (props) => (
  <ResponsiveIcon library="feather" {...props} />
);

export default ResponsiveIcon;
