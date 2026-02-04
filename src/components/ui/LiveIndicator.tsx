/**
 * LiveIndicator Component
 * Animated pulsing dot for real-time data indicators
 * Creates a "heartbeat" effect to show live status
 * 
 * Usage:
 * <LiveIndicator size="medium" label="LIVE" />
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Text,
  ViewStyle,
} from 'react-native';
import { SACRED_COLORS, SACRED_SPACING } from '../../constants/sacred-theme.constants';
import { usePulse } from '../../hooks/useAnimations';

type IndicatorSize = 'small' | 'medium' | 'large';
type IndicatorVariant = 'live' | 'success' | 'warning' | 'danger';

interface LiveIndicatorProps {
  size?: IndicatorSize;
  variant?: IndicatorVariant;
  label?: string;
  showLabel?: boolean;
  showRipple?: boolean;
  style?: ViewStyle;
}

const getSizeConfig = (size: IndicatorSize) => {
  switch (size) {
    case 'small':
      return { dotSize: 6, fontSize: 8, gap: 4 };
    case 'medium':
      return { dotSize: 8, fontSize: 10, gap: 6 };
    case 'large':
      return { dotSize: 10, fontSize: 12, gap: 8 };
    default:
      return { dotSize: 8, fontSize: 10, gap: 6 };
  }
};

const getVariantColors = (variant: IndicatorVariant) => {
  switch (variant) {
    case 'live':
      return {
        dot: SACRED_COLORS.live,
        glow: SACRED_COLORS.liveGlow,
        text: SACRED_COLORS.live,
      };
    case 'success':
      return {
        dot: SACRED_COLORS.success,
        glow: SACRED_COLORS.successLight,
        text: SACRED_COLORS.success,
      };
    case 'warning':
      return {
        dot: SACRED_COLORS.warning,
        glow: SACRED_COLORS.warningLight,
        text: SACRED_COLORS.warning,
      };
    case 'danger':
      return {
        dot: SACRED_COLORS.danger,
        glow: SACRED_COLORS.dangerLight,
        text: SACRED_COLORS.danger,
      };
    default:
      return {
        dot: SACRED_COLORS.live,
        glow: SACRED_COLORS.liveGlow,
        text: SACRED_COLORS.live,
      };
  }
};

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  size = 'medium',
  variant = 'live',
  label = 'LIVE',
  showLabel = true,
  showRipple = true,
  style,
}) => {
  const sizeConfig = getSizeConfig(size);
  const colors = getVariantColors(variant);
  
  const { pulseValue, opacityValue } = usePulse({
    minScale: 1,
    maxScale: 1.8,
    duration: 1000,
  });

  return (
    <View style={[styles.container, style]}>
      {/* Ripple/Glow effect */}
      <View
        style={[
          styles.dotContainer,
          {
            width: sizeConfig.dotSize * 2.5,
            height: sizeConfig.dotSize * 2.5,
          },
        ]}
      >
        {showRipple && (
          <Animated.View
            style={[
              styles.ripple,
              {
                width: sizeConfig.dotSize * 2,
                height: sizeConfig.dotSize * 2,
                borderRadius: sizeConfig.dotSize,
                backgroundColor: colors.glow,
                transform: [{ scale: pulseValue }],
                opacity: opacityValue,
              },
            ]}
          />
        )}
        
        {/* Main Dot */}
        <View
          style={[
            styles.dot,
            {
              width: sizeConfig.dotSize,
              height: sizeConfig.dotSize,
              borderRadius: sizeConfig.dotSize / 2,
              backgroundColor: colors.dot,
            },
          ]}
        />
      </View>
      
      {/* Label */}
      {showLabel && label && (
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConfig.fontSize,
              color: colors.text,
              marginLeft: sizeConfig.gap,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default LiveIndicator;
