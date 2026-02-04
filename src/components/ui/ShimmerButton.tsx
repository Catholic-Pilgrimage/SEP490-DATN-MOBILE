/**
 * ShimmerButton Component
 * Premium button with gold shimmer effect
 * Creates a luxurious, sacred feel
 * 
 * Usage:
 * <ShimmerButton onPress={handlePress} variant="gold">
 *   Create Event
 * </ShimmerButton>
 */
import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SACRED_COLORS, SACRED_RADIUS, SACRED_SHADOWS, SACRED_SPACING } from '../../constants/sacred-theme.constants';
import { useShimmer, usePressAnimation } from '../../hooks/useAnimations';

type ButtonVariant = 'gold' | 'dark' | 'outline' | 'cream';
type ButtonSize = 'small' | 'medium' | 'large';

interface ShimmerButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  shimmerEnabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const getVariantColors = (variant: ButtonVariant, disabled: boolean) => {
  if (disabled) {
    return {
      gradient: [SACRED_COLORS.alabaster, SACRED_COLORS.alabaster] as [string, string],
      textColor: SACRED_COLORS.graphite,
      shimmerColor: 'transparent',
    };
  }

  switch (variant) {
    case 'gold':
      return {
        gradient: [SACRED_COLORS.gold, SACRED_COLORS.goldDark] as [string, string],
        textColor: SACRED_COLORS.charcoal,
        shimmerColor: 'rgba(255, 255, 255, 0.4)',
      };
    case 'dark':
      return {
        gradient: [SACRED_COLORS.charcoal, '#2D2D2D'] as [string, string],
        textColor: SACRED_COLORS.cream,
        shimmerColor: 'rgba(201, 165, 114, 0.3)',
      };
    case 'outline':
      return {
        gradient: ['transparent', 'transparent'] as [string, string],
        textColor: SACRED_COLORS.gold,
        shimmerColor: 'transparent',
      };
    case 'cream':
      return {
        gradient: [SACRED_COLORS.cream, SACRED_COLORS.creamDark] as [string, string],
        textColor: SACRED_COLORS.charcoal,
        shimmerColor: 'rgba(201, 165, 114, 0.2)',
      };
    default:
      return {
        gradient: [SACRED_COLORS.gold, SACRED_COLORS.goldDark] as [string, string],
        textColor: SACRED_COLORS.charcoal,
        shimmerColor: 'rgba(255, 255, 255, 0.4)',
      };
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'small':
      return {
        paddingVertical: SACRED_SPACING.sm,
        paddingHorizontal: SACRED_SPACING.base,
        fontSize: 12,
        iconSize: 16,
      };
    case 'medium':
      return {
        paddingVertical: SACRED_SPACING.md,
        paddingHorizontal: SACRED_SPACING.lg,
        fontSize: 14,
        iconSize: 18,
      };
    case 'large':
      return {
        paddingVertical: SACRED_SPACING.base,
        paddingHorizontal: SACRED_SPACING.xl,
        fontSize: 16,
        iconSize: 20,
      };
    default:
      return {
        paddingVertical: SACRED_SPACING.md,
        paddingHorizontal: SACRED_SPACING.lg,
        fontSize: 14,
        iconSize: 18,
      };
  }
};

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  onPress,
  variant = 'gold',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  shimmerEnabled = true,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const colors = getVariantColors(variant, disabled);
  const sizeStyles = getSizeStyles(size);
  
  const { shimmerValue } = useShimmer({
    width: 150,
    duration: 1200,
    delay: 5000,
    autoStart: shimmerEnabled && !disabled && variant !== 'outline',
  });
  
  const { scaleValue, handlePressIn, handlePressOut } = usePressAnimation({
    scale: 0.97,
  });

  const isOutline = variant === 'outline';

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.touchable,
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
            },
            isOutline && {
              borderWidth: 1.5,
              borderColor: SACRED_COLORS.gold,
            },
            !disabled && !isOutline && SACRED_SHADOWS.soft,
          ]}
        >
          {/* Shimmer Effect */}
          {shimmerEnabled && !disabled && !isOutline && (
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerValue }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  colors.shimmerColor,
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={colors.textColor}
                style={styles.iconLeft}
              />
            )}
            
            {typeof children === 'string' ? (
              <Text
                style={[
                  styles.text,
                  {
                    fontSize: sizeStyles.fontSize,
                    color: colors.textColor,
                  },
                  textStyle,
                ]}
              >
                {children}
              </Text>
            ) : (
              children
            )}
            
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={colors.textColor}
                style={styles.iconRight}
              />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    borderRadius: SACRED_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    transform: [{ skewX: '-20deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  iconLeft: {
    marginRight: SACRED_SPACING.sm,
  },
  iconRight: {
    marginLeft: SACRED_SPACING.sm,
  },
});

export default ShimmerButton;
