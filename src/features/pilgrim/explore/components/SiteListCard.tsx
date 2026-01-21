import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { getSpacing, moderateScale, responsive } from '../../../../utils/responsive';

interface SiteListCardProps {
  id: string;
  name: string;
  location?: string;
  distance: string;
  image: { uri: string };
  isFavorite: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
}

export const SiteListCard: React.FC<SiteListCardProps> = ({
  name,
  location,
  distance,
  image,
  isFavorite,
  onPress,
  onFavoritePress,
}) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.96}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={image} 
          style={styles.image} 
          resizeMode="cover"
        />
        <View style={styles.imageBadge}>
          <Text style={styles.imageBadgeIcon}>⛪</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {location && (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.location} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.rightSection}>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(BORDER_RADIUS.lg),
    marginBottom: getSpacing(SPACING.md) + 4,
    ...SHADOWS.medium,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 3,
  },
  imageContainer: {
    width: responsive({
      small: 85,
      medium: moderateScale(95),
      tablet: moderateScale(115),
      default: moderateScale(95),
    }),
    height: responsive({
      small: 85,
      medium: moderateScale(95),
      tablet: moderateScale(115),
      default: moderateScale(95),
    }),
    position: 'relative',
    backgroundColor: COLORS.backgroundDark,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: getSpacing(SPACING.xs),
    left: getSpacing(SPACING.xs),
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  imageBadgeIcon: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: getSpacing(SPACING.md) + 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: getSpacing(SPACING.sm),
  },
  name: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.lg,
      medium: TYPOGRAPHY.fontSize.xl,
      tablet: TYPOGRAPHY.fontSize.xxl,
      default: TYPOGRAPHY.fontSize.xl,
    }),
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: getSpacing(SPACING.xs),
    letterSpacing: -0.3,
    lineHeight: responsive({
      small: TYPOGRAPHY.fontSize.lg * 1.3,
      medium: TYPOGRAPHY.fontSize.xl * 1.3,
      default: TYPOGRAPHY.fontSize.xl * 1.3,
    }),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationIcon: {
    fontSize: 12,
    opacity: 0.8,
  },
  location: {
    flex: 1,
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.sm,
      medium: TYPOGRAPHY.fontSize.md,
      tablet: TYPOGRAPHY.fontSize.lg,
      default: TYPOGRAPHY.fontSize.md,
    }),
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  distanceBadge: {
    backgroundColor: COLORS.accentChampagne,
    paddingHorizontal: getSpacing(SPACING.md),
    paddingVertical: getSpacing(SPACING.xs) + 2,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.subtle,
  },
  distanceText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
