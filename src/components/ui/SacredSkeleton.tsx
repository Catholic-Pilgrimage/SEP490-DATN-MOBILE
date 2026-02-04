/**
 * SacredSkeleton Component
 * Premium skeleton loading with breathing animation
 * Cathedral-inspired design with soft rounded shapes
 * 
 * Usage:
 * <SacredSkeleton variant="card" />
 * <SacredSkeleton variant="list" count={3} />
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SACRED_COLORS, SACRED_RADIUS, SACRED_SPACING } from '../../constants/sacred-theme.constants';
import { useBreathing, useShimmer } from '../../hooks/useAnimations';

type SkeletonVariant = 'card' | 'list' | 'stats' | 'image' | 'text' | 'avatar' | 'button';

interface SacredSkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number;
  count?: number;
  showIcon?: boolean;
  style?: ViewStyle;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Base skeleton block with breathing animation
const SkeletonBlock: React.FC<{
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({
  width = 100,
  height = 16,
  borderRadius = SACRED_RADIUS.sm,
  style,
}) => {
  const breathOpacity = useBreathing({ minOpacity: 0.3, maxOpacity: 0.6 });
  const { shimmerValue } = useShimmer({
    width: typeof width === 'number' ? width : SCREEN_WIDTH,
    duration: 1500,
    delay: 2000,
  });

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: typeof width === 'number' ? width : `${width}` as `${number}%`,
          height,
          borderRadius,
          opacity: breathOpacity,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[SACRED_COLORS.creamDark, SACRED_COLORS.alabaster]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Shimmer overlay */}
      <Animated.View
        style={[
          styles.shimmerOverlay,
          { transform: [{ translateX: shimmerValue }] },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.5)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </Animated.View>
  );
};

// Sacred icon pulsing in center
const SacredIcon: React.FC = () => {
  const breathOpacity = useBreathing({ minOpacity: 0.15, maxOpacity: 0.35 });
  
  return (
    <Animated.View style={[styles.sacredIcon, { opacity: breathOpacity }]}>
      <Ionicons
        name="leaf-outline"
        size={40}
        color={SACRED_COLORS.gold}
      />
    </Animated.View>
  );
};

// Card skeleton variant
const CardSkeleton: React.FC<{ showIcon?: boolean }> = ({ showIcon = true }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Image placeholder */}
      <View style={styles.cardImage}>
        <SkeletonBlock height={120} borderRadius={SACRED_RADIUS.lg} />
        {showIcon && <SacredIcon />}
      </View>
      {/* Content */}
      <View style={styles.cardContent}>
        <SkeletonBlock width={SCREEN_WIDTH * 0.6} height={18} style={styles.mb8} />
        <SkeletonBlock width={SCREEN_WIDTH * 0.8} height={12} style={styles.mb4} />
        <SkeletonBlock width={SCREEN_WIDTH * 0.4} height={12} />
      </View>
    </View>
  );
};

// List item skeleton variant
const ListSkeleton: React.FC<{ count: number }> = ({ count }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          {/* Avatar */}
          <SkeletonBlock
            width={48}
            height={48}
            borderRadius={SACRED_RADIUS.pill}
          />
          {/* Content */}
          <View style={styles.listContent}>
            <SkeletonBlock width={120} height={14} style={styles.mb6} />
            <SkeletonBlock width={80} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Stats card skeleton
const StatsSkeleton: React.FC = () => {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <SkeletonBlock width={60} height={12} style={styles.mb8} />
        <SkeletonBlock width={80} height={32} style={styles.mb4} />
        <SkeletonBlock width={70} height={10} />
      </View>
      <View style={styles.statCard}>
        <SkeletonBlock width={60} height={12} style={styles.mb8} />
        <SkeletonBlock width={80} height={32} style={styles.mb4} />
        <SkeletonBlock width={70} height={10} />
      </View>
    </View>
  );
};

// Image skeleton
const ImageSkeleton: React.FC<{ width?: number; height?: number }> = ({
  width,
  height = 200,
}) => {
  return (
    <View style={styles.imageContainer}>
      <SkeletonBlock
        width={width || SCREEN_WIDTH - 32}
        height={height}
        borderRadius={SACRED_RADIUS.lg}
      />
      <SacredIcon />
    </View>
  );
};

// Text block skeleton
const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  const widths = [SCREEN_WIDTH * 0.9, SCREEN_WIDTH * 0.85, SCREEN_WIDTH * 0.7, SCREEN_WIDTH * 0.8, SCREEN_WIDTH * 0.6];
  
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          width={widths[index % widths.length]}
          height={14}
          style={styles.mb8}
        />
      ))}
    </View>
  );
};

// Avatar skeleton
const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 60 }) => {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      borderRadius={SACRED_RADIUS.pill}
    />
  );
};

// Button skeleton
const ButtonSkeleton: React.FC<{ width?: number }> = ({
  width = 120,
}) => {
  return (
    <SkeletonBlock
      width={width}
      height={44}
      borderRadius={SACRED_RADIUS.md}
    />
  );
};

export const SacredSkeleton: React.FC<SacredSkeletonProps> = ({
  variant = 'card',
  width,
  height,
  count = 1,
  showIcon = true,
  style,
}) => {
  const numericWidth = typeof width === 'number' ? width : undefined;
  
  const renderVariant = () => {
    switch (variant) {
      case 'card':
        return <CardSkeleton showIcon={showIcon} />;
      case 'list':
        return <ListSkeleton count={count} />;
      case 'stats':
        return <StatsSkeleton />;
      case 'image':
        return <ImageSkeleton width={numericWidth} height={height} />;
      case 'text':
        return <TextSkeleton lines={count} />;
      case 'avatar':
        return <AvatarSkeleton size={numericWidth} />;
      case 'button':
        return <ButtonSkeleton width={numericWidth} />;
      default:
        return <CardSkeleton showIcon={showIcon} />;
    }
  };

  return <View style={style}>{renderVariant()}</View>;
};

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    backgroundColor: SACRED_COLORS.alabaster,
  },
  shimmerOverlay: {
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
  sacredIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Card
  cardContainer: {
    backgroundColor: SACRED_COLORS.cream,
    borderRadius: SACRED_RADIUS.lg,
    padding: SACRED_SPACING.base,
    ...SACRED_SPACING,
  },
  cardImage: {
    position: 'relative',
    marginBottom: SACRED_SPACING.md,
  },
  cardContent: {
    gap: SACRED_SPACING.xs,
  },
  // List
  listContainer: {
    gap: SACRED_SPACING.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SACRED_SPACING.sm,
  },
  listContent: {
    flex: 1,
    marginLeft: SACRED_SPACING.md,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: SACRED_SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: SACRED_COLORS.cream,
    borderRadius: SACRED_RADIUS.lg,
    padding: SACRED_SPACING.base,
  },
  // Image
  imageContainer: {
    position: 'relative',
  },
  // Text
  textContainer: {
    gap: SACRED_SPACING.xs,
  },
  // Utility
  mb4: {
    marginBottom: 4,
  },
  mb6: {
    marginBottom: 6,
  },
  mb8: {
    marginBottom: 8,
  },
});

export default SacredSkeleton;
