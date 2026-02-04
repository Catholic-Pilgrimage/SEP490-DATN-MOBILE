/**
 * GlassCard Component
 * Premium Glassmorphism card with blur effect
 * 
 * Usage:
 * <GlassCard variant="light" intensity="medium">
 *   <YourContent />
 * </GlassCard>
 */
import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SACRED_COLORS, SACRED_RADIUS, SACRED_SHADOWS } from '../../constants/sacred-theme.constants';

type GlassVariant = 'light' | 'dark' | 'cream' | 'gold';
type GlassIntensity = 'light' | 'medium' | 'strong';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  intensity?: GlassIntensity;
  borderRadius?: number;
  padding?: number;
  style?: ViewStyle;
  withBorder?: boolean;
  withGradient?: boolean;
}

const getBlurIntensity = (intensity: GlassIntensity): number => {
  switch (intensity) {
    case 'light': return 20;
    case 'medium': return 40;
    case 'strong': return 60;
    default: return 40;
  }
};

const getVariantColors = (variant: GlassVariant) => {
  switch (variant) {
    case 'light':
      return {
        background: 'rgba(255, 255, 255, 0.85)',
        border: 'rgba(255, 255, 255, 0.5)',
        gradient: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
        tint: 'light' as const,
      };
    case 'dark':
      return {
        background: 'rgba(26, 26, 26, 0.7)',
        border: 'rgba(255, 255, 255, 0.1)',
        gradient: ['rgba(26, 26, 26, 0.8)', 'rgba(26, 26, 26, 0.6)'],
        tint: 'dark' as const,
      };
    case 'cream':
      return {
        background: SACRED_COLORS.glassCream,
        border: 'rgba(201, 165, 114, 0.2)',
        gradient: ['rgba(253, 248, 240, 0.95)', 'rgba(253, 248, 240, 0.85)'],
        tint: 'light' as const,
      };
    case 'gold':
      return {
        background: 'rgba(201, 165, 114, 0.15)',
        border: 'rgba(201, 165, 114, 0.3)',
        gradient: ['rgba(201, 165, 114, 0.2)', 'rgba(201, 165, 114, 0.1)'],
        tint: 'light' as const,
      };
    default:
      return {
        background: SACRED_COLORS.glassWhite,
        border: 'rgba(255, 255, 255, 0.5)',
        gradient: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
        tint: 'light' as const,
      };
  }
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'light',
  intensity = 'medium',
  borderRadius = SACRED_RADIUS.lg,
  padding = 16,
  style,
  withBorder = true,
  withGradient = true,
}) => {
  const colors = getVariantColors(variant);

  // Glassmorphism effect without expo-blur (cross-platform compatible)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderRadius,
          borderWidth: withBorder ? 1 : 0,
          borderColor: colors.border,
        },
        SACRED_SHADOWS.soft,
        style,
      ]}
    >
      {withGradient && (
        <LinearGradient
          colors={colors.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />
      )}
      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default GlassCard;
